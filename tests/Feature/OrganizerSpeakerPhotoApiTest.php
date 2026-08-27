<?php

namespace Tests\Feature;

use App\Enums\SanctumAbility;
use App\Models\Event;
use App\Models\EventSpeaker;
use App\Models\Organizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrganizerSpeakerPhotoApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_speaker_with_photo_stores_public_assets_path(): void
    {
        $organizer = Organizer::factory()->create();
        $event = Event::factory()->create(['organizer_id' => $organizer->id]);
        Sanctum::actingAs($organizer, [SanctumAbility::OrganizerWeb->value]);

        $response = $this->post("/api/v1/organizer/events/{$event->id}/speakers", [
            'name' => 'Ada',
            'title' => 'Keynote',
            'photo' => UploadedFile::fake()->image('ada.jpg', 80, 80),
        ]);

        $response->assertCreated();
        $path = $response->json('data.photo_path');
        $url = $response->json('data.photo_url');

        $this->assertIsString($path);
        $this->assertStringStartsWith('/assets/images/events/speakers/', $path);
        $this->assertIsString($url);
        $this->assertStringContainsString('/assets/images/events/speakers/', $url);
        $this->assertFileExists(public_path(ltrim($path, '/')));

        File::delete(public_path(ltrim($path, '/')));
    }

    public function test_upload_photo_on_existing_speaker_replaces_file(): void
    {
        $organizer = Organizer::factory()->create();
        $event = Event::factory()->create(['organizer_id' => $organizer->id]);
        $speaker = EventSpeaker::query()->create([
            'event_id' => $event->id,
            'name' => 'Ada',
            'sort_order' => 0,
        ]);
        Sanctum::actingAs($organizer, [SanctumAbility::OrganizerWeb->value]);

        $response = $this->post("/api/v1/organizer/speakers/{$speaker->id}/photo", [
            'photo' => UploadedFile::fake()->image('headshot.png', 64, 64),
        ]);

        $response->assertOk();
        $path = $response->json('data.photo_path');
        $this->assertStringStartsWith('/assets/images/events/speakers/', $path);
        $this->assertFileExists(public_path(ltrim($path, '/')));
        $this->assertSame($path, $speaker->fresh()->photo_path);

        File::delete(public_path(ltrim($path, '/')));
    }

    public function test_cannot_upload_photo_for_another_organizers_speaker(): void
    {
        $organizer = Organizer::factory()->create();
        $other = Organizer::factory()->create();
        $foreignEvent = Event::factory()->create(['organizer_id' => $other->id]);
        $foreignSpeaker = EventSpeaker::query()->create([
            'event_id' => $foreignEvent->id,
            'name' => 'Foreign',
            'sort_order' => 0,
        ]);
        Sanctum::actingAs($organizer, [SanctumAbility::OrganizerWeb->value]);

        $this->post("/api/v1/organizer/speakers/{$foreignSpeaker->id}/photo", [
            'photo' => UploadedFile::fake()->image('x.jpg', 40, 40),
        ])
            ->assertNotFound()
            ->assertJsonPath('success', false)
            ->assertJsonPath('status_code', 404);
    }
}
