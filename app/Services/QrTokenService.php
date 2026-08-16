<?php

namespace App\Services;

use App\Enums\ParticipationPaymentStatus;
use App\Enums\ParticipationStatus;
use App\Models\Participation;
use Illuminate\Database\QueryException;

/**
 * Issues cryptographically random qr_tokens for confirmed participations.
 * Uniqueness is enforced by DB unique index on participations.qr_token
 * (migration 2026_08_16_160000 — $table->string('qr_token')->nullable()->unique()).
 */
class QrTokenService
{
    private const TOKEN_BYTES = 32;

    private const MAX_ATTEMPTS = 8;

    /**
     * Confirmed = paid, OR free-and-joined (joined + payment not required).
     * Pending payment / waitlisted / cancelled → no token.
     */
    public function isConfirmed(Participation $participation): bool
    {
        $status = $participation->status instanceof ParticipationStatus
            ? $participation->status
            : ParticipationStatus::from((string) $participation->status);

        $payment = $participation->payment_status instanceof ParticipationPaymentStatus
            ? $participation->payment_status
            : ParticipationPaymentStatus::from((string) $participation->payment_status);

        if ($status === ParticipationStatus::PAID) {
            return true;
        }

        if ($status === ParticipationStatus::JOINED && $payment === ParticipationPaymentStatus::NOT_REQUIRED) {
            return true;
        }

        // Joined but payment mirror already paid (Phase 6 may set payment before status)
        if ($status === ParticipationStatus::JOINED && $payment === ParticipationPaymentStatus::PAID) {
            return true;
        }

        // Already checked in still "had" a confirmed invitation
        if ($status === ParticipationStatus::CHECKED_IN) {
            return true;
        }

        return false;
    }

    /**
     * Assign a unique qr_token if the participation is confirmed and has none yet.
     * Idempotent — does not rotate existing tokens.
     */
    public function ensureForConfirmed(Participation $participation): Participation
    {
        if ($participation->qr_token) {
            return $participation;
        }

        if (! $this->isConfirmed($participation)) {
            return $participation;
        }

        return $this->assignToken($participation);
    }

    /**
     * Force-assign (or regenerate) a unique token. Prefer ensureForConfirmed for normal flow.
     */
    public function assignToken(Participation $participation): Participation
    {
        for ($attempt = 0; $attempt < self::MAX_ATTEMPTS; $attempt++) {
            $token = $this->generateToken();

            try {
                $participation->qr_token = $token;
                $participation->save();

                return $participation->fresh() ?? $participation;
            } catch (QueryException $e) {
                // Unique constraint collision — retry with a new random token
                if (! $this->isUniqueViolation($e)) {
                    throw $e;
                }
            }
        }

        throw new \RuntimeException('Unable to allocate a unique QR token after retries.');
    }

    public function generateToken(): string
    {
        return bin2hex(random_bytes(self::TOKEN_BYTES));
    }

    private function isUniqueViolation(QueryException $e): bool
    {
        $message = $e->getMessage();

        return str_contains($message, 'UNIQUE')
            || str_contains($message, 'Duplicate')
            || str_contains($message, 'unique');
    }
}
