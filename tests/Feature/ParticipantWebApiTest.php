<?php

namespace Tests\Feature;

use App\Enums\EventStatus;
use App\Enums\ParticipationPaymentStatus;
use App\Enums\ParticipationStatus;
use App\Enums\PaymentStatus;
use App\Enums\SanctumAbility;
use App\Enums\UserStatus;
use App\Models\Event;
use App\Models\EventFeedback;
use App\Models\Participation;
use App\Models\Payment;
use App\Models\TicketType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ParticipantWebApiTest extends TestCase
{
    use RefreshDatabase;

    private User $participant;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Role::findOrCreate('admin');

        $this->participant = User::factory()->participant()->create([
            'email' => 'web-participant@example.com',
            'status' => UserStatus::ACTIVE,
        ]);

        $this->admin = User::factory()->admin()->create([
            'email' => 'admin-web-participant@example.com',
            'status' => UserStatus::ACTIVE,
        ]);
        $this->admin->assignRole('admin');

        config([
            'waafipay.base_url' => 'https://waafi.test/asm',
            'waafipay.merchant_uid' => 'm-uid',
            'waafipay.api_user_id' => 'u-id',
            'waafipay.api_key' => 'secret-key-never-log',
            'waafipay.currency' => 'USD',
            'waafipay.http_timeout' => 180,
            'waafipay.pending_timeout_minutes' => 15,
        ]);
    }

    private function participantToken(?User $user = null): string
    {
        $user ??= $this->participant;

        return $user->createToken(
            'web_participant_token',
            [SanctumAbility::WebParticipant->value]
        )->plainTextToken;
    }

    private function adminPanelToken(?User $user = null): string
    {
        $user ??= $this->admin;

        return $user->createToken(
            'admin_auth_token',
            [SanctumAbility::AdminPanel->value]
        )->plainTextToken;
    }

    private function asParticipant(?User $user = null): static
    {
        return $this->withToken($this->participantToken($user));
    }

    private function openEvent(array $attrs = []): Event
    {
        return Event::factory()->create(array_merge([
            'status' => EventStatus::REGISTRATION_OPEN,
            'capacity' => 50,
            'registrations_count' => 0,
            'registration_deadline' => now()->addDays(7),
        ], $attrs));
    }

    public function test_api_key_is_required(): void
    {
        $event = Event::factory()->published()->create();

        $this->withoutApiClientSigning()
            ->getJson("/api/v1/events/{$event->id}")
            ->assertUnauthorized()
            ->assertJsonPath('errors.error_code.0', 'missing_api_key');

        $this->withoutApiClientSigning()
            ->getJson('/api/v1/participant/participations')
            ->assertUnauthorized();
    }

    public function test_admin_panel_token_cannot_use_participant_routes(): void
    {
        $this->withToken($this->adminPanelToken())
            ->getJson('/api/v1/participant/participations')
            ->assertForbidden()
            ->assertJsonPath('errors.error_code.0', 'wrong_ability');
    }

    public function test_admin_user_with_web_participant_token_can_use_participant_routes(): void
    {
        $this->asParticipant($this->admin)
            ->getJson('/api/v1/participant/participations')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'items',
                    'pagination' => ['current_page', 'last_page', 'per_page', 'total'],
                ],
            ]);
    }

    public function test_join_creates_participation_for_authenticated_user(): void
    {
        $event = $this->openEvent();
        $ticket = TicketType::factory()->free()->create(['event_id' => $event->id]);

        $response = $this->asParticipant()
            ->postJson('/api/v1/participant/participations', [
                'event_id' => $event->id,
                'ticket_type_id' => $ticket->id,
                'user_id' => 999999,
                'status' => ParticipationStatus::CHECKED_IN->value,
                'payment_status' => ParticipationPaymentStatus::PAID->value,
                'qr_token' => 'forged-token',
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.user_id', $this->participant->id)
            ->assertJsonPath('data.event_id', $event->id)
            ->assertJsonPath('data.status', ParticipationStatus::JOINED->value);

        $this->assertNotSame('forged-token', $response->json('data.qr_token'));

        $this->assertDatabaseHas('participations', [
            'user_id' => $this->participant->id,
            'event_id' => $event->id,
            'status' => ParticipationStatus::JOINED->value,
        ]);
    }

    public function test_cannot_view_pay_or_feedback_another_users_participation(): void
    {
        $event = $this->openEvent();
        $other = User::factory()->participant()->create();
        $foreign = Participation::factory()->create([
            'user_id' => $other->id,
            'event_id' => $event->id,
            'status' => ParticipationStatus::JOINED,
            'payment_status' => ParticipationPaymentStatus::PENDING,
        ]);

        $this->asParticipant()
            ->getJson("/api/v1/participant/participations/{$foreign->id}")
            ->assertNotFound();

        $this->asParticipant()
            ->postJson("/api/v1/participant/participations/{$foreign->id}/cancel")
            ->assertNotFound();

        $this->asParticipant()
            ->getJson("/api/v1/participant/participations/{$foreign->id}/feedback")
            ->assertNotFound();

        $this->asParticipant()
            ->postJson('/api/v1/participant/event-feedback', [
                'participation_id' => $foreign->id,
                'rating' => 5,
            ])
            ->assertNotFound();

        $this->asParticipant()
            ->postJson('/api/v1/participant/payments/charge', [
                'participation_id' => $foreign->id,
                'payer_phone' => '0612345678',
            ])
            ->assertNotFound();
    }

    public function test_cancel_own_participation(): void
    {
        $event = $this->openEvent();
        $participation = Participation::factory()->create([
            'user_id' => $this->participant->id,
            'event_id' => $event->id,
            'status' => ParticipationStatus::JOINED,
        ]);

        $this->asParticipant()
            ->postJson("/api/v1/participant/participations/{$participation->id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', ParticipationStatus::CANCELLED->value);

        $this->assertSame(ParticipationStatus::CANCELLED, $participation->fresh()->status);
    }

    public function test_form_fields_endpoint_removed(): void
    {
        $event = Event::factory()->published()->create();

        $this->getJson("/api/v1/events/{$event->id}/form-fields")
            ->assertNotFound();
    }

    public function test_join_ignores_legacy_custom_field_answers(): void
    {
        $event = $this->openEvent();

        $this->asParticipant()
            ->postJson('/api/v1/participant/participations', [
                'event_id' => $event->id,
                'custom_field_answers' => ['company' => 'Acme'],
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', ParticipationStatus::JOINED->value);

        $participation = Participation::query()->where('event_id', $event->id)->first();
        $this->assertNull($participation->custom_field_answers);
    }

    public function test_charge_own_paid_ticket_participation_succeeds(): void
    {
        Http::fake([
            'https://waafi.test/asm' => Http::response([
                'responseCode' => '2001',
                'responseMsg' => 'success',
                'params' => [
                    'state' => 'approved',
                    'transactionId' => 'W-TX-WEB-1',
                    'issuerTransactionId' => 'I-TX-WEB-1',
                ],
            ], 200),
        ]);

        $event = $this->openEvent(['monetized' => true]);
        $ticket = TicketType::factory()->paid(25)->create([
            'event_id' => $event->id,
            'quantity_limit' => null,
            'quantity_sold' => 1,
            'sales_enabled' => true,
        ]);
        $participation = Participation::factory()->create([
            'user_id' => $this->participant->id,
            'event_id' => $event->id,
            'ticket_type_id' => $ticket->id,
            'status' => ParticipationStatus::JOINED,
            'payment_status' => ParticipationPaymentStatus::PENDING,
        ]);

        $this->asParticipant()
            ->postJson('/api/v1/participant/payments/charge', [
                'participation_id' => $participation->id,
                'payer_phone' => '0612345678',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', PaymentStatus::COMPLETED->value);

        $this->assertSame(ParticipationPaymentStatus::PAID, $participation->fresh()->payment_status);
    }

    public function test_charge_already_paid_is_blocked(): void
    {
        $event = $this->openEvent(['monetized' => true]);
        $ticket = TicketType::factory()->paid(10)->create(['event_id' => $event->id]);
        $participation = Participation::factory()->create([
            'user_id' => $this->participant->id,
            'event_id' => $event->id,
            'ticket_type_id' => $ticket->id,
            'status' => ParticipationStatus::PAID,
            'payment_status' => ParticipationPaymentStatus::PAID,
        ]);
        Payment::factory()->completed()->create([
            'participation_id' => $participation->id,
            'ticket_type_id' => $ticket->id,
            'amount' => 10,
        ]);

        $this->asParticipant()
            ->postJson('/api/v1/participant/payments/charge', [
                'participation_id' => $participation->id,
                'payer_phone' => '0612345678',
            ])
            ->assertStatus(400);
    }

    public function test_charge_waafi_failure_does_not_mark_paid(): void
    {
        Http::fake([
            'https://waafi.test/asm' => Http::response([
                'responseCode' => '5001',
                'responseMsg' => 'RCS_USER_REJECTED',
                'params' => ['state' => 'failed'],
            ], 200),
        ]);

        $event = $this->openEvent(['monetized' => true]);
        $ticket = TicketType::factory()->paid(15)->create([
            'event_id' => $event->id,
            'quantity_limit' => null,
            'sales_enabled' => true,
        ]);
        $participation = Participation::factory()->create([
            'user_id' => $this->participant->id,
            'event_id' => $event->id,
            'ticket_type_id' => $ticket->id,
            'status' => ParticipationStatus::JOINED,
            'payment_status' => ParticipationPaymentStatus::PENDING,
        ]);

        $this->asParticipant()
            ->postJson('/api/v1/participant/payments/charge', [
                'participation_id' => $participation->id,
                'payer_phone' => '612345678',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', PaymentStatus::FAILED->value);

        $this->assertSame(ParticipationPaymentStatus::FAILED, $participation->fresh()->payment_status);
        $this->assertNotSame(ParticipationStatus::PAID, $participation->fresh()->status);
    }

    public function test_own_hidden_feedback_is_visible_to_participant(): void
    {
        $event = $this->openEvent();
        $participation = Participation::factory()->create([
            'user_id' => $this->participant->id,
            'event_id' => $event->id,
            'status' => ParticipationStatus::CHECKED_IN,
        ]);
        $feedback = EventFeedback::factory()->create([
            'participation_id' => $participation->id,
            'rating' => 4,
            'hidden' => true,
        ]);

        $this->asParticipant()
            ->getJson("/api/v1/participant/participations/{$participation->id}/feedback")
            ->assertOk()
            ->assertJsonPath('data.id', $feedback->id)
            ->assertJsonPath('data.hidden', true);
    }

    public function test_invitation_returns_null_config_when_no_template(): void
    {
        $event = $this->openEvent();
        $participation = Participation::factory()->create([
            'user_id' => $this->participant->id,
            'event_id' => $event->id,
            'status' => ParticipationStatus::JOINED,
            'qr_token' => 'qr-abc',
        ]);

        $this->asParticipant()
            ->getJson("/api/v1/participant/participations/{$participation->id}/invitation")
            ->assertOk()
            ->assertJsonPath('data.invitation', null)
            ->assertJsonPath('data.qr_token', 'qr-abc')
            ->assertJsonPath('data.canvas.width', 800)
            ->assertJsonPath('data.canvas.height', 1100);
    }
}
