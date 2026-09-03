<?php

namespace Tests\Feature;

use App\Enums\EventStatus;
use App\Enums\OrganizerStatus;
use App\Enums\PackageStatus;
use App\Enums\ParticipationPaymentStatus;
use App\Enums\ParticipationStatus;
use App\Enums\SanctumAbility;
use App\Enums\UserStatus;
use App\Models\Event;
use App\Models\Organizer;
use App\Models\Package;
use App\Models\Participation;
use App\Models\PayoutRequest;
use App\Models\User;
use App\Services\QrTokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class OrganizerWebOpsApiTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsOrganizer(Organizer $organizer): Organizer
    {
        Sanctum::actingAs($organizer, [SanctumAbility::OrganizerWeb->value]);

        return $organizer;
    }

    private function adminWithPermissions(): User
    {
        foreach ([
            'view payments',
            'manage payments',
            'view qr scan logs',
            'manage qr scans',
        ] as $name) {
            Permission::findOrCreate($name, 'web');
        }

        $role = Role::findOrCreate('admin', 'web');
        $role->syncPermissions(Permission::all());

        $admin = User::factory()->admin()->create([
            'email' => 'admin-ops@example.com',
            'status' => UserStatus::ACTIVE,
        ]);
        $admin->assignRole($role);

        return $admin;
    }

    public function test_cannot_request_payout_for_another_organizers_event(): void
    {
        $owner = Organizer::factory()->create();
        $intruder = Organizer::factory()->create();
        $event = Event::factory()->create(['organizer_id' => $owner->id]);
        $payout = PayoutRequest::factory()->create([
            'organizer_id' => $owner->id,
            'event_id' => $event->id,
        ]);

        $this->actingAsOrganizer($intruder);

        $this->postJson("/api/v1/organizer/events/{$event->id}/payout-requests", [
            'requested_amount' => 10,
        ])->assertNotFound()
            ->assertJsonPath('success', false)
            ->assertJsonPath('status_code', 404);

        $this->getJson("/api/v1/organizer/events/{$event->id}/payout-requests")
            ->assertNotFound();

        $this->getJson("/api/v1/organizer/payout-requests/{$payout->id}")
            ->assertNotFound();

        $this->assertDatabaseMissing('payout_requests', [
            'organizer_id' => $intruder->id,
            'event_id' => $event->id,
        ]);
    }

    public function test_cannot_validate_ticket_for_event_not_owned(): void
    {
        $owner = Organizer::factory()->create();
        $intruder = Organizer::factory()->create();
        $event = Event::factory()->create([
            'organizer_id' => $owner->id,
            'status' => EventStatus::REGISTRATION_OPEN,
            'capacity' => 50,
        ]);
        $participation = Participation::factory()->create([
            'event_id' => $event->id,
            'status' => ParticipationStatus::JOINED,
            'payment_status' => ParticipationPaymentStatus::NOT_REQUIRED,
            'qr_token' => null,
        ]);
        $participation = app(QrTokenService::class)->ensureForConfirmed($participation->fresh());

        $this->actingAsOrganizer($intruder);

        $response = $this->postJson('/api/v1/organizer/qr-scan-logs/validate', [
            'token' => $participation->qr_token,
            'gate' => 'Main',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.result', 'invalid')
            ->assertJsonPath('data.checked_in', false)
            ->assertJsonPath('data.participation', null);

        $this->assertSame(ParticipationStatus::JOINED, $participation->fresh()->status);

        $this->getJson("/api/v1/organizer/events/{$event->id}/qr-scan-logs")
            ->assertNotFound();

        $this->getJson("/api/v1/organizer/events/{$event->id}/check-in-stats")
            ->assertNotFound();
    }

    public function test_organizer_can_validate_owned_event_ticket(): void
    {
        $organizer = Organizer::factory()->create();
        $event = Event::factory()->create([
            'organizer_id' => $organizer->id,
            'status' => EventStatus::REGISTRATION_OPEN,
            'capacity' => 50,
        ]);
        $participation = Participation::factory()->create([
            'event_id' => $event->id,
            'status' => ParticipationStatus::JOINED,
            'payment_status' => ParticipationPaymentStatus::NOT_REQUIRED,
            'qr_token' => null,
        ]);
        $participation = app(QrTokenService::class)->ensureForConfirmed($participation->fresh());

        $this->actingAsOrganizer($organizer);

        $this->postJson('/api/v1/organizer/qr-scan-logs/validate', [
            'token' => $participation->qr_token,
        ])->assertOk()
            ->assertJsonPath('data.result', 'valid')
            ->assertJsonPath('data.checked_in', true);

        $this->assertSame(ParticipationStatus::CHECKED_IN, $participation->fresh()->status);
    }

    public function test_packages_list_returns_active_catalog_only(): void
    {
        Package::factory()->create(['name' => 'Visible Plan', 'status' => PackageStatus::ACTIVE]);
        Package::factory()->archived()->create(['name' => 'Hidden Plan']);

        $organizer = Organizer::factory()->create();
        $this->actingAsOrganizer($organizer);

        $response = $this->getJson('/api/v1/organizer/packages');
        $response->assertOk();

        $names = collect($response->json('data'))->pluck('name');
        $this->assertTrue($names->contains('Visible Plan'));
        $this->assertFalse($names->contains('Hidden Plan'));
    }

    public function test_profile_patch_updates_identity_and_enforces_unique_email(): void
    {
        $organizer = Organizer::factory()->create([
            'business_name' => 'Old Biz',
            'contact_name' => 'Old Contact',
            'email' => 'keep@example.com',
            'phone' => '111',
        ]);
        Organizer::factory()->create(['email' => 'taken@example.com']);

        $this->actingAsOrganizer($organizer);

        $this->patchJson('/api/v1/organizer-auth/profile', [
            'business_name' => 'New Biz',
            'contact_name' => 'New Contact',
            'email' => 'keep@example.com',
            'phone' => '222',
        ])->assertOk()
            ->assertJsonPath('data.organizer.business_name', 'New Biz')
            ->assertJsonPath('data.organizer.contact_name', 'New Contact')
            ->assertJsonPath('data.organizer.email', 'keep@example.com')
            ->assertJsonPath('data.organizer.phone', '222');

        $this->patchJson('/api/v1/organizer-auth/profile', [
            'email' => 'taken@example.com',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['email']);

        $this->assertDatabaseHas('organizers', [
            'id' => $organizer->id,
            'business_name' => 'New Biz',
            'email' => 'keep@example.com',
        ]);
    }

    public function test_suspended_organizer_is_blocked_via_organizer_web(): void
    {
        $organizer = Organizer::factory()->create([
            'status' => OrganizerStatus::SUSPENDED,
        ]);
        $this->actingAsOrganizer($organizer);

        $this->getJson('/api/v1/organizer/packages')
            ->assertForbidden()
            ->assertJsonPath('errors.error_code.0', 'organizer_suspended');

        $this->patchJson('/api/v1/organizer-auth/profile', [
            'business_name' => 'Nope',
        ])->assertForbidden()
            ->assertJsonPath('errors.error_code.0', 'organizer_suspended');
    }

    public function test_admin_charge_and_qr_validate_still_reject_admin_panel_token(): void
    {
        $admin = $this->adminWithPermissions();
        $token = $admin->createToken('t', [SanctumAbility::AdminPanel->value])->plainTextToken;

        $event = Event::factory()->create(['monetized' => true]);
        $participation = Participation::factory()->create([
            'event_id' => $event->id,
            'status' => ParticipationStatus::JOINED,
        ]);

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/payments/charge', [
                'participation_id' => $participation->id,
                'payer_phone' => '615123456',
            ])
            ->assertForbidden()
            ->assertJsonPath('errors.error_code.0', 'action_requires_organizer_scope');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/qr-scan-logs/validate', [
                'token' => 'some-token',
            ])
            ->assertForbidden()
            ->assertJsonPath('errors.error_code.0', 'action_requires_organizer_scope');
    }
}
