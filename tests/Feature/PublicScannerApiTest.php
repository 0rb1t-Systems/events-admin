<?php

namespace Tests\Feature;

use App\Enums\ParticipationStatus;
use App\Models\Event;
use App\Models\Organizer;
use App\Models\Participation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicScannerApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_unlock_and_validate_without_bearer(): void
    {
        $organizer = Organizer::factory()->create();
        $event = Event::factory()->create([
            'organizer_id' => $organizer->id,
            'scan_token' => 'DOOR-TEST-TOKEN',
        ]);

        $participation = Participation::factory()->create([
            'event_id' => $event->id,
            'status' => ParticipationStatus::JOINED,
            'payment_status' => 'not_required',
            'qr_token' => 'qr-public-test-token',
        ]);

        $this->postJson('/api/v1/public/scanner/unlock', [
            'scan_token' => 'DOOR-TEST-TOKEN',
        ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.event_id', $event->id);

        $this->postJson('/api/v1/public/qr-scan-logs/validate', [
            'scan_token' => 'DOOR-TEST-TOKEN',
            'token' => 'qr-public-test-token',
            'event_id' => $event->id,
        ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.result', 'valid')
            ->assertJsonPath('data.participation.id', $participation->id);

        $this->postJson("/api/v1/public/scanner/events/{$event->id}/qr-scan-logs", [
            'scan_token' => 'DOOR-TEST-TOKEN',
        ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.event_id', $event->id);
    }

    public function test_public_unlock_rejects_invalid_token(): void
    {
        $this->postJson('/api/v1/public/scanner/unlock', [
            'scan_token' => 'NOT-A-REAL-TOKEN',
        ])
            ->assertNotFound()
            ->assertJsonPath('success', false);
    }
}
