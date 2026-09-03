<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventImage;
use App\Models\EventSpeaker;
use App\Models\Organizer;
use App\Models\Participation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrganizerWebContentApiTest extends TestCase
{
    use RefreshDatabase;

    private Organizer $organizer;

    private Organizer $otherOrganizer;

    private Event $ownEvent;

    private Event $foreignEvent;

    protected function setUp(): void
    {
        parent::setUp();

        $this->organizer = Organizer::factory()->create();
        $this->otherOrganizer = Organizer::factory()->create();

        $this->ownEvent = Event::factory()->create([
            'organizer_id' => $this->organizer->id,
        ]);
        $this->foreignEvent = Event::factory()->create([
            'organizer_id' => $this->otherOrganizer->id,
        ]);
    }

    private function actingAsOrganizer(Organizer $organizer): void
    {
        Sanctum::actingAs($organizer, ['organizer-web']);
    }

    public function test_cannot_access_another_organizers_speakers_gallery_or_participations(): void
    {
        $foreignSpeaker = EventSpeaker::query()->create([
            'event_id' => $this->foreignEvent->id,
            'name' => 'Foreign Speaker',
            'sort_order' => 0,
        ]);
        $foreignImage = EventImage::factory()->create([
            'event_id' => $this->foreignEvent->id,
        ]);
        $foreignParticipation = Participation::factory()->create([
            'event_id' => $this->foreignEvent->id,
        ]);

        $this->actingAsOrganizer($this->organizer);

        $this->getJson('/api/v1/organizer/events/'.$this->foreignEvent->id.'/speakers')
            ->assertNotFound()
            ->assertJsonPath('success', false)
            ->assertJsonPath('status_code', 404);

        $this->patchJson('/api/v1/organizer/speakers/'.$foreignSpeaker->id, ['name' => 'Hijack'])
            ->assertNotFound()
            ->assertJsonPath('success', false)
            ->assertJsonPath('status_code', 404);

        $this->getJson('/api/v1/organizer/events/'.$this->foreignEvent->id.'/images')
            ->assertNotFound()
            ->assertJsonPath('success', false)
            ->assertJsonPath('status_code', 404);

        $this->getJson('/api/v1/organizer/events/'.$this->foreignEvent->id.'/images/'.$foreignImage->id)
            ->assertNotFound()
            ->assertJsonPath('success', false)
            ->assertJsonPath('status_code', 404);

        $this->getJson('/api/v1/organizer/events/'.$this->foreignEvent->id.'/participations')
            ->assertNotFound()
            ->assertJsonPath('success', false)
            ->assertJsonPath('status_code', 404);

        $this->getJson('/api/v1/organizer/participations/'.$foreignParticipation->id)
            ->assertNotFound()
            ->assertJsonPath('success', false)
            ->assertJsonPath('status_code', 404);
    }

    public function test_can_list_own_event_speakers(): void
    {
        EventSpeaker::query()->create([
            'event_id' => $this->ownEvent->id,
            'name' => 'Ada Lovelace',
            'title' => 'Keynote',
            'sort_order' => 1,
        ]);
        EventSpeaker::query()->create([
            'event_id' => $this->foreignEvent->id,
            'name' => 'Should Not Appear',
            'sort_order' => 0,
        ]);

        $this->actingAsOrganizer($this->organizer);

        $this->getJson('/api/v1/organizer/events/'.$this->ownEvent->id.'/speakers')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('status_code', 200)
            ->assertJsonPath('data.items.0.name', 'Ada Lovelace')
            ->assertJsonPath('data.pagination.total', 1)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'items',
                    'pagination' => ['current_page', 'last_page', 'per_page', 'total'],
                ],
                'status_code',
            ]);
    }

    public function test_cannot_cancel_participation_on_another_organizers_event(): void
    {
        $foreignParticipation = Participation::factory()->create([
            'event_id' => $this->foreignEvent->id,
        ]);

        $this->actingAsOrganizer($this->organizer);

        $this->postJson('/api/v1/organizer/participations/'.$foreignParticipation->id.'/cancel')
            ->assertNotFound()
            ->assertJsonPath('success', false)
            ->assertJsonPath('status_code', 404);

        $this->assertNotSame(
            \App\Enums\ParticipationStatus::CANCELLED,
            $foreignParticipation->fresh()->status
        );
    }

    public function test_analytics_and_finance_return_404_for_foreign_event(): void
    {
        $this->actingAsOrganizer($this->organizer);

        $this->getJson('/api/v1/organizer/events/'.$this->foreignEvent->id.'/analytics')
            ->assertNotFound()
            ->assertJsonPath('success', false)
            ->assertJsonPath('status_code', 404);

        $this->getJson('/api/v1/organizer/events/'.$this->foreignEvent->id.'/finance')
            ->assertNotFound()
            ->assertJsonPath('success', false)
            ->assertJsonPath('status_code', 404);
    }
}
