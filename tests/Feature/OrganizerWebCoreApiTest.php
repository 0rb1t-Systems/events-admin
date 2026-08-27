<?php

namespace Tests\Feature;

use App\Enums\EventStatus;
use App\Enums\FormFieldType;
use App\Enums\OrganizerStatus;
use App\Enums\PackageStatus;
use App\Enums\SanctumAbility;
use App\Enums\SubscriptionStatus;
use App\Enums\UserStatus;
use App\Models\Event;
use App\Models\EventFormField;
use App\Models\Organizer;
use App\Models\OrganizerSubscription;
use App\Models\Package;
use App\Models\TicketType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrganizerWebCoreApiTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsOrganizer(Organizer $organizer): Organizer
    {
        Sanctum::actingAs($organizer, [SanctumAbility::OrganizerWeb->value]);

        return $organizer;
    }

    private function organizerWithQuota(?int $quota = 10): Organizer
    {
        $organizer = Organizer::factory()->create();
        $package = Package::factory()->create([
            'event_quota' => $quota,
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

    public function test_organizer_web_token_is_required(): void
    {
        $this->getJson('/api/v1/organizer/dashboard')
            ->assertUnauthorized();

        $admin = User::factory()->admin()->create([
            'email' => 'admin-web-core@example.com',
            'status' => UserStatus::ACTIVE,
        ]);
        Sanctum::actingAs($admin, [SanctumAbility::AdminPanel->value]);

        $this->getJson('/api/v1/organizer/dashboard')
            ->assertUnauthorized();
    }

    public function test_suspended_organizer_is_blocked(): void
    {
        $organizer = Organizer::factory()->create([
            'status' => OrganizerStatus::SUSPENDED,
        ]);
        $this->actingAsOrganizer($organizer);

        $this->getJson('/api/v1/organizer/dashboard')
            ->assertForbidden()
            ->assertJsonPath('errors.error_code.0', 'organizer_suspended');
    }

    public function test_cannot_get_or_patch_another_organizers_event(): void
    {
        $owner = Organizer::factory()->create();
        $intruder = Organizer::factory()->create();
        $event = Event::factory()->create(['organizer_id' => $owner->id]);

        $this->actingAsOrganizer($intruder);

        $this->getJson("/api/v1/organizer/events/{$event->id}")
            ->assertNotFound();

        $this->patchJson("/api/v1/organizer/events/{$event->id}", [
            'title' => 'Hijacked',
        ])->assertNotFound();

        $this->assertSame($event->title, $event->fresh()->title);
    }

    public function test_cannot_mutate_another_organizers_ticket_or_form_field(): void
    {
        $owner = Organizer::factory()->create();
        $intruder = Organizer::factory()->create();
        $event = Event::factory()->create(['organizer_id' => $owner->id]);
        $ticket = TicketType::factory()->for($event)->create(['name' => 'VIP']);
        $field = EventFormField::factory()->for($event)->create([
            'key' => 'shirt_size',
            'label' => 'Shirt size',
            'type' => FormFieldType::TEXT,
        ]);

        $this->actingAsOrganizer($intruder);

        $this->patchJson("/api/v1/organizer/ticket-types/{$ticket->id}", [
            'name' => 'Stolen',
        ])->assertNotFound();

        $this->deleteJson("/api/v1/organizer/ticket-types/{$ticket->id}")
            ->assertNotFound();

        $this->patchJson("/api/v1/organizer/form-fields/{$field->id}", [
            'label' => 'Stolen',
        ])->assertNotFound();

        $this->deleteJson("/api/v1/organizer/form-fields/{$field->id}")
            ->assertNotFound();

        $this->assertSame('VIP', $ticket->fresh()->name);
        $this->assertSame('Shirt size', $field->fresh()->label);
        $this->assertNull($ticket->fresh()->deleted_at);
    }

    public function test_create_event_sets_organizer_id_and_draft_status(): void
    {
        $organizer = $this->organizerWithQuota();
        $other = Organizer::factory()->create();
        $this->actingAsOrganizer($organizer);

        $response = $this->postJson('/api/v1/organizer/events', [
            'title' => 'My Concert',
            'event_mode' => 'in_person',
            'organizer_id' => $other->id,
            'status' => EventStatus::PUBLISHED->value,
            'featured' => true,
            'monetized' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.title', 'My Concert')
            ->assertJsonPath('data.organizer_id', $organizer->id)
            ->assertJsonPath('data.status', EventStatus::DRAFT->value)
            ->assertJsonPath('data.featured', false)
            ->assertJsonPath('data.monetized', false);

        $this->assertDatabaseHas('events', [
            'id' => $response->json('data.id'),
            'organizer_id' => $organizer->id,
            'status' => EventStatus::DRAFT->value,
        ]);
    }

    public function test_cannot_set_status_via_patch(): void
    {
        $organizer = Organizer::factory()->create();
        $event = Event::factory()->create([
            'organizer_id' => $organizer->id,
            'status' => EventStatus::DRAFT,
        ]);
        $this->actingAsOrganizer($organizer);

        $this->patchJson("/api/v1/organizer/events/{$event->id}", [
            'status' => EventStatus::PUBLISHED->value,
        ])->assertStatus(400);

        $this->assertSame(EventStatus::DRAFT, $event->fresh()->status);
    }

    public function test_organizer_event_show_and_patch_include_scan_token(): void
    {
        $organizer = Organizer::factory()->create();
        $event = Event::factory()->create([
            'organizer_id' => $organizer->id,
            'scan_token' => null,
        ]);
        $this->actingAsOrganizer($organizer);

        $show = $this->getJson("/api/v1/organizer/events/{$event->id}")
            ->assertOk()
            ->assertJsonPath('success', true);

        $token = $show->json('data.scan_token');
        $this->assertIsString($token);
        $this->assertSame(32, strlen($token));
        $this->assertSame($token, $event->fresh()->scan_token);

        $this->patchJson("/api/v1/organizer/events/{$event->id}", [
            'capacity' => 50,
        ])
            ->assertOk()
            ->assertJsonPath('data.scan_token', $token)
            ->assertJsonPath('data.capacity', 50);
    }

    public function test_dashboard_returns_owned_metrics_envelope(): void
    {
        $organizer = $this->organizerWithQuota(10);
        Event::factory()->count(2)->create(['organizer_id' => $organizer->id]);
        Event::factory()->create();
        $this->actingAsOrganizer($organizer);

        $this->getJson('/api/v1/organizer/dashboard')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.organizer.id', $organizer->id)
            ->assertJsonPath('data.total_events', 2)
            ->assertJsonPath('data.quota.events_created', 2);
    }

    public function test_index_lists_only_owned_events_with_web_pagination(): void
    {
        $organizer = Organizer::factory()->create();
        Event::factory()->create(['organizer_id' => $organizer->id, 'title' => 'Mine']);
        Event::factory()->create(['title' => 'Someone else']);
        $this->actingAsOrganizer($organizer);

        $this->getJson('/api/v1/organizer/events')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.pagination.total', 1)
            ->assertJsonPath('data.items.0.title', 'Mine');
    }

    public function test_organizer_ticket_type_create_and_update_accept_is_vip(): void
    {
        $organizer = $this->organizerWithQuota();
        $event = Event::factory()->create(['organizer_id' => $organizer->id]);
        $this->actingAsOrganizer($organizer);

        $created = $this->postJson("/api/v1/organizer/events/{$event->id}/ticket-types", [
            'name' => 'VIP Pass',
            'price' => 100,
            'is_vip' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'VIP Pass')
            ->assertJsonPath('data.is_vip', true);

        $id = $created->json('data.id');

        $this->patchJson("/api/v1/organizer/ticket-types/{$id}", [
            'name' => 'VIP',
            'is_vip' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'VIP')
            ->assertJsonPath('data.is_vip', false);

        $this->getJson("/api/v1/organizer/events/{$event->id}/ticket-types")
            ->assertOk()
            ->assertJsonPath('data.ticket_types.0.is_vip', false);
    }
}
