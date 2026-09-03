<?php

namespace App\Services;

use App\Enums\ParticipationPaymentStatus;
use App\Enums\ParticipationStatus;
use App\Enums\PaymentStatus;
use App\Models\Event;
use App\Models\Participation;
use App\Models\Payment;
use App\Models\TicketType;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

/**
 * Join / cancel for event participations.
 *
 * Transaction boundary (critical):
 * - Ticket claim via TicketType::claimQuantityAtomically() and participation INSERT
 *   happen in the SAME DB::transaction. If the insert fails, the claim UPDATE rolls back.
 * - Never claim outside the transaction or reimplement quantity checks ad hoc.
 *
 * Capacity:
 * - Confirmed seats (free joined, paid, checked-in) occupy displayed capacity.
 * - Pending unpaid checkouts hold a seat so the event cannot be oversold, but
 *   failed/cancelled payments do not occupy.
 * - There is no waitlist: a full event rejects join.
 */
class ParticipationService
{
    /**
     * Create a participation. Capacity full or ticket exhausted → exception (no waitlist).
     *
     * @param  array<string, mixed>|null  $customFieldAnswers
     */
    public function join(
        Event $event,
        User $user,
        ?int $ticketTypeId = null,
        ?array $customFieldAnswers = null,
        ?string $discountCode = null
    ): Participation {
        $customFieldAnswers = null;

        return DB::transaction(function () use ($event, $user, $ticketTypeId, $customFieldAnswers, $discountCode) {
            /** @var Event $event */
            $event = Event::query()->whereKey($event->id)->lockForUpdate()->firstOrFail();

            if (EventRegistrationGate::isRegistrationDeadlinePassed($event)) {
                throw new InvalidArgumentException('Registration deadline has passed.');
            }

            $existing = Participation::query()
                ->where('user_id', $user->id)
                ->where('event_id', $event->id)
                ->where('status', '!=', ParticipationStatus::CANCELLED)
                ->lockForUpdate()
                ->first();

            if ($existing) {
                throw new InvalidArgumentException('User already has an active participation for this event.');
            }

            $held = $this->countHeldSeats($event->id);
            if ($event->capacity !== null && $held >= $event->capacity) {
                throw new InvalidArgumentException('Event capacity reached.');
            }

            $discountAttrs = $this->resolveDiscountAttributes($event, $ticketTypeId, $discountCode);

            $paymentStatus = ParticipationPaymentStatus::NOT_REQUIRED;

            if ($ticketTypeId !== null) {
                $ticketType = TicketType::query()
                    ->whereKey($ticketTypeId)
                    ->where('event_id', $event->id)
                    ->lockForUpdate()
                    ->first();

                if (! $ticketType || $ticketType->trashed()) {
                    throw new InvalidArgumentException('Invalid ticket type for this event.');
                }

                if (! $ticketType->sales_enabled) {
                    throw new InvalidArgumentException('Ticket type sales are disabled.');
                }

                if (! TicketType::claimQuantityAtomically($ticketType->id, 1)) {
                    throw new RuntimeException('Ticket type quantity exhausted.');
                }

                $final = $discountAttrs['final_amount'] ?? $ticketType->price;
                if ($ticketType->isPaid() && (float) $final > 0) {
                    $paymentStatus = ParticipationPaymentStatus::PENDING;
                } elseif ($ticketType->isPaid() && (float) $final <= 0) {
                    $paymentStatus = ParticipationPaymentStatus::PAID;
                } else {
                    $paymentStatus = ParticipationPaymentStatus::NOT_REQUIRED;
                }
            }

            $participation = Participation::create(array_merge([
                'user_id' => $user->id,
                'event_id' => $event->id,
                'ticket_type_id' => $ticketTypeId,
                'status' => ParticipationStatus::JOINED,
                'payment_status' => $paymentStatus,
                'custom_field_answers' => $customFieldAnswers,
            ], $discountAttrs));

            $this->syncEventRegistrationCount($event);
            app(EventStatusMachine::class)->syncSoldOutFromCapacity($event->fresh());
            app(QrTokenService::class)->ensureForConfirmed($participation);

            if ($paymentStatus === ParticipationPaymentStatus::PAID && ($discountAttrs['discount_code_id'] ?? null)) {
                app(DiscountPricingService::class)->consumeUsageIfNeeded($participation);
            }

            return $participation->fresh(['user', 'ticketType']);
        });
    }

