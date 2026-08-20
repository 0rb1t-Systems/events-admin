<?php

namespace Tests\Feature;

use App\Enums\SanctumAbility;
use App\Enums\UserStatus;
use App\Models\DiscountCode;
use App\Models\Event;
use App\Models\TicketType;
use App\Models\User;
use App\Services\EventMonetization;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class TicketTypeModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'view events',
            'edit events',
            'create events',
            'view ticket types',
            'create ticket types',
            'moderate ticket types',
            'view discount codes',
            'create discount codes',
            'view dashboard',
        ] as $name) {
            Permission::create(['name' => $name]);
        }

        $role = Role::create(['name' => 'admin']);
        $role->givePermissionTo(Permission::all());

        $this->admin = User::factory()->admin()->create([
            'email' => 'admin-tickets@example.com',
            'password' => 'password',
            'status' => UserStatus::ACTIVE,
        ]);
        $this->admin->assignRole('admin');
    }

    private function adminToken(): string
    {
        return $this->admin->createToken(
            'admin_auth_token',
            [SanctumAbility::AdminPanel->value]
        )->plainTextToken;
    }

    public function test_paid_ticket_type_syncs_event_monetized_flag(): void
    {
        $event = Event::factory()->create(['monetized' => false]);
        $token = $this->adminToken();

        $this->withToken($token)
            ->postJson('/api/v1/ticket-types', [
                'event_id' => $event->id,
                'name' => 'VIP',
                'price' => 99.5,
                'quantity_limit' => 50,
            ])
            ->assertCreated();

        $this->assertTrue($event->fresh()->monetized);
        $this->assertTrue(EventMonetization::hasPaidTicketTypes($event->fresh()));
    }

    public function test_cannot_force_monetized_false_while_paid_tickets_exist(): void
    {
        $event = Event::factory()->create(['monetized' => false]);
        TicketType::factory()->paid(20)->create(['event_id' => $event->id]);
        EventMonetization::syncMonetized($event);

        $this->withToken($this->adminToken())
            ->patchJson("/api/v1/events/{$event->id}", ['monetized' => false])
            ->assertStatus(400);

        $this->assertTrue($event->fresh()->monetized);
    }

    public function test_quantity_sold_is_stored_counter_and_atomic_claim_works(): void
    {
        $type = TicketType::factory()->create([
            'quantity_limit' => 2,
            'quantity_sold' => 0,
            'sales_enabled' => true,
        ]);

        $this->assertTrue(TicketType::claimQuantityAtomically($type->id, 1));
        $this->assertSame(1, $type->fresh()->quantity_sold);

        $this->assertTrue(TicketType::claimQuantityAtomically($type->id, 1));
        $this->assertSame(2, $type->fresh()->quantity_sold);

        // Over limit — race-safe rejection
        $this->assertFalse(TicketType::claimQuantityAtomically($type->id, 1));
        $this->assertSame(2, $type->fresh()->quantity_sold);

        $this->assertTrue(TicketType::releaseQuantityAtomically($type->id, 1));
        $this->assertSame(1, $type->fresh()->quantity_sold);
    }

    public function test_atomic_claim_respects_sales_disabled(): void
    {
        $type = TicketType::factory()->create([
            'quantity_limit' => 10,
            'quantity_sold' => 0,
            'sales_enabled' => false,
        ]);

        $this->assertFalse(TicketType::claimQuantityAtomically($type->id));
        $this->assertSame(0, $type->fresh()->quantity_sold);
    }

    public function test_force_delete_blocked_when_ticket_type_has_sales(): void
    {
        $type = TicketType::factory()->withSales(3)->create();
        $type->delete();

        $this->withToken($this->adminToken())
            ->deleteJson("/api/v1/ticket-types/{$type->id}/force")
            ->assertForbidden();

        $this->assertDatabaseHas('ticket_types', ['id' => $type->id]);
    }

    public function test_soft_delete_allowed_with_sales(): void
    {
        $type = TicketType::factory()->withSales(2)->create();

        $this->withToken($this->adminToken())
            ->deleteJson("/api/v1/ticket-types/{$type->id}")
            ->assertNoContent();

        $this->assertSoftDeleted('ticket_types', ['id' => $type->id]);
    }

    public function test_admin_can_disable_sales(): void
    {
        $type = TicketType::factory()->create(['sales_enabled' => true]);

        $this->withToken($this->adminToken())
            ->postJson("/api/v1/ticket-types/{$type->id}/disable-sales")
            ->assertOk()
            ->assertJsonPath('data.sales_enabled', false);
    }

    public function test_event_scoped_discount_not_usable_on_another_event(): void
    {
        $eventA = Event::factory()->create();
        $eventB = Event::factory()->create();

        DiscountCode::factory()->forEvent($eventA)->create(['code' => 'SAVE10']);

        $token = $this->adminToken();

        $this->withToken($token)
            ->postJson("/api/v1/events/{$eventA->id}/discount-codes/validate", [
                'code' => 'SAVE10',
            ])
            ->assertOk();

        // Same code string must NOT apply to event B (query scoped by event_id)
        $this->withToken($token)
            ->postJson("/api/v1/events/{$eventB->id}/discount-codes/validate", [
                'code' => 'SAVE10',
            ])
            ->assertNotFound();
    }

    public function test_organizer_wide_code_usable_on_same_organizer_events_only(): void
    {
        $eventA = Event::factory()->create();
        $eventB = Event::factory()->create([
            'organizer_id' => $eventA->organizer_id,
        ]);
        $eventOtherOrg = Event::factory()->create();

        DiscountCode::factory()->organizerWide($eventA->organizer_id)->create([
            'code' => 'ORG20',
        ]);

        $token = $this->adminToken();

        $this->withToken($token)
            ->postJson("/api/v1/events/{$eventA->id}/discount-codes/validate", ['code' => 'ORG20'])
            ->assertOk();

        $this->withToken($token)
            ->postJson("/api/v1/events/{$eventB->id}/discount-codes/validate", ['code' => 'ORG20'])
            ->assertOk();

        $this->withToken($token)
            ->postJson("/api/v1/events/{$eventOtherOrg->id}/discount-codes/validate", ['code' => 'ORG20'])
            ->assertNotFound();
    }

    public function test_ticket_types_listed_on_event_oversight_endpoint(): void
    {
        $event = Event::factory()->create();
        TicketType::factory()->paid()->create(['event_id' => $event->id, 'name' => 'Standard']);

        $this->withToken($this->adminToken())
            ->getJson("/api/v1/events/{$event->id}/ticket-types")
            ->assertOk()
            ->assertJsonPath('data.ticket_types.0.name', 'Standard');
    }

    public function test_is_vip_is_independent_of_name_and_defaults_false(): void
    {
        $event = Event::factory()->create();
        $token = $this->adminToken();

        $namedVip = $this->withToken($token)
            ->postJson('/api/v1/ticket-types', [
                'event_id' => $event->id,
                'name' => 'VIP',
                'price' => 50,
            ])
            ->assertCreated();

        $this->assertFalse($namedVip->json('data.is_vip'));

        $generalVip = $this->withToken($token)
            ->postJson('/api/v1/ticket-types', [
                'event_id' => $event->id,
                'name' => 'General Admission',
                'price' => 25,
                'is_vip' => true,
            ])
            ->assertCreated();

        $this->assertTrue($generalVip->json('data.is_vip'));
        $this->assertSame('General Admission', $generalVip->json('data.name'));

        $id = $namedVip->json('data.id');
        $this->withToken($token)
            ->patchJson("/api/v1/ticket-types/{$id}", [
                'is_vip' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.is_vip', true)
            ->assertJsonPath('data.name', 'VIP');
    }
}
