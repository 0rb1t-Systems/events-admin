<?php

namespace App\Services;

use App\Enums\ParticipationStatus;
use App\Models\EventFeedback;
use App\Models\Participation;
use InvalidArgumentException;

/**
 * Feedback submission rules (Web App will call; ops/tests use now).
 * Only checked_in (or later lifecycle — currently checked_in is terminal attendance state).
 */
class EventFeedbackService
{
    public function submit(Participation $participation, int $rating, ?string $comment = null): EventFeedback
    {
        if ($rating < 1 || $rating > 5) {
            throw new InvalidArgumentException('Rating must be between 1 and 5.');
        }

        if ($participation->status !== ParticipationStatus::CHECKED_IN) {
            throw new InvalidArgumentException(
                'Feedback can only be submitted for checked-in participations.'
            );
        }

        $existing = EventFeedback::query()
            ->where('participation_id', $participation->id)
            ->first();

        if ($existing) {
            throw new InvalidArgumentException('Feedback already submitted for this participation.');
        }

        return EventFeedback::create([
            'participation_id' => $participation->id,
            'rating' => $rating,
            'comment' => $comment,
            'submitted_at' => now(),
        ]);
    }
}
