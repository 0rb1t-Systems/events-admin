<?php

namespace Tests\Feature;

use App\Enums\EventMode;
use App\Enums\EventStatus;
use App\Enums\PackageStatus;
use App\Enums\SanctumAbility;
use App\Enums\SubscriptionStatus;
use App\Models\Event;
use App\Models\Organizer;
use App\Models\OrganizerSubscription;
use App\Models\Package;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EventModeWhyAttendApiTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsOrganizer(Organizer $organizer): void
    {
        Sanctum::actingAs($organizer, [SanctumAbility::OrganizerWeb->value]);
    }

    private function organizerWithQuota(): Organizer
    {
        $organizer = Organizer::factory()->create();
        $package = Package::factory()->create([
            'event_quota' => 10,
            'status' => PackageStatus::ACTIVE,
        ]);
        OrganizerSubscription::factory()->create([
            'organizer_id' => $organizer->id,
            'package_id' => $package->id,
            'status' => SubscriptionStatus::ACTIVE,
            'expires_at' => null,
        ]);

        return $organizer;
    }

    public function test_organizer_create_requires_event_mode(): void
    {
        $this->actingAsOrganizer($this->organizerWithQuota());

        $this->postJson('/api/v1/organizer/events', [
            'title' => 'No mode',
        ])->assertStatus(422);
    }

    public function test_online_and_hybrid_require_online_url_in_person_does_not(): void
    {
        $organizer = $this->organizerWithQuota();
        $this->actingAsOrganizer($organizer);

        $this->postJson('/api/v1/organizer/events', [
            'title' => 'Online missing url',
            'event_mode' => EventMode::ONLINE->value,
        ])->assertStatus(422);

        $this->postJson('/api/v1/organizer/events', [
            'title' => 'Hybrid missing url',
            'event_mode' => EventMode::HYBRID->value,
        ])->assertStatus(422);

        $inPerson = $this->postJson('/api/v1/organizer/events', [
            'title' => 'Hall show',
            'event_mode' => EventMode::IN_PERSON->value,
            'city' => 'Mogadishu',
        ])->assertCreated();

        $this->assertSame(EventMode::IN_PERSON->value, $inPerson->json('data.event_mode'));
        $this->assertNull($inPerson->json('data.online_url'));
    }

    public function test_online_event_does_not_require_physical_venue(): void
    {
        $this->actingAsOrganizer($this->organizerWithQuota());

        $this->postJson('/api/v1/organizer/events', [
            'title' => 'Stream only',
            'event_mode' => EventMode::ONLINE->value,
            'online_url' => 'https://meet.example.com/room',
        ])
            ->assertCreated()
            ->assertJsonPath('data.event_mode', EventMode::ONLINE->value)
            ->assertJsonPath('data.online_url', 'https://meet.example.com/room')
            ->assertJsonPath('data.city', null)
            ->assertJsonPath('data.address', null);
    }

    public function test_why_attend_is_sanitized_and_serialized_publicly(): void
    {
        $organizer = $this->organizerWithQuota();
        $this->actingAsOrganizer($organizer);

        $created = $this->postJson('/api/v1/organizer/events', [
            'title' => 'Founders mixer',
            'event_mode' => EventMode::HYBRID->value,
            'online_url' => 'https://zoom.example.com/j/1',
            'why_attend' => [
                '  Meet founders  ',
                '',
                'Learn tactics',
            ],
        ])->assertCreated();

        $this->assertSame(
            ['Meet founders', 'Learn tactics'],
            $created->json('data.why_attend')
        );

        $id = $created->json('data.id');
        $event = Event::query()->findOrFail($id);
        $event->status = EventStatus::PUBLISHED;
        $event->save();

        $this->getJson("/api/v1/events/{$id}")
            ->assertOk()
            ->assertJsonPath('data.event_mode', EventMode::HYBRID->value)
            ->assertJsonPath('data.online_url', 'https://zoom.example.com/j/1')
            ->assertJsonPath('data.why_attend.0', 'Meet founders');

        $this->getJson("/api/v1/organizer/events/{$id}")
            ->assertOk()
            ->assertJsonPath('data.why_attend.1', 'Learn tactics');
    }

    public function test_factory_defaults_event_mode_in_person(): void
    {
        $event = Event::factory()->published()->create();
        $this->assertSame(EventMode::IN_PERSON, $event->event_mode);

        $this->getJson("/api/v1/events/{$event->id}")
            ->assertOk()
            ->assertJsonPath('data.event_mode', EventMode::IN_PERSON->value);
    }
}
