<?php

namespace App\Services;

use App\Enums\ParticipationPaymentStatus;
use App\Enums\ParticipationStatus;
use App\Models\Event;
use App\Models\Participation;
use App\Models\TicketType;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

/**
 * Join / waitlist / promote / cancel for event participations.
 *
 * Transaction boundary (critical):
 * - Ticket claim via TicketType::claimQuantityAtomically() and participation INSERT
 *   happen in the SAME DB::transaction. If the insert fails, the claim UPDATE rolls back.
 * - Never claim outside the transaction or reimplement quantity checks ad hoc.
 */
class ParticipationService
{
    /**
     * Create a participation (admin or future Web App join).
     * Capacity full → waitlisted (no ticket claim). Otherwise joined (+ atomic ticket claim).
     *
     * @param  array<string, mixed>|null  $customFieldAnswers
     */
    public function join(
        Event $event,
        User $user,
        ?int $ticketTypeId = null,
        ?array $customFieldAnswers = null,
        bool $allowWaitlist = true
    ): Participation {
        // Validate against current active schema at submission time only
        // (schema changes never retroactively invalidate stored answers).
        app(FormFieldValidationService::class)->validateOrFail($event, $customFieldAnswers);

        return DB::transaction(function () use ($event, $user, $ticketTypeId, $customFieldAnswers, $allowWaitlist) {
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

            $registered = $this->countSeatOccupying($event->id);
            $capacityReached = $event->capacity !== null && $registered >= $event->capacity;

            // Event capacity full → waitlist (no ticket quantity claim yet)
            if ($capacityReached) {
                if (! $allowWaitlist) {
                    throw new InvalidArgumentException('Event capacity reached.');
                }

                $participation = Participation::create([
                    'user_id' => $user->id,
                    'event_id' => $event->id,
                    'ticket_type_id' => $ticketTypeId,
                    'status' => ParticipationStatus::WAITLISTED,
                    'payment_status' => ParticipationPaymentStatus::NOT_REQUIRED,
                    'custom_field_answers' => $customFieldAnswers,
                ]);

                $this->syncEventRegistrationCount($event);

                return $participation->fresh(['user', 'ticketType']);
            }

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

                // Atomic claim — same transaction as insert below
                if (! TicketType::claimQuantityAtomically($ticketType->id, 1)) {
                    if ($allowWaitlist) {
                        $participation = Participation::create([
                            'user_id' => $user->id,
                            'event_id' => $event->id,
                            'ticket_type_id' => $ticketTypeId,
                            'status' => ParticipationStatus::WAITLISTED,
                            'payment_status' => ParticipationPaymentStatus::NOT_REQUIRED,
                            'custom_field_answers' => $customFieldAnswers,
                        ]);
                        $this->syncEventRegistrationCount($event);

                        return $participation->fresh(['user', 'ticketType']);
                    }

                    throw new RuntimeException('Ticket type quantity exhausted.');
                }

                $paymentStatus = $ticketType->isPaid()
                    ? ParticipationPaymentStatus::PENDING
                    : ParticipationPaymentStatus::NOT_REQUIRED;
            }

            $participation = Participation::create([
                'user_id' => $user->id,
                'event_id' => $event->id,
                'ticket_type_id' => $ticketTypeId,
                'status' => ParticipationStatus::JOINED,
                'payment_status' => $paymentStatus,
                'custom_field_answers' => $customFieldAnswers,
            ]);

            $this->syncEventRegistrationCount($event);
            app(EventStatusMachine::class)->syncSoldOutFromCapacity($event->fresh());
            app(QrTokenService::class)->ensureForConfirmed($participation);

            return $participation->fresh(['user', 'ticketType']);
        });
    }

    /**
     * Promote waitlisted → joined when a seat opens (admin action / future auto-promote).
     */
    public function promoteFromWaitlist(Participation $participation): Participation
    {
        return DB::transaction(function () use ($participation) {
            /** @var Participation $participation */
            $participation = Participation::query()->whereKey($participation->id)->lockForUpdate()->firstOrFail();

            if ($participation->status !== ParticipationStatus::WAITLISTED) {
                throw new InvalidArgumentException('Only waitlisted participations can be promoted.');
            }

            $event = Event::query()->whereKey($participation->event_id)->lockForUpdate()->firstOrFail();

            if (EventRegistrationGate::isRegistrationDeadlinePassed($event)) {
                throw new InvalidArgumentException('Registration deadline has passed; cannot promote.');
            }

            $registered = $this->countSeatOccupying($event->id);
            if ($event->capacity !== null && $registered >= $event->capacity) {
                throw new InvalidArgumentException('No seats available to promote from waitlist.');
            }

            $paymentStatus = ParticipationPaymentStatus::NOT_REQUIRED;

            if ($participation->ticket_type_id) {
                $ticketType = TicketType::query()
                    ->whereKey($participation->ticket_type_id)
                    ->lockForUpdate()
                    ->first();

                if (! $ticketType || ! TicketType::claimQuantityAtomically($ticketType->id, 1)) {
                    throw new RuntimeException('Cannot promote: ticket type quantity unavailable.');
                }

                $paymentStatus = $ticketType->isPaid()
                    ? ParticipationPaymentStatus::PENDING
                    : ParticipationPaymentStatus::NOT_REQUIRED;
            }

            $participation->status = ParticipationStatus::JOINED;
            $participation->payment_status = $paymentStatus;
            $participation->save();

            $this->syncEventRegistrationCount($event);
            app(EventStatusMachine::class)->syncSoldOutFromCapacity($event->fresh());
            app(QrTokenService::class)->ensureForConfirmed($participation);

            return $participation->fresh(['user', 'ticketType']);
        });
    }

    /**
     * Cancel participation; release ticket quantity if a seat was held.
     */
    public function cancel(Participation $participation): Participation
    {
        return DB::transaction(function () use ($participation) {
            $participation = Participation::query()->whereKey($participation->id)->lockForUpdate()->firstOrFail();

            if ($participation->status === ParticipationStatus::CANCELLED) {
                return $participation;
            }

            $occupiedSeat = $participation->occupiesSeat();
            $ticketTypeId = $participation->ticket_type_id;

            $participation->status = ParticipationStatus::CANCELLED;
            $participation->save();

            if ($occupiedSeat && $ticketTypeId) {
                TicketType::releaseQuantityAtomically($ticketTypeId, 1);
            }

            $event = Event::find($participation->event_id);
            if ($event) {
                $this->syncEventRegistrationCount($event);
            }

            return $participation->fresh(['user', 'ticketType']);
        });
    }

    public function countSeatOccupying(int $eventId): int
    {
        return Participation::query()
            ->where('event_id', $eventId)
            ->whereIn('status', ParticipationStatus::seatOccupying())
            ->count();
    }

    public function countWaitlisted(int $eventId): int
    {
        return Participation::query()
            ->where('event_id', $eventId)
            ->where('status', ParticipationStatus::WAITLISTED)
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
        $capacity = $event->capacity;

        return [
            'registered_count' => $registered,
            'waitlisted_count' => $this->countWaitlisted($event->id),
            'capacity' => $capacity,
            'seats_remaining' => $capacity === null ? null : max(0, $capacity - $registered),
        ];
    }
}
