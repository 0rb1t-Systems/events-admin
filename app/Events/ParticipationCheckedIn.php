<?php

namespace App\Events;

use App\Models\Participation;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired once on first successful QR check-in (valid path only).
 * Listeners must be idempotent (certificates unique per participation).
 */
class ParticipationCheckedIn
{
    use Dispatchable, SerializesModels;

    public function __construct(public Participation $participation) {}
}
