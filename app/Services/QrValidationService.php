<?php

namespace App\Services;

use App\Events\ParticipationCheckedIn;
use App\Enums\ParticipationPaymentStatus;
use App\Enums\ParticipationStatus;
use App\Enums\QrScanResult;
use App\Models\Organizer;
use App\Models\Participation;
use App\Models\QrScanLog;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * QR scan validation state machine.
 *
 * Three DISTINCT outcomes (never fold already_used into invalid):
 * - valid        — unseen token, participation claimable → check-in side effects
 * - already_used — previously checked in successfully → log only, NO side effects
 * - invalid      — missing token, cancelled, refunded, or not claimable
 *
 * Branch order (critical):
 * 1) not found → invalid
 * 2) cancelled / refunded → invalid   (BEFORE already_used)
 * 3) checked_in → already_used
 * 4) not claimable → invalid
 * 5) claimable → valid + check-in
 *
 * Every attempt is logged as its own qr_scan_logs row (first and re-scans alike).
 */
class QrValidationService
{
    /**
     * @return array{
     *   result: QrScanResult,
     *   participation: Participation|null,
     *   scan_log: QrScanLog,
     *   checked_in: bool
     * }
     */
    public function validate(
        string $token,
        ?string $gate = null,
        ?User $scannerUser = null,
        ?Organizer $scannerOrganizer = null
    ): array {
        $token = trim($token);

        return DB::transaction(function () use ($token, $gate, $scannerUser, $scannerOrganizer) {
            if ($token === '') {
                $log = $this->recordScan(
                    $token,
                    null,
                    QrScanResult::INVALID,
                    $gate,
                    $scannerUser,
                    $scannerOrganizer,
                    ['reason' => 'empty_token']
                );

                return $this->response(QrScanResult::INVALID, null, $log, false);
            }

            /** @var Participation|null $participation */
            $participation = Participation::query()
                ->where('qr_token', $token)
                ->lockForUpdate()
                ->first();

            // --- Branch 1: token doesn't exist ---
            if (! $participation) {
                $log = $this->recordScan(
                    $token,
                    null,
                    QrScanResult::INVALID,
                    $gate,
                    $scannerUser,
                    $scannerOrganizer,
                    ['reason' => 'token_not_found']
                );

                return $this->response(QrScanResult::INVALID, null, $log, false);
            }

            // --- Branch 2: cancelled → invalid (BEFORE already_used) ---
            if ($participation->status === ParticipationStatus::CANCELLED) {
                $log = $this->recordScan(
                    $token,
                    $participation,
                    QrScanResult::INVALID,
                    $gate,
                    $scannerUser,
                    $scannerOrganizer,
                    ['reason' => 'cancelled']
                );

                return $this->response(QrScanResult::INVALID, $participation, $log, false);
            }

            // --- Branch 2b: refunded → invalid (BEFORE already_used) ---
            if ($participation->payment_status === ParticipationPaymentStatus::REFUNDED) {
                $log = $this->recordScan(
                    $token,
                    $participation,
                    QrScanResult::INVALID,
                    $gate,
                    $scannerUser,
                    $scannerOrganizer,
                    ['reason' => 'refunded']
                );

                return $this->response(QrScanResult::INVALID, $participation, $log, false);
            }

            // --- Branch 3: already checked in → already_used (NO side effects) ---
            if ($participation->status === ParticipationStatus::CHECKED_IN) {
                $log = $this->recordScan(
                    $token,
                    $participation,
                    QrScanResult::ALREADY_USED,
                    $gate,
                    $scannerUser,
                    $scannerOrganizer,
                    ['reason' => 'already_checked_in']
                );

                return $this->response(QrScanResult::ALREADY_USED, $participation, $log, false);
            }

            // --- Branch 4: not claimable (waitlisted, pending payment, etc.) ---
            if (! $this->isClaimable($participation)) {
                $log = $this->recordScan(
                    $token,
                    $participation,
                    QrScanResult::INVALID,
                    $gate,
                    $scannerUser,
                    $scannerOrganizer,
                    ['reason' => 'not_claimable', 'status' => $participation->status?->value]
                );

                return $this->response(QrScanResult::INVALID, $participation, $log, false);
            }

            // --- Branch 5: valid — first successful scan → check-in ONLY here ---
            $participation->status = ParticipationStatus::CHECKED_IN;
            $participation->save();

            $log = $this->recordScan(
                $token,
                $participation,
                QrScanResult::VALID,
                $gate,
                $scannerUser,
                $scannerOrganizer,
                ['reason' => 'checked_in']
            );

            // Certificates / notifications via listener — not inline here
            event(new ParticipationCheckedIn($participation->fresh(['user', 'event']) ?? $participation));

            return $this->response(QrScanResult::VALID, $participation->fresh(['user', 'event']), $log, true);
        });
    }

