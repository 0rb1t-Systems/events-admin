<?php

namespace App\Services;

use App\Enums\ParticipationStatus;
use App\Models\Certificate;
use App\Models\Participation;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

/**
 * Idempotent certificate issuance — unique(participation_id) + pre-check + race-safe catch.
 * Force re-issue replaces the existing row only after the new issuance succeeds.
 */
class CertificateIssuanceService
{
    public function issueForParticipation(Participation $participation): Certificate
    {
        $existing = Certificate::query()
            ->where('participation_id', $participation->id)
            ->first();

        if ($existing) {
            return $existing;
        }

        try {
            return DB::transaction(function () use ($participation) {
                $locked = Certificate::query()
                    ->where('participation_id', $participation->id)
                    ->lockForUpdate()
                    ->first();

                if ($locked) {
                    return $locked;
                }

                return Certificate::create(array_merge(
                    ['participation_id' => $participation->id],
                    $this->buildPayload($participation)
                ));
            });
        } catch (QueryException $e) {
            // Unique constraint race — return the row that won
            if (str_contains($e->getMessage(), 'UNIQUE') || str_contains($e->getMessage(), 'Duplicate')) {
                return Certificate::query()
                    ->where('participation_id', $participation->id)
                    ->firstOrFail();
            }

            throw $e;
        }
    }

    /**
     * Force re-issue: bypasses idempotency, replaces existing certificate after successful generation.
     * On failure, the previous certificate row/file is left untouched.
     *
     * @throws InvalidArgumentException when participation is not checked_in
     * @throws RuntimeException when generation fails
     */
    public function reissueForParticipation(Participation $participation): Certificate
    {
        $status = $participation->status instanceof ParticipationStatus
            ? $participation->status
            : ParticipationStatus::tryFrom((string) $participation->status);

        if ($status !== ParticipationStatus::CHECKED_IN) {
            throw new InvalidArgumentException(
                'Certificate re-issue requires checked_in participation status.'
            );
        }

        $existing = Certificate::query()
            ->where('participation_id', $participation->id)
            ->first();

        $previousSnapshot = $existing
            ? [
                'issued_at' => $existing->issued_at,
                'file_path' => $existing->file_path,
                'file_url' => $existing->file_url,
                'verified' => $existing->verified,
            ]
            : null;

        try {
            $payload = $this->generateCertificatePayload($participation);

            return DB::transaction(function () use ($participation, $existing, $payload) {
                if ($existing) {
                    $existing->update($payload);

                    return $existing->fresh();
                }

                return Certificate::create(array_merge(
                    ['participation_id' => $participation->id],
                    $payload
                ));
            });
        } catch (Throwable $e) {
            // Fail safely — ensure previous row is unchanged (transaction already rolled back).
            if ($existing && $previousSnapshot) {
                $existing->refresh();
            }

            throw new RuntimeException(
                'Certificate re-issue failed: '.$e->getMessage(),
                0,
                $e
            );
        }
    }

    /**
     * Build / "generate" certificate fields. Stub storage until real PDF generation exists.
     * Throws on failure so reissue can fail safely without deleting the old record.
     *
     * @return array{issued_at: \Illuminate\Support\Carbon, file_path: string|null, file_url: string|null, verified: bool}
     */
    protected function generateCertificatePayload(Participation $participation): array
    {
        return $this->buildPayload($participation);
    }

    /**
     * @return array{issued_at: \Illuminate\Support\Carbon, file_path: string|null, file_url: string|null, verified: bool}
     */
    protected function buildPayload(Participation $participation): array
    {
        return [
            'issued_at' => now(),
            'file_path' => null,
            'file_url' => null,
            'verified' => false,
        ];
    }
}
