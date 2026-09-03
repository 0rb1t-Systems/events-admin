<?php

namespace App\Services;

use App\Enums\ParticipationPaymentStatus;
use App\Enums\ParticipationStatus;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\Participation;
use App\Models\TicketType;
use App\Support\SomaliPhoneNormalizer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

/**
 * Creates payments, calls WaafiPay, syncs participation mirror (SoT = payments table).
 *
 * Never marks paid optimistically. Idempotent: before retrying Waafi, check existing
 * payment by reference_id.
 *
 * Refund-after-payout decision (SAFE DEFAULT):
 * Block refunds when outstanding balance after refund would go negative
 * (i.e. collected - refund < reserved/paid-out). Requires clawback/admin path — not automated.
 */
class PaymentService
{
    public function __construct(
        private WaafiPayService $waafi,
        private EventFinanceService $finance,
    ) {}

    /**
     * Initiate purchase for a participation with pending payment.
     * Creates pending Payment row first, then calls WaafiPay.
     */
    public function charge(Participation $participation, string $payerPhone): Payment
    {
        $phone = SomaliPhoneNormalizer::normalize($payerPhone);

        if ($participation->status === ParticipationStatus::CANCELLED) {
            throw new InvalidArgumentException('Cannot charge a cancelled participation.');
        }

        $ticketType = $participation->ticket_type_id
            ? TicketType::find($participation->ticket_type_id)
            : null;

        if (! $ticketType || ! $ticketType->isPaid()) {
            throw new InvalidArgumentException('Participation has no paid ticket type.');
        }

        // Idempotency: reuse existing pending/completed payment for this participation
        $existing = Payment::query()
            ->where('participation_id', $participation->id)
            ->whereIn('status', [PaymentStatus::PENDING, PaymentStatus::COMPLETED])
            ->latest('id')
            ->first();

        if ($existing?->status === PaymentStatus::COMPLETED) {
            return $existing;
        }

        if ($existing?->status === PaymentStatus::PENDING) {
            // Do not blindly re-call Waafi with same reference — resume or wait
            throw new InvalidArgumentException(
                'A payment is already pending for this participation ('.$existing->reference_id.'). Wait for completion or expiry.'
            );
        }

        $timeoutMinutes = (int) config('waafipay.pending_timeout_minutes', 15);
        $amount = app(DiscountPricingService::class)->chargeAmountFor($participation, $ticketType);

        if ((float) $amount <= 0) {
            throw new InvalidArgumentException('Nothing to charge for this participation.');
        }

        $payment = Payment::create([
            'participation_id' => $participation->id,
            'ticket_type_id' => $ticketType->id,
            'amount' => $amount,
            'currency' => config('waafipay.currency', 'USD'),
            'status' => PaymentStatus::PENDING,
            'reference_id' => 'INV-'.Str::uuid()->toString(),
            'payer_phone' => $phone,
            'expires_at' => now()->addMinutes($timeoutMinutes),
        ]);

        $participation->payment_status = ParticipationPaymentStatus::PENDING;
        $participation->save();

        return $this->executeWaafiPurchase($payment);
    }

    /**
     * Resume Waafi call for an existing pending payment (e.g. admin retry after careful check).
     * Uses the SAME reference_id — only safe if Waafi never completed; we re-check status first.
     */
    public function executeWaafiPurchase(Payment $payment): Payment
    {
        $payment = $payment->fresh();
        if (! $payment || $payment->status !== PaymentStatus::PENDING) {
            throw new InvalidArgumentException('Only pending payments can be sent to WaafiPay.');
        }

        $result = $this->waafi->purchase(
            $payment->reference_id,
            $payment->amountForWaafi(),
            (string) $payment->payer_phone
        );

        return DB::transaction(function () use ($payment, $result) {
            /** @var Payment $payment */
            $payment = Payment::query()->whereKey($payment->id)->lockForUpdate()->firstOrFail();

            // Another process may have completed/expired meanwhile
            if ($payment->status !== PaymentStatus::PENDING) {
                return $payment;
            }

            if ($result['success']) {
                $payment->status = PaymentStatus::COMPLETED;
                $payment->waafi_transaction_id = $result['transaction_id'];
                $payment->waafi_issuer_transaction_id = $result['issuer_transaction_id'];
                $payment->failure_reason = null;
                $payment->failure_code = null;
                $payment->save();

                $this->syncParticipationPaid($payment);
                $freshParticipation = Participation::query()
                    ->whereKey($payment->participation_id)
                    ->lockForUpdate()
                    ->first();
                if ($freshParticipation) {
                    app(DiscountPricingService::class)->consumeUsageIfNeeded($freshParticipation);
                }

                return $payment->fresh(['participation', 'ticketType']);
            }

            $payment->status = PaymentStatus::FAILED;
            $payment->failure_code = $result['failure_code'];
            $payment->failure_reason = $result['failure_reason'];
            $payment->save();

            $participation = $payment->participation;
            if ($participation) {
                $this->cancelUnpaidAfterFailedPayment($participation);
            }

            return $payment->fresh(['participation', 'ticketType']);
        });
    }

