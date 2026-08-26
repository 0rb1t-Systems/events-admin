<?php

namespace App\Services;

use App\Enums\EventStatus;
use App\Enums\ParticipationStatus;
use App\Models\EventFeedback;
use App\Models\Participation;
use InvalidArgumentException;

/**
 * Feedback submission rules for the participant Web App.
 * Allowed after the event has ended (ends_at past or status completed),
 * for any non-cancelled participation (online events often have no check-in).
 */
class EventFeedbackService
{
    public function submit(Participation $participation, int $rating, ?string $comment = null): EventFeedback
    {
        if ($rating < 1 || $rating > 5) {
            throw new InvalidArgumentException('Rating must be between 1 and 5.');
        }

        if ($participation->status === ParticipationStatus::CANCELLED) {
            throw new InvalidArgumentException('Feedback cannot be submitted for a cancelled participation.');
        }

        $participation->loadMissing('event');
        $event = $participation->event;

        if (! $event) {
            throw new InvalidArgumentException('Event not found for this participation.');
        }

        $ended = $event->status === EventStatus::COMPLETED
            || ($event->ends_at && $event->ends_at->isPast());

        if (! $ended) {
            throw new InvalidArgumentException(
                'Feedback can only be submitted after the event has ended.'
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
