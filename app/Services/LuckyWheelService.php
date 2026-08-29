<?php

namespace App\Services;

use App\Enums\ParticipationStatus;
use App\Models\Event;
use App\Models\LuckyWheelAttempt;
use App\Models\LuckyWheelWinner;
use App\Models\Organizer;
use App\Models\Participation;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class LuckyWheelService
{
    /**
     * Non-cancelled registrations eligible for the lucky wheel.
     *
     * @return Collection<int, Participation>
     */
    public function eligibleParticipations(Event $event): Collection
    {
        return Participation::query()
            ->with(['user', 'ticketType'])
            ->where('event_id', $event->id)
            ->where('status', '!=', ParticipationStatus::CANCELLED->value)
            ->orderBy('created_at')
            ->get();
    }

    public function spin(Event $event, Organizer $organizer, int $winnerCount): LuckyWheelAttempt
    {
        $participations = $this->eligibleParticipations($event);
        $participantCount = $participations->count();

        if ($participantCount === 0) {
            throw new InvalidArgumentException('No registered participants available for the lucky wheel.');
        }

        if ($winnerCount < 1) {
            throw new InvalidArgumentException('Winner count must be at least 1.');
        }

        if ($winnerCount > $participantCount) {
            throw new InvalidArgumentException('Winner count cannot exceed the number of registered participants.');
        }

        $selected = $participations->shuffle()->take($winnerCount);

        return DB::transaction(function () use ($event, $organizer, $winnerCount, $participantCount, $selected) {
            $attempt = LuckyWheelAttempt::create([
                'event_id' => $event->id,
                'winner_count' => $winnerCount,
                'participant_count' => $participantCount,
                'created_by' => $organizer->id,
            ]);

            foreach ($selected as $participation) {
                LuckyWheelWinner::create([
                    'lucky_wheel_attempt_id' => $attempt->id,
                    'participation_id' => $participation->id,
                ]);
            }

            return $attempt->load(['winners.participation.user', 'winners.participation.ticketType']);
        });
    }
}
