<?php

namespace App\Listeners;

use App\Events\ParticipationCheckedIn;
use App\Services\CertificateIssuanceService;

/**
 * Auto-issue attendance certificate on check-in.
 * Idempotent via CertificateIssuanceService (unique participation_id + exists check).
 * Runs synchronously so issuance is immediate after check-in; still safe under retries.
 */
class IssueAttendanceCertificate
{
    public function __construct(private CertificateIssuanceService $certificates) {}

    public function handle(ParticipationCheckedIn $event): void
    {
        $this->certificates->issueForParticipation($event->participation);
    }
}
