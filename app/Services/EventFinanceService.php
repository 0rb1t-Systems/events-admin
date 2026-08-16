<?php

namespace App\Services;

use App\Enums\PaymentStatus;
use App\Enums\PayoutRequestStatus;
use App\Models\Event;
use App\Models\Payment;
use App\Models\PayoutRequest;

/**
 * Event money aggregates — collected (completed payments) vs paid out / reserved.
 */
class EventFinanceService
{
    /** Sum of completed (non-refunded) payment amounts for the event. */
    public function totalCollected(int $eventId): float
    {
        return (float) Payment::query()
            ->where('status', PaymentStatus::COMPLETED)
            ->whereHas('participation', fn ($q) => $q->where('event_id', $eventId))
            ->sum('amount');
    }

    /** Sum of payout_requests that reduce available balance (requested+approved+paid). */
    public function totalReservedOrPaidOut(int $eventId): float
    {
        return (float) PayoutRequest::query()
            ->where('event_id', $eventId)
            ->whereIn('status', PayoutRequestStatus::reducingOutstanding())
            ->sum('requested_amount');
    }

    /** Fully settled (status=paid) payouts only. */
    public function totalPaidOut(int $eventId): float
    {
        return (float) PayoutRequest::query()
            ->where('event_id', $eventId)
            ->whereIn('status', PayoutRequestStatus::settled())
            ->sum('requested_amount');
    }

    public function outstandingBalance(int $eventId): float
    {
        return round($this->totalCollected($eventId) - $this->totalReservedOrPaidOut($eventId), 2);
    }

    /**
     * @return array{
     *   event_id: int,
     *   currency: string,
     *   total_collected: float,
     *   total_paid_out: float,
     *   total_reserved: float,
     *   outstanding_balance: float
     * }
     */
    public function summary(Event|int $event): array
    {
        $eventId = $event instanceof Event ? (int) $event->id : (int) $event;
        $collected = $this->totalCollected($eventId);
        $paidOut = $this->totalPaidOut($eventId);
        $reserved = $this->totalReservedOrPaidOut($eventId);

        return [
            'event_id' => $eventId,
            'currency' => (string) config('waafipay.currency', 'USD'),
            'total_collected' => $collected,
            'total_paid_out' => $paidOut,
            'total_reserved' => $reserved,
            'outstanding_balance' => round($collected - $reserved, 2),
        ];
    }
}
