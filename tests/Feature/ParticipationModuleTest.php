<?php

namespace Tests\Feature;

use App\Enums\EventStatus;
use App\Enums\ParticipationStatus;
use App\Enums\SanctumAbility;
use App\Enums\UserStatus;
use App\Models\Event;
use App\Models\Participation;
use App\Models\TicketType;
use App\Models\User;
use App\Services\ParticipationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ParticipationModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private ParticipationService $service;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'view events',
            'view participations',
            'manage participations',
            'view dashboard',
        ] as $name) {
            Permission::create(['name' => $name]);
        }

        $role = Role::create(['name' => 'admin']);
        $role->givePermissionTo(Permission::all());

        $this->admin = User::factory()->admin()->create([
            'email' => 'admin-part@example.com',
            'password' => 'password',
            'status' => UserStatus::ACTIVE,
        ]);
        $this->admin->assignRole('admin');

        $this->service = app(ParticipationService::class);
    }

    private function adminToken(): string
    {
        return $this->admin->createToken(
            'admin_auth_token',
            [SanctumAbility::AdminPanel->value]
        )->plainTextToken;
    }

    private function openEvent(array $attrs = []): Event
    {
        return Event::factory()->create(array_merge([
            'status' => EventStatus::REGISTRATION_OPEN,
            'capacity' => 2,
            'registrations_count' => 0,
            'registration_deadline' => now()->addDays(7),
        ], $attrs));
    }

    public function test_unique_index_excludes_cancelled_participations(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'sqlite') {
            $indexes = DB::select("SELECT sql FROM sqlite_master WHERE type = 'index' AND name = 'participations_user_event_active_unique'");
            $this->assertNotEmpty($indexes);
            $this->assertStringContainsString("status != 'cancelled'", $indexes[0]->sql);
        } else {
            $this->assertTrue(
                Schema::hasColumn('participations', 'active_user_event_key'),
                'MySQL must use generated active_user_event_key for partial unique'
            );
        }

        $event = $this->openEvent();
        $user = User::factory()->create();

        Participation::factory()->create([
            'user_id' => $user->id,
            'event_id' => $event->id,
            'status' => ParticipationStatus::CANCELLED,
        ]);

        // Non-cancelled can be created after cancelled
        $joined = $this->service->join($event, $user);
        $this->assertSame(ParticipationStatus::JOINED, $joined->status);

        // Second active join must fail
        $this->expectException(\InvalidArgumentException::class);
        $this->service->join($event, $user);
    }

    public function test_join_and_ticket_claim_share_same_transaction(): void
    {
        $event = $this->openEvent(['capacity' => 10]);
        $ticket = TicketType::factory()->create([
            'event_id' => $event->id,
            'quantity_limit' => 1,
            'quantity_sold' => 0,
            'sales_enabled' => true,
            'price' => 10,
        ]);
        $user = User::factory()->create();

        $p = $this->service->join($event, $user, $ticket->id);

        $this->assertSame(ParticipationStatus::JOINED, $p->status);
        $this->assertSame(1, $ticket->fresh()->quantity_sold);
        $this->assertSame(1, $event->fresh()->registrations_count);
        $this->assertSame(1, $event->fresh()->registered_count);
        $this->assertSame(9, $event->fresh()->seats_remaining);
    }

    public function test_failed_unique_does_not_leave_orphaned_ticket_claim(): void
    {
        $event = $this->openEvent(['capacity' => 10]);
        $ticket = TicketType::factory()->create([
            'event_id' => $event->id,
            'quantity_limit' => 5,
            'quantity_sold' => 0,
            'price' => 0,
        ]);
        $user = User::factory()->create();

        $this->service->join($event, $user, $ticket->id);
        $this->assertSame(1, $ticket->fresh()->quantity_sold);

        try {
            $this->service->join($event, $user, $ticket->id);
            $this->fail('Expected duplicate join to throw');
        } catch (\InvalidArgumentException $e) {
            // expected — duplicate caught before second claim
        }

        // Still only one claim
        $this->assertSame(1, $ticket->fresh()->quantity_sold);
    }

    public function test_transaction_rolls_back_claim_when_insert_fails(): void
    {
        $event = $this->openEvent(['capacity' => 10]);
        $ticket = TicketType::factory()->create([
            'event_id' => $event->id,
            'quantity_limit' => 5,
            'quantity_sold' => 0,
        ]);
        $user = User::factory()->create();

        try {
            DB::transaction(function () use ($event, $user, $ticket) {
                $claimed = TicketType::claimQuantityAtomically($ticket->id, 1);
                $this->assertTrue($claimed);

                Participation::create([
                    'user_id' => $user->id,
                    'event_id' => $event->id,
                    'ticket_type_id' => $ticket->id,
                    'status' => ParticipationStatus::JOINED,
                    'payment_status' => 'not_required',
                ]);

                // Simulate failure after claim+insert pattern mid-flight
                throw new \RuntimeException('simulated failure after claim');
            });
        } catch (\RuntimeException $e) {
            $this->assertSame('simulated failure after claim', $e->getMessage());
        }

        // Claim rolled back with the transaction
        $this->assertSame(0, $ticket->fresh()->quantity_sold);
        $this->assertSame(0, Participation::where('event_id', $event->id)->count());
    }

    public function test_capacity_full_creates_waitlisted_without_ticket_claim(): void
    {
        $event = $this->openEvent(['capacity' => 1]);
        $ticket = TicketType::factory()->create([
            'event_id' => $event->id,
            'quantity_limit' => 100,
            'quantity_sold' => 0,
        ]);

        $u1 = User::factory()->create();
        $u2 = User::factory()->create();

        $first = $this->service->join($event, $u1, $ticket->id);
        $this->assertSame(ParticipationStatus::JOINED, $first->status);
        $this->assertSame(1, $ticket->fresh()->quantity_sold);

        $second = $this->service->join($event, $u2, $ticket->id);
        $this->assertSame(ParticipationStatus::WAITLISTED, $second->status);
        // Waitlist does not claim ticket inventory
        $this->assertSame(1, $ticket->fresh()->quantity_sold);
        $this->assertSame(1, $event->fresh()->waitlisted_count);
    }

    public function test_promote_from_waitlist_claims_ticket_atomically(): void
    {
        $event = $this->openEvent(['capacity' => 1]);
        $ticket = TicketType::factory()->create([
            'event_id' => $event->id,
            'quantity_limit' => 10,
            'quantity_sold' => 0,
        ]);
        $u1 = User::factory()->create();
        $u2 = User::factory()->create();

        $this->service->join($event, $u1, $ticket->id);
        $waitlisted = $this->service->join($event, $u2, $ticket->id);
        $this->assertSame(ParticipationStatus::WAITLISTED, $waitlisted->status);

        $this->service->cancel(Participation::where('user_id', $u1->id)->first());
        $this->assertSame(0, $ticket->fresh()->quantity_sold);

        $promoted = $this->service->promoteFromWaitlist($waitlisted->fresh());
        $this->assertSame(ParticipationStatus::JOINED, $promoted->status);
        $this->assertSame(1, $ticket->fresh()->quantity_sold);
    }

    public function test_ticket_quantity_race_only_one_claim_succeeds(): void
    {
        $ticket = TicketType::factory()->create([
            'quantity_limit' => 1,
            'quantity_sold' => 0,
            'sales_enabled' => true,
        ]);

        $wins = 0;
        // Sequential simulation of lost race (same conditional UPDATE)
        if (TicketType::claimQuantityAtomically($ticket->id)) {
            $wins++;
        }
        if (TicketType::claimQuantityAtomically($ticket->id)) {
            $wins++;
        }

        $this->assertSame(1, $wins);
        $this->assertSame(1, $ticket->fresh()->quantity_sold);
    }

    public function test_admin_api_lists_and_promotes(): void
    {
        $event = $this->openEvent(['capacity' => 1]);
        $u1 = User::factory()->create();
        $u2 = User::factory()->create();
        $token = $this->adminToken();

        $this->withToken($token)
            ->postJson('/api/v1/participations', [
                'event_id' => $event->id,
                'user_id' => $u1->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'joined');

        $wait = $this->withToken($token)
            ->postJson('/api/v1/participations', [
                'event_id' => $event->id,
                'user_id' => $u2->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'waitlisted');

        $this->withToken($token)
            ->getJson("/api/v1/events/{$event->id}/participations")
            ->assertOk()
            ->assertJsonPath('data.capacity.registered_count', 1)
            ->assertJsonPath('data.capacity.waitlisted_count', 1);

        $this->service->cancel(Participation::where('user_id', $u1->id)->first());

        $this->withToken($token)
            ->postJson('/api/v1/participations/'.$wait->json('data.id').'/promote')
            ->assertOk()
            ->assertJsonPath('data.status', 'joined');
    }
}
