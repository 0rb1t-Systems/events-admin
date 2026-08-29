<?php

namespace Tests\Feature;

use App\Enums\ParticipationStatus;
use App\Models\Event;
use App\Models\LuckyWheelAttempt;
use App\Models\Organizer;
use App\Models\Participation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrganizerLuckyWheelApiTest extends TestCase
{
    use RefreshDatabase;

    private Organizer $organizer;

    private Organizer $otherOrganizer;

    private Event $ownEvent;

    protected function setUp(): void
    {
        parent::setUp();

        $this->organizer = Organizer::factory()->create();
        $this->otherOrganizer = Organizer::factory()->create();
        $this->ownEvent = Event::factory()->create([
            'organizer_id' => $this->organizer->id,
        ]);
    }

    private function actingAsOrganizer(Organizer $organizer): void
    {
        Sanctum::actingAs($organizer, ['organizer-web']);
    }

    public function test_cannot_access_foreign_event_lucky_wheel(): void
    {
        $foreignEvent = Event::factory()->create([
            'organizer_id' => $this->otherOrganizer->id,
        ]);

        $this->actingAsOrganizer($this->organizer);

        $this->getJson('/api/v1/organizer/events/'.$foreignEvent->id.'/lucky-wheel')
            ->assertNotFound()
            ->assertJsonPath('success', false);

        $this->postJson('/api/v1/organizer/events/'.$foreignEvent->id.'/lucky-wheel/spin', [
            'winner_count' => 1,
        ])
            ->assertNotFound()
            ->assertJsonPath('success', false);
    }

    public function test_can_list_participants_and_attempt_history(): void
    {
        $active = Participation::factory()->create([
            'event_id' => $this->ownEvent->id,
            'status' => ParticipationStatus::JOINED,
        ]);
        Participation::factory()->create([
            'event_id' => $this->ownEvent->id,
            'status' => ParticipationStatus::CANCELLED,
        ]);

        $attempt = LuckyWheelAttempt::query()->create([
            'event_id' => $this->ownEvent->id,
            'winner_count' => 1,
            'participant_count' => 1,
            'created_by' => $this->organizer->id,
        ]);
        $attempt->winners()->create(['participation_id' => $active->id]);

        $this->actingAsOrganizer($this->organizer);

        $this->getJson('/api/v1/organizer/events/'.$this->ownEvent->id.'/lucky-wheel')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.participant_count', 1)
            ->assertJsonPath('data.participants.0.id', $active->id)
            ->assertJsonPath('data.attempts.0.winner_count', 1)
            ->assertJsonPath('data.attempts.0.winners.0.participation_id', $active->id);
    }

    public function test_spin_picks_winners_and_stores_attempt(): void
    {
        $rows = Participation::factory()->count(5)->create([
            'event_id' => $this->ownEvent->id,
            'status' => ParticipationStatus::JOINED,
        ]);

        $this->actingAsOrganizer($this->organizer);

        $response = $this->postJson('/api/v1/organizer/events/'.$this->ownEvent->id.'/lucky-wheel/spin', [
            'winner_count' => 2,
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.winner_count', 2)
            ->assertJsonPath('data.participant_count', 5);

        $attemptId = $response->json('data.id');
        $this->assertDatabaseHas('lucky_wheel_attempts', [
            'id' => $attemptId,
            'event_id' => $this->ownEvent->id,
            'winner_count' => 2,
            'participant_count' => 5,
        ]);

        $winnerIds = collect($response->json('data.winners'))->pluck('participation_id')->all();
        $this->assertCount(2, $winnerIds);
        $this->assertCount(2, array_unique($winnerIds));
        foreach ($winnerIds as $pid) {
            $this->assertTrue($rows->contains('id', $pid));
        }
    }

    public function test_spin_rejects_winner_count_above_participants(): void
    {
        Participation::factory()->count(2)->create([
            'event_id' => $this->ownEvent->id,
            'status' => ParticipationStatus::JOINED,
        ]);

        $this->actingAsOrganizer($this->organizer);

        $this->postJson('/api/v1/organizer/events/'.$this->ownEvent->id.'/lucky-wheel/spin', [
            'winner_count' => 3,
        ])
            ->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_spin_rejects_when_no_participants(): void
    {
        $this->actingAsOrganizer($this->organizer);

        $this->postJson('/api/v1/organizer/events/'.$this->ownEvent->id.'/lucky-wheel/spin', [
            'winner_count' => 1,
        ])
            ->assertStatus(422)
            ->assertJsonPath('success', false);
    }
}