    /**
     * Claimable for check-in: free-joined, paid, or payment mirror paid.
     */
    public function isClaimable(Participation $participation): bool
    {
        $status = $participation->status;
        $payment = $participation->payment_status;

        if ($status === ParticipationStatus::PAID) {
            return true;
        }

        if ($status === ParticipationStatus::JOINED) {
            return in_array($payment, [
                ParticipationPaymentStatus::NOT_REQUIRED,
                ParticipationPaymentStatus::PAID,
            ], true);
        }

        return false;
    }

    /**
     * Check-in dashboard stats (add-on 12.5 MUST).
     *
     * @return array{
     *   event_id: int,
     *   registered: int,
     *   arrived: int,
     *   absent: int,
     *   waitlisted: int,
     *   scan_attempts: int,
     *   valid_scans: int,
     *   already_used_scans: int,
     *   invalid_scans: int
     * }
     */
    public function checkInStats(int $eventId): array
    {
        $registered = Participation::query()
            ->where('event_id', $eventId)
            ->confirmedSeat()
            ->count();

        $arrived = Participation::query()
            ->where('event_id', $eventId)
            ->where('status', ParticipationStatus::CHECKED_IN)
            ->count();

        $scanBase = QrScanLog::query()->where('event_id', $eventId);

        return [
            'event_id' => $eventId,
            'registered' => $registered,
            'arrived' => $arrived,
            'absent' => max(0, $registered - $arrived),
            'waitlisted' => 0,
            'scan_attempts' => (clone $scanBase)->count(),
            'valid_scans' => (clone $scanBase)->where('result', QrScanResult::VALID)->count(),
            'already_used_scans' => (clone $scanBase)->where('result', QrScanResult::ALREADY_USED)->count(),
            'invalid_scans' => (clone $scanBase)->where('result', QrScanResult::INVALID)->count(),
        ];
    }

    private function recordScan(
        string $token,
        ?Participation $participation,
        QrScanResult $result,
        ?string $gate,
        ?User $scannerUser,
        ?Organizer $scannerOrganizer,
        ?array $meta = null
    ): QrScanLog {
        return QrScanLog::create([
            'scanned_token' => $token !== '' ? $token : '(empty)',
            'participation_id' => $participation?->id,
            'event_id' => $participation?->event_id,
            'result' => $result,
            'gate' => $gate,
            'scanner_user_id' => $scannerUser?->id,
            'scanner_organizer_id' => $scannerOrganizer?->id,
            'meta' => $meta,
        ]);
    }

    /**
     * @return array{result: QrScanResult, participation: Participation|null, scan_log: QrScanLog, checked_in: bool}
     */
    private function response(
        QrScanResult $result,
        ?Participation $participation,
        QrScanLog $log,
        bool $checkedIn
    ): array {
        return [
            'result' => $result,
            'participation' => $participation,
            'scan_log' => $log,
            'checked_in' => $checkedIn,
        ];
    }
}