    /**
     * @return array<string, mixed>
     */
    private function resolveDiscountAttributes(Event $event, ?int $ticketTypeId, ?string $discountCode): array
    {
        if ($discountCode === null || trim($discountCode) === '') {
            return [];
        }

        if ($ticketTypeId === null) {
            throw new InvalidArgumentException('ticket_type_id is required to apply a discount code.');
        }

        $pricing = app(DiscountPricingService::class);
        $code = $pricing->findScoped($event, $discountCode);
        if (! $code) {
            throw new InvalidArgumentException(DiscountPricingService::ERROR_NOT_FOUND);
        }
        $pricing->assertUsable($code);

        $ticket = TicketType::query()
            ->whereKey($ticketTypeId)
            ->where('event_id', $event->id)
            ->first();
        if (! $ticket) {
            throw new InvalidArgumentException('Invalid ticket type for this event.');
        }

        $quote = $pricing->quote($ticket, $code);

        return [
            'discount_code_id' => $quote['discount_code_id'],
            'original_amount' => $quote['original_amount'],
            'discount_amount' => $quote['discount_amount'],
            'final_amount' => $quote['final_amount'],
            'discount_code_snapshot' => $pricing->snapshotPayload($quote),
            'discount_usage_consumed' => false,
        ];
    }

    /**
     * Cancel participation; release ticket quantity if a ticket was claimed.
     */
    public function cancel(Participation $participation): Participation
    {
        return DB::transaction(function () use ($participation) {
            $participation = Participation::query()->whereKey($participation->id)->lockForUpdate()->firstOrFail();

            if ($participation->status === ParticipationStatus::CANCELLED) {
                return $participation;
            }

            $heldTicket = $participation->holdsTicketQuantity();
            $ticketTypeId = $participation->ticket_type_id;

            $participation->status = ParticipationStatus::CANCELLED;
            $participation->save();

            if ($heldTicket && $ticketTypeId) {
                TicketType::releaseQuantityAtomically($ticketTypeId, 1);
            }

            $event = Event::find($participation->event_id);
            if ($event) {
                $this->syncEventRegistrationCount($event);
            }

            return $participation->fresh(['user', 'ticketType']);
        });
    }

    /**
     * Cancel unpaid pending checkouts that never completed payment (no live Waafi row).
     * Same timeout as Waafi pending payments. Releases ticket quantity and the held seat.
     */
    public function expireAbandonedUnpaidCheckouts(int $limit = 100): int
    {
        $minutes = (int) config('waafipay.pending_timeout_minutes', 15);
        $cutoff = now()->subMinutes(max(1, $minutes));

        $rows = Participation::query()
            ->where('status', ParticipationStatus::JOINED)
            ->where('payment_status', ParticipationPaymentStatus::PENDING)
            ->where('created_at', '<=', $cutoff)
            ->orderBy('id')
            ->limit($limit)
            ->get();

        $expired = 0;

        foreach ($rows as $participation) {
            $livePending = Payment::query()
                ->where('participation_id', $participation->id)
                ->where('status', PaymentStatus::PENDING)
                ->where(function ($q) {
                    $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
                })
                ->exists();

            if ($livePending) {
                continue;
            }

            $cancelled = $this->cancel($participation);
            $cancelled->payment_status = ParticipationPaymentStatus::FAILED;
            $cancelled->save();
            $expired++;
        }

        return $expired;
    }

    /** Confirmed attendees that occupy displayed event capacity. */
    public function countSeatOccupying(int $eventId): int
    {
        return Participation::query()
            ->where('event_id', $eventId)
            ->confirmedSeat()
            ->count();
    }

    /**
     * Confirmed seats plus unpaid pending checkouts (prevents oversell).
     * Failed and cancelled do not count.
     */
    public function countHeldSeats(int $eventId): int
    {
        return Participation::query()
            ->where('event_id', $eventId)
            ->heldSeat()
            ->count();
    }

    public function syncEventRegistrationCount(Event $event): void
    {
        $count = $this->countSeatOccupying($event->id);
        if ((int) $event->registrations_count !== $count) {
            $event->registrations_count = $count;
            $event->save();
        }
    }

    /**
     * @return array{registered_count: int, waitlisted_count: int, seats_remaining: int|null, capacity: int|null}
     */
    public function capacitySnapshot(Event $event): array
    {
        $registered = $this->countSeatOccupying($event->id);
        $held = $this->countHeldSeats($event->id);
        $capacity = $event->capacity;

        return [
            'registered_count' => $registered,
            'waitlisted_count' => 0,
            'capacity' => $capacity,
            'seats_remaining' => $capacity === null ? null : max(0, $capacity - $held),
        ];
    }
}