    /**
     * Refund a completed payment.
     *
     * DECISION (refund-after-payout): Block when refund would push outstanding below zero
     * relative to reserved/paid-out payouts. Documented in .agent Change Log.
     */
    public function refund(Payment $payment, ?string $reason = null): Payment
    {
        return DB::transaction(function () use ($payment, $reason) {
            $payment = Payment::query()->whereKey($payment->id)->lockForUpdate()->firstOrFail();

            if ($payment->status !== PaymentStatus::COMPLETED) {
                throw new InvalidArgumentException('Only completed payments can be refunded.');
            }

            $participation = Participation::query()
                ->whereKey($payment->participation_id)
                ->lockForUpdate()
                ->firstOrFail();

            $eventId = (int) $participation->event_id;
            $collected = $this->finance->totalCollected($eventId);
            $reserved = $this->finance->totalReservedOrPaidOut($eventId);
            $afterRefundCollected = round($collected - (float) $payment->amount, 2);

            // Block if already paid out / reserved money would exceed remaining collected
            if ($afterRefundCollected + 0.001 < $reserved) {
                throw new RuntimeException(
                    'Refund blocked: this payment has already been included in a payout (or reserved payout). '
                    .'Clawback/admin adjustment required — automatic refund after payout is not supported.'
                );
            }

            $payment->status = PaymentStatus::REFUNDED;
            $payment->failure_reason = $reason ?? 'Refunded by admin';
            $payment->save();

            $participation->payment_status = ParticipationPaymentStatus::REFUNDED;
            // Keep status for check-in rules — QR treats refunded as invalid
            $participation->save();

            return $payment->fresh(['participation']);
        });
    }

    /**
     * Expire stale pending payments (called by job).
     * Sets payment→failed, participation payment_status→failed, cancels participation, releases ticket.
     */
    public function expirePending(Payment $payment): Payment
    {
        return DB::transaction(function () use ($payment) {
            $payment = Payment::query()->whereKey($payment->id)->lockForUpdate()->firstOrFail();

            if ($payment->status !== PaymentStatus::PENDING) {
                return $payment;
            }

            $payment->status = PaymentStatus::FAILED;
            $payment->failure_code = 'expired';
            $payment->failure_reason = 'Payment expired — customer did not approve in time.';
            $payment->save();

            $participation = Participation::query()
                ->whereKey($payment->participation_id)
                ->lockForUpdate()
                ->first();

            if ($participation) {
                $this->cancelUnpaidAfterFailedPayment($participation);
            }

            return $payment->fresh(['participation']);
        });
    }

    /**
     * Record a manual/offline payment for a participation.
     * Creates a COMPLETED payment with gateway=manual.
     * Rejects if the participation already has a completed payment.
     * Calls QrTokenService::ensureForConfirmed after marking paid.
     */
    public function recordManual(Participation $participation, ?float $amount = null, ?string $note = null): Payment
    {
        return DB::transaction(function () use ($participation, $amount, $note) {
            $participation = Participation::query()
                ->whereKey($participation->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($participation->status === ParticipationStatus::CANCELLED) {
                throw new InvalidArgumentException('Cannot record payment for a cancelled participation.');
            }

            $existing = Payment::query()
                ->where('participation_id', $participation->id)
                ->where('status', PaymentStatus::COMPLETED)
                ->exists();

            if ($existing) {
                throw new InvalidArgumentException('Participation already has a completed payment.');
            }

            $ticketType = $participation->ticket_type_id
                ? TicketType::find($participation->ticket_type_id)
                : null;

            $resolvedAmount = $amount ?? ($ticketType?->price ?? 0);

            $payment = Payment::create([
                'participation_id' => $participation->id,
                'ticket_type_id' => $ticketType?->id,
                'amount' => $resolvedAmount,
                'currency' => config('waafipay.currency', 'USD'),
                'status' => PaymentStatus::COMPLETED,
                'reference_id' => 'MANUAL-'.Str::uuid()->toString(),
                'gateway' => 'manual',
                'failure_reason' => $note,
            ]);

            $this->syncParticipationPaid($payment);

            return $payment->fresh(['participation', 'ticketType']);
        });
    }

    private function syncParticipationPaid(Payment $payment): void
    {
        $participation = Participation::query()
            ->whereKey($payment->participation_id)
            ->lockForUpdate()
            ->first();

        if (! $participation) {
            return;
        }

        $participation->payment_status = ParticipationPaymentStatus::PAID;
        if (in_array($participation->status, [ParticipationStatus::JOINED, ParticipationStatus::WAITLISTED], true)) {
            $participation->status = ParticipationStatus::PAID;
        }
        $participation->save();

        app(QrTokenService::class)->ensureForConfirmed($participation);

        $event = $participation->event;
        if ($event) {
            app(ParticipationService::class)->syncEventRegistrationCount($event);
            app(EventStatusMachine::class)->syncSoldOutFromCapacity($event->fresh());
        }
    }

    /**
     * Failed/expired unpaid checkout: cancel so the seat and ticket inventory are released.
     */
    private function cancelUnpaidAfterFailedPayment(Participation $participation): void
    {
        $svc = app(ParticipationService::class);
        if ($participation->status !== ParticipationStatus::CANCELLED) {
            $participation = $svc->cancel($participation);
        }

        $participation->payment_status = ParticipationPaymentStatus::FAILED;
        $participation->save();
    }
}
