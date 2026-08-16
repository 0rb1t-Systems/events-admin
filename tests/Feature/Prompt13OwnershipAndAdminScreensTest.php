<?php

namespace Tests\Feature;

use App\Enums\ParticipationStatus;
use App\Enums\SanctumAbility;
use App\Enums\UserStatus;
use App\Models\Certificate;
use App\Models\Event;
use App\Models\EventFeedback;
use App\Models\EventInvitationTemplate;
use App\Models\Participation;
use App\Models\User;
use App\Services\CertificateIssuanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Prompt13OwnershipAndAdminScreensTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'view payments',
            'manage payments',
            'view qr scan logs',
            'manage qr scans',
            'view certificates',
            'reissue certificates',
            'view event feedback',
            'moderate feedback',
            'view invitation templates',
            'view events',
        ] as $name) {
            Permission::findOrCreate($name, 'web');
        }

        $role = Role::findOrCreate('admin', 'web');
        $role->syncPermissions(Permission::all());

        $this->admin = User::factory()->admin()->create([
            'status' => UserStatus::ACTIVE,
        ]);
        $this->admin->assignRole($role);
    }

    private function auth()
    {
        $token = $this->admin->createToken('t', [SanctumAbility::AdminPanel->value])->plainTextToken;

        return $this->withHeader('Authorization', 'Bearer '.$token);
    }

    public function test_charge_blocked_for_admin_panel_token(): void
    {
        $event = Event::factory()->create(['monetized' => true]);
        $participation = Participation::factory()->create([
            'event_id' => $event->id,
            'status' => ParticipationStatus::JOINED,
        ]);

        $response = $this->auth()->postJson('/api/v1/payments/charge', [
            'participation_id' => $participation->id,
            'payer_phone' => '615123456',
        ]);

        $response->assertForbidden();
        $response->assertJsonPath('errors.error_code.0', 'action_requires_organizer_scope');
    }

    public function test_manual_payment_blocked_for_admin_panel_token(): void
    {
        $participation = Participation::factory()->create([
            'status' => ParticipationStatus::JOINED,
        ]);

        $response = $this->auth()->postJson('/api/v1/payments/manual', [
            'participation_id' => $participation->id,
        ]);

        $response->assertForbidden();
        $response->assertJsonPath('errors.error_code.0', 'action_requires_organizer_scope');
    }

    public function test_qr_validate_blocked_for_admin_panel_token(): void
    {
        $response = $this->auth()->postJson('/api/v1/qr-scan-logs/validate', [
            'token' => 'some-token',
        ]);

        $response->assertForbidden();
        $response->assertJsonPath('errors.error_code.0', 'action_requires_organizer_scope');
    }

    public function test_certificate_reissue_requires_checked_in(): void
    {
        $participation = Participation::factory()->create([
            'status' => ParticipationStatus::JOINED,
        ]);

        $response = $this->auth()->postJson(
            "/api/v1/certificates/{$participation->id}/reissue"
        );

        $response->assertStatus(400);
        $response->assertJsonPath('errors.error_code.0', 'certificate_requires_checked_in_status');
    }

    public function test_certificate_reissue_succeeds_for_checked_in(): void
    {
        $participation = Participation::factory()->create([
            'status' => ParticipationStatus::CHECKED_IN,
        ]);
        $existing = Certificate::factory()->create([
            'participation_id' => $participation->id,
            'issued_at' => now()->subDay(),
        ]);

        $response = $this->auth()->postJson(
            "/api/v1/certificates/{$participation->id}/reissue"
        );

        $response->assertOk();
        $this->assertDatabaseHas('certificates', [
            'id' => $existing->id,
            'participation_id' => $participation->id,
        ]);
        $this->assertTrue(
            $existing->fresh()->issued_at->gt(now()->subMinute())
        );
    }

    public function test_certificate_reissue_fails_safely_keeping_old_row(): void
    {
        $participation = Participation::factory()->create([
            'status' => ParticipationStatus::CHECKED_IN,
        ]);
        $existing = Certificate::factory()->create([
            'participation_id' => $participation->id,
            'file_path' => 'certificates/old.pdf',
        ]);

        $service = new class extends CertificateIssuanceService
        {
            protected function generateCertificatePayload(Participation $participation): array
            {
                throw new \RuntimeException('disk write failed');
            }
        };

        try {
            $service->reissueForParticipation($participation);
            $this->fail('Expected RuntimeException');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('Certificate re-issue failed', $e->getMessage());
        }

        $this->assertDatabaseHas('certificates', [
            'id' => $existing->id,
            'file_path' => 'certificates/old.pdf',
        ]);
    }

    public function test_feedback_visibility_toggle_and_list(): void
    {
        $event = Event::factory()->create();
        $participation = Participation::factory()->create([
            'event_id' => $event->id,
            'status' => ParticipationStatus::CHECKED_IN,
        ]);
        $feedback = EventFeedback::factory()->create([
            'participation_id' => $participation->id,
            'rating' => 4,
            'comment' => 'Nice event',
            'hidden' => false,
        ]);

        $list = $this->auth()->getJson('/api/v1/feedback');
        $list->assertOk();
        $this->assertGreaterThanOrEqual(1, count($list->json('data')));

        $hide = $this->auth()->patchJson("/api/v1/feedback/{$feedback->id}/visibility", [
            'hidden' => true,
        ]);
        $hide->assertOk();
        $hide->assertJsonPath('data.hidden', true);

        $eventFeedback = $this->auth()->getJson("/api/v1/events/{$event->id}/feedback");
        $eventFeedback->assertOk();
        $eventFeedback->assertJsonPath('data.hidden_count', 1);
        $eventFeedback->assertJsonPath('data.feedback_count', 1);
    }

    public function test_invitation_template_preview_endpoint(): void
    {
        $event = Event::factory()->create();

        $empty = $this->auth()->getJson("/api/v1/events/{$event->id}/invitation-template");
        $empty->assertOk();
        $empty->assertJsonPath('data.template', null);

        EventInvitationTemplate::factory()->create([
            'event_id' => $event->id,
            'config' => [
                'title' => 'Welcome',
                'primary_color' => '#112233',
                'show_qr' => true,
            ],
        ]);

        $with = $this->auth()->getJson("/api/v1/events/{$event->id}/invitation-template");
        $with->assertOk();
        $with->assertJsonPath('data.template.config.title', 'Welcome');
        $with->assertJsonPath('data.template.config.primary_color', '#112233');
    }
}
