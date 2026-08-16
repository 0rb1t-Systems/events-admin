<?php

namespace App\Services;

use App\Enums\PayoutRequestStatus;
use App\Models\Event;
use App\Models\Organizer;
use App\Models\PayoutRequest;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

/**
 * Per-event payout workflow.
 *
 * Double-payout protection: outstanding-balance check + status transition happen
 * inside the SAME DB::transaction with lockForUpdate on the event's payout rows.
 *
 * Commission: snapshotted at request creation from CommissionSettings::currentRate().
 * Display/recordPayment MUST use payout_requests.commission_rate — never live settings.
 */
class PayoutService
{
    public function __construct(private EventFinanceService $finance) {}

    public function request(Event $event, float $amount, ?Organizer $organizer = null): PayoutRequest
    {
        return DB::transaction(function () use ($event, $amount, $organizer) {
            $event = Event::query()->whereKey($event->id)->lockForUpdate()->firstOrFail();

            // Lock existing reducing payouts for this event
            PayoutRequest::query()
                ->where('event_id', $event->id)
                ->whereIn('status', PayoutRequestStatus::reducingOutstanding())
                ->lockForUpdate()
                ->get();

            if ($amount <= 0) {
                throw new InvalidArgumentException('Payout amount must be positive.');
            }

            $outstanding = $this->finance->outstandingBalance($event->id);
            if ($amount > $outstanding + 0.001) {
                throw new InvalidArgumentException(
                    "Requested amount ({$amount}) exceeds outstanding balance ({$outstanding})."
                );
            }

            $orgId = $organizer?->id ?? $event->organizer_id;
            $rate = CommissionSettings::currentRate(); // SNAPSHOT source

            return PayoutRequest::create([
                'organizer_id' => $orgId,
                'event_id' => $event->id,
                'requested_amount' => $amount,
                'status' => PayoutRequestStatus::REQUESTED,
                'commission_rate' => $rate, // stored snapshot — never recompute later
                'commission_amount' => null,
                'net_amount' => null,
            ]);
        });
    }

    public function approve(PayoutRequest $payout, User $admin, ?string $notes = null): PayoutRequest
    {
        return DB::transaction(function () use ($payout, $admin, $notes) {
            $payout = PayoutRequest::query()->whereKey($payout->id)->lockForUpdate()->firstOrFail();

            if ($payout->status !== PayoutRequestStatus::REQUESTED) {
                throw new InvalidArgumentException('Only requested payouts can be approved.');
            }

            Event::query()->whereKey($payout->event_id)->lockForUpdate()->firstOrFail();
            PayoutRequest::query()
                ->where('event_id', $payout->event_id)
                ->whereIn('status', PayoutRequestStatus::reducingOutstanding())
                ->lockForUpdate()
                ->get();

            // Re-validate outstanding still covers this request (other overlapping requests)
            $othersReserved = (float) PayoutRequest::query()
                ->where('event_id', $payout->event_id)
                ->where('id', '!=', $payout->id)
                ->whereIn('status', PayoutRequestStatus::reducingOutstanding())
                ->sum('requested_amount');

            $collected = $this->finance->totalCollected($payout->event_id);
            $available = round($collected - $othersReserved, 2);

            if ((float) $payout->requested_amount > $available + 0.001) {
                throw new RuntimeException(
                    'Cannot approve: outstanding balance no longer covers this payout (double-payout guard).'
                );
            }

            $amounts = $payout->computeAmountsFromSnapshot();

            $payout->status = PayoutRequestStatus::APPROVED;
            $payout->commission_amount = $amounts['commission_amount'];
            $payout->net_amount = $amounts['net_amount'];
            $payout->reviewed_by = $admin->id;
            $payout->reviewed_at = now();
            if ($notes !== null) {
                $payout->admin_notes = $notes;
            }
            $payout->save();

            return $payout->fresh(['event', 'organizer', 'reviewer']);
        });
    }

    public function reject(PayoutRequest $payout, User $admin, ?string $notes = null): PayoutRequest
    {
        return DB::transaction(function () use ($payout, $admin, $notes) {
            $payout = PayoutRequest::query()->whereKey($payout->id)->lockForUpdate()->firstOrFail();

            if (! in_array($payout->status, [PayoutRequestStatus::REQUESTED, PayoutRequestStatus::APPROVED], true)) {
                throw new InvalidArgumentException('Only requested or approved payouts can be rejected.');
            }

            $payout->status = PayoutRequestStatus::REJECTED;
            $payout->reviewed_by = $admin->id;
            $payout->reviewed_at = now();
            if ($notes !== null) {
                $payout->admin_notes = $notes;
            }
            $payout->save();

            return $payout->fresh(['event', 'organizer', 'reviewer']);
        });
    }

    /**
     * Record offline payment to organizer — marks paid.
     * Balance check + recording in SAME transaction with locks.
     */
    public function recordPayment(PayoutRequest $payout, User $admin, ?float $confirmedAmount = null, ?string $notes = null): PayoutRequest
    {
        return DB::transaction(function () use ($payout, $admin, $confirmedAmount, $notes) {
            $payout = PayoutRequest::query()->whereKey($payout->id)->lockForUpdate()->firstOrFail();

            if ($payout->status !== PayoutRequestStatus::APPROVED) {
                throw new InvalidArgumentException('Only approved payouts can be marked paid.');
            }

            Event::query()->whereKey($payout->event_id)->lockForUpdate()->firstOrFail();
            PayoutRequest::query()
                ->where('event_id', $payout->event_id)
                ->whereIn('status', PayoutRequestStatus::reducingOutstanding())
                ->lockForUpdate()
                ->get();

            if ($confirmedAmount !== null) {
                $expected = (float) ($payout->net_amount ?? $payout->computeAmountsFromSnapshot()['net_amount']);
                if (abs($confirmedAmount - $expected) > 0.01) {
                    throw new InvalidArgumentException(
                        "Confirmed amount ({$confirmedAmount}) does not match net amount ({$expected}) from snapshot rate."
                    );
                }
            }

            // Recompute display amounts from SNAPSHOT if missing
            if ($payout->commission_amount === null || $payout->net_amount === null) {
                $amounts = $payout->computeAmountsFromSnapshot();
                $payout->commission_amount = $amounts['commission_amount'];
                $payout->net_amount = $amounts['net_amount'];
            }

            $othersPaidOrReserved = (float) PayoutRequest::query()
                ->where('event_id', $payout->event_id)
                ->where('id', '!=', $payout->id)
                ->whereIn('status', PayoutRequestStatus::reducingOutstanding())
                ->sum('requested_amount');

            $collected = $this->finance->totalCollected($payout->event_id);
            if ((float) $payout->requested_amount + $othersPaidOrReserved > $collected + 0.001) {
                throw new RuntimeException(
                    'Cannot record payment: would exceed collected funds (double-payout guard).'
                );
            }

            $payout->status = PayoutRequestStatus::PAID;
            $payout->paid_at = now();
            $payout->reviewed_by = $admin->id;
            $payout->reviewed_at = now();
            if ($notes !== null) {
                $payout->admin_notes = $notes;
            }
            $payout->save();

            return $payout->fresh(['event', 'organizer', 'reviewer']);
        });
    }
}
