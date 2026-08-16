<?php

namespace Tests\Feature;

use App\Enums\EventStatus;
use App\Enums\ParticipationPaymentStatus;
use App\Enums\ParticipationStatus;
use App\Enums\PaymentStatus;
use App\Enums\SanctumAbility;
use App\Enums\SponsorTier;
use App\Enums\UserStatus;
use App\Models\DiscountCode;
use App\Models\Event;
use App\Models\EventFormField;
use App\Models\EventSponsor;
use App\Models\Participation;
use App\Models\Payment;
use App\Models\TicketType;
use App\Models\User;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Prompt12CategoryATest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'view events',
            'view payments',
            'manage payments',
            'view ticket types',
            'create ticket types',
            'moderate ticket types',
            'view discount codes',
            'create discount codes',
            'edit discount codes',
            'delete discount codes',
            'view participations',
            'manage participations',
            'view event form fields',
            'manage event form fields',
            'view event announcements',
            'manage event announcements',
            'view event sponsors',
            'manage event sponsors',
            'view event speakers',
            'manage event speakers',
            'view event sessions',
            'manage event sessions',
            'view users',
        ] as $name) {
            Permission::create(['name' => $name]);
        }

        $role = Role::create(['name' => 'admin']);
        $role->givePermissionTo(Permission::all());

        $this->admin = User::factory()->admin()->create([
            'email' => 'admin-p12@example.com',
            'password' => 'password',
            'status' => UserStatus::ACTIVE,
        ]);
        $this->admin->assignRole('admin');

        config([
            'waafipay.currency' => 'USD',
            'waafipay.pending_timeout_minutes' => 15,
        ]);
    }

    private function token(): string
    {
        return $this->admin->createToken('t', [SanctumAbility::AdminPanel->value])->plainTextToken;
    }

    private function auth()
    {
        return $this->withHeader('Authorization', 'Bearer '.$this->token());
    }

    // -------------------------------------------------------------------------
    // 1. Users search route
    // -------------------------------------------------------------------------

    public function test_users_search_route_exists(): void
    {
        $response = $this->auth()->getJson('/api/v1/users/search?q=admin');

        // Permission gates work, so 200 expected with our admin user matching
        $response->assertOk();
        $response->assertJsonStructure(['data']);
    }

    // -------------------------------------------------------------------------
    // 2. Participation cancel with reason
    // -------------------------------------------------------------------------

    public function test_participation_cancel_accepts_optional_reason(): void
    {
        $event = Event::factory()->create(['status' => EventStatus::REGISTRATION_OPEN]);
        $user = User::factory()->create();
        $participation = Participation::factory()->create([
            'event_id' => $event->id,
            'user_id' => $user->id,
            'status' => ParticipationStatus::JOINED,
            'payment_status' => ParticipationPaymentStatus::NOT_REQUIRED,
        ]);

        $response = $this->auth()->postJson("/api/v1/participations/{$participation->id}/cancel", [
            'reason' => 'Admin override',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('participations', [
            'id' => $participation->id,
            'status' => ParticipationStatus::CANCELLED->value,
        ]);
    }

    public function test_participation_cancel_works_without_reason(): void
    {
        $event = Event::factory()->create(['status' => EventStatus::REGISTRATION_OPEN]);
        $user = User::factory()->create();
        $participation = Participation::factory()->create([
            'event_id' => $event->id,
            'user_id' => $user->id,
            'status' => ParticipationStatus::JOINED,
            'payment_status' => ParticipationPaymentStatus::NOT_REQUIRED,
        ]);

        $response = $this->auth()->postJson("/api/v1/participations/{$participation->id}/cancel");

        $response->assertOk();
    }

    // -------------------------------------------------------------------------
    // 3. TicketType full update
    // -------------------------------------------------------------------------

    public function test_ticket_type_update_expands_fields(): void
    {
        $event = Event::factory()->create(['monetized' => false]);
        $ticket = TicketType::factory()->create([
            'event_id' => $event->id,
            'name' => 'Standard',
            'price' => 0,
            'quantity_limit' => 100,
            'sales_enabled' => true,
            'sort_order' => 0,
        ]);

        $response = $this->auth()->patchJson("/api/v1/ticket-types/{$ticket->id}", [
            'name' => 'VIP',
            'price' => 50.00,
            'quantity_limit' => 200,
            'sales_enabled' => false,
            'sort_order' => 1,
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('ticket_types', [
            'id' => $ticket->id,
            'name' => 'VIP',
            'sales_enabled' => 0,
            'sort_order' => 1,
        ]);

        // Price change should sync monetized
        $this->assertDatabaseHas('events', ['id' => $event->id, 'monetized' => true]);
    }

    public function test_ticket_type_update_null_quantity_limit(): void
    {
        $event = Event::factory()->create();
        $ticket = TicketType::factory()->create([
            'event_id' => $event->id,
            'quantity_limit' => 50,
        ]);

        $response = $this->auth()->patchJson("/api/v1/ticket-types/{$ticket->id}", [
            'quantity_limit' => null,
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('ticket_types', ['id' => $ticket->id, 'quantity_limit' => null]);
    }

    // -------------------------------------------------------------------------
    // 4. Discount code update + destroy
    // -------------------------------------------------------------------------

    public function test_discount_code_update(): void
    {
        $event = Event::factory()->create();
        $code = DiscountCode::factory()->create([
            'event_id' => $event->id,
            'code' => 'SAVE10',
            'type' => 'fixed',
            'value' => 10,
            'active' => true,
        ]);

        $response = $this->auth()->patchJson("/api/v1/discount-codes/{$code->id}", [
            'value' => 20,
            'active' => false,
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('discount_codes', [
            'id' => $code->id,
            'active' => 0,
        ]);
    }

    public function test_discount_code_destroy_soft_deletes(): void
    {
        $event = Event::factory()->create();
        $code = DiscountCode::factory()->create(['event_id' => $event->id]);

        $response = $this->auth()->deleteJson("/api/v1/discount-codes/{$code->id}");

        $response->assertNoContent();
        $this->assertSoftDeleted('discount_codes', ['id' => $code->id]);
    }

    // -------------------------------------------------------------------------
    // 5. EventFormField update + reorder
    // -------------------------------------------------------------------------

    public function test_form_field_update_label_and_required(): void
    {
        $event = Event::factory()->create();
        $field = EventFormField::factory()->create([
            'event_id' => $event->id,
            'key' => 'phone',
            'label' => 'Phone',
            'type' => 'text',
            'required' => false,
        ]);

        $response = $this->auth()->patchJson("/api/v1/event-form-fields/{$field->id}", [
            'label' => 'Mobile Phone',
            'required' => true,
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('event_form_fields', [
            'id' => $field->id,
            'label' => 'Mobile Phone',
            'required' => true,
            'key' => 'phone', // key must not change
        ]);
    }

    public function test_form_field_reorder(): void
    {
        $event = Event::factory()->create();
        $f1 = EventFormField::factory()->create(['event_id' => $event->id, 'key' => 'name', 'sort_order' => 0]);
        $f2 = EventFormField::factory()->create(['event_id' => $event->id, 'key' => 'email', 'sort_order' => 1]);
        $f3 = EventFormField::factory()->create(['event_id' => $event->id, 'key' => 'phone', 'sort_order' => 2]);

        $response = $this->auth()->postJson('/api/v1/event-form-fields/reorder', [
            'event_id' => $event->id,
            'ordered_ids' => [$f3->id, $f1->id, $f2->id],
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('event_form_fields', ['id' => $f3->id, 'sort_order' => 0]);
        $this->assertDatabaseHas('event_form_fields', ['id' => $f1->id, 'sort_order' => 1]);
        $this->assertDatabaseHas('event_form_fields', ['id' => $f2->id, 'sort_order' => 2]);
    }

    // -------------------------------------------------------------------------
    // 6. Announcement store (Bus::fake to avoid real mail)
    // -------------------------------------------------------------------------

    public function test_store_announcement_creates_record_and_queues_emails(): void
    {
        Bus::fake();

        $event = Event::factory()->create(['status' => EventStatus::REGISTRATION_OPEN]);
        $user = User::factory()->create();
        Participation::factory()->create([
            'event_id' => $event->id,
            'user_id' => $user->id,
            'status' => ParticipationStatus::JOINED,
            'payment_status' => ParticipationPaymentStatus::NOT_REQUIRED,
        ]);

        $response = $this->auth()->postJson("/api/v1/events/{$event->id}/announcements", [
            'subject' => 'Event Update',
            'body' => 'Please note the venue has changed.',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('event_announcements', [
            'event_id' => $event->id,
            'subject' => 'Event Update',
        ]);

        Bus::assertDispatched(\App\Jobs\SendEmailJob::class);
    }

    public function test_cancelled_participants_excluded_from_announcement(): void
    {
        Bus::fake();

        $event = Event::factory()->create();
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        Participation::factory()->create([
            'event_id' => $event->id,
            'user_id' => $userA->id,
            'status' => ParticipationStatus::JOINED,
        ]);
        Participation::factory()->create([
            'event_id' => $event->id,
            'user_id' => $userB->id,
            'status' => ParticipationStatus::CANCELLED,
        ]);

        $this->auth()->postJson("/api/v1/events/{$event->id}/announcements", [
            'subject' => 'Note',
            'body' => 'Body text.',
        ])->assertCreated();

        // Only 1 job dispatched (for userA — not cancelled userB)
        Bus::assertDispatchedTimes(\App\Jobs\SendEmailJob::class, 1);
    }

    // -------------------------------------------------------------------------
    // 7. Sponsors CRUD
    // -------------------------------------------------------------------------

    public function test_sponsor_store_update_destroy(): void
    {
        $event = Event::factory()->create();

        // Store
        $response = $this->auth()->postJson("/api/v1/events/{$event->id}/sponsors", [
            'name' => 'Acme Corp',
            'tier' => SponsorTier::GOLD->value,
            'sort_order' => 0,
        ]);
        $response->assertCreated();
        $sponsorId = $response->json('data.id');

        // Update
        $this->auth()->patchJson("/api/v1/events/{$event->id}/sponsors/{$sponsorId}", [
            'name' => 'Acme Corp Renamed',
        ])->assertOk();

        $this->assertDatabaseHas('event_sponsors', ['id' => $sponsorId, 'name' => 'Acme Corp Renamed']);

        // Destroy
        $this->auth()->deleteJson("/api/v1/events/{$event->id}/sponsors/{$sponsorId}")
            ->assertNoContent();

        $this->assertDatabaseMissing('event_sponsors', ['id' => $sponsorId]);
    }

    // -------------------------------------------------------------------------
    // 8. Manual payment
    // -------------------------------------------------------------------------

    public function test_manual_payment_creates_completed_payment(): void
    {
        $event = Event::factory()->create(['status' => EventStatus::REGISTRATION_OPEN, 'monetized' => true]);
        $ticket = TicketType::factory()->create(['event_id' => $event->id, 'price' => 75]);
        $user = User::factory()->create();
        $participation = Participation::factory()->create([
            'event_id' => $event->id,
            'user_id' => $user->id,
            'ticket_type_id' => $ticket->id,
            'status' => ParticipationStatus::JOINED,
            'payment_status' => ParticipationPaymentStatus::PENDING,
        ]);

        $response = $this->auth()->postJson('/api/v1/payments/manual', [
            'participation_id' => $participation->id,
            'note' => 'Cash payment at venue',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.gateway', 'manual');
        $response->assertJsonPath('data.status', PaymentStatus::COMPLETED->value);

        $this->assertDatabaseHas('payments', [
            'participation_id' => $participation->id,
            'status' => PaymentStatus::COMPLETED->value,
            'gateway' => 'manual',
        ]);

        $this->assertDatabaseHas('participations', [
            'id' => $participation->id,
            'payment_status' => ParticipationPaymentStatus::PAID->value,
        ]);
    }

    public function test_manual_payment_rejects_already_completed(): void
    {
        $event = Event::factory()->create(['monetized' => true]);
        $ticket = TicketType::factory()->create(['event_id' => $event->id, 'price' => 50]);
        $participation = Participation::factory()->create([
            'event_id' => $event->id,
            'ticket_type_id' => $ticket->id,
            'status' => ParticipationStatus::PAID,
            'payment_status' => ParticipationPaymentStatus::PAID,
        ]);
        Payment::factory()->completed()->create([
            'participation_id' => $participation->id,
            'amount' => 50,
        ]);

        $response = $this->auth()->postJson('/api/v1/payments/manual', [
            'participation_id' => $participation->id,
        ]);

        $response->assertStatus(400);
    }

    public function test_manual_payment_service_directly(): void
    {
        $event = Event::factory()->create(['monetized' => false]);
        $user = User::factory()->create();
        $participation = Participation::factory()->create([
            'event_id' => $event->id,
            'user_id' => $user->id,
            'status' => ParticipationStatus::JOINED,
            'payment_status' => ParticipationPaymentStatus::NOT_REQUIRED,
        ]);

        $payment = app(PaymentService::class)->recordManual($participation, 25.00, 'Manual cash');

        $this->assertSame(PaymentStatus::COMPLETED, $payment->status);
        $this->assertSame('manual', $payment->gateway);
        $this->assertStringStartsWith('MANUAL-', $payment->reference_id);
        $this->assertSame(25.00, (float) $payment->amount);
    }

    public function test_manual_payment_rejected_for_cancelled_participation(): void
    {
        $event = Event::factory()->create();
        $participation = Participation::factory()->create([
            'event_id' => $event->id,
            'status' => ParticipationStatus::CANCELLED,
        ]);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('cancelled');

        app(PaymentService::class)->recordManual($participation);
    }
}
