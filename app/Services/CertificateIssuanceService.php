<?php

namespace App\Services;

use App\Models\Certificate;
use App\Models\Participation;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

/**
 * Idempotent certificate issuance — unique(participation_id) + pre-check + race-safe catch.
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

                return Certificate::create([
                    'participation_id' => $participation->id,
                    'issued_at' => now(),
                    'file_path' => null,
                    'file_url' => null,
                    'verified' => false,
                ]);
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
}
