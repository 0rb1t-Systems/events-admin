<?php

namespace Tests\Feature;

use App\Enums\EventStatus;
use App\Enums\PackageStatus;
use App\Enums\SanctumAbility;
use App\Enums\SubscriptionStatus;
use App\Enums\UserStatus;
use App\Models\Event;
use App\Models\EventCategory;
use App\Models\EventImage;
use App\Models\Organizer;
use App\Models\OrganizerSubscription;
use App\Models\Package;
use App\Models\User;
use App\Services\EventRegistrationGate;
use App\Services\EventStatusMachine;
use App\Services\ParticipationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class EventModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private EventStatusMachine $machine;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'view events',
            'create events',
            'edit events',
            'delete events',
            'view event categories',
            'create event categories',
            'edit event categories',
            'delete event categories',
            'view trash items',
            'view dashboard',
        ] as $name) {
            Permission::create(['name' => $name]);
        }

        $role = Role::create(['name' => 'admin']);
        $role->givePermissionTo(Permission::all());

        $this->admin = User::factory()->admin()->create([
            'email' => 'admin-events@example.com',
            'password' => 'password',
            'status' => UserStatus::ACTIVE,
        ]);
        $this->admin->assignRole('admin');

        $this->machine = app(EventStatusMachine::class);
    }

    private function adminToken(): string
    {
        return $this->admin->createToken(
            'admin_auth_token',
            [SanctumAbility::AdminPanel->value]
        )->plainTextToken;
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

    public function test_transition_table_allows_documented_paths_and_rejects_invalid(): void
    {
        $this->assertTrue($this->machine->canTransition(EventStatus::DRAFT, EventStatus::PUBLISHED));
        $this->assertTrue($this->machine->canTransition(EventStatus::DRAFT, EventStatus::CANCELLED));
        $this->assertFalse($this->machine->canTransition(EventStatus::DRAFT, EventStatus::COMPLETED));
        $this->assertFalse($this->machine->canTransition(EventStatus::COMPLETED, EventStatus::CANCELLED));
        $this->assertFalse($this->machine->canTransition(EventStatus::CANCELLED, EventStatus::DRAFT));

        $event = Event::factory()->create(['status' => EventStatus::DRAFT]);

        $this->withToken($this->adminToken())
            ->postJson("/api/v1/events/{$event->id}/transition", ['status' => 'completed'])
            ->assertStatus(400)
            ->assertJsonPath('errors.error_code.0', 'invalid_status_transition');

        $this->withToken($this->adminToken())
            ->postJson("/api/v1/events/{$event->id}/transition", ['status' => 'published'])
            ->assertOk()
            ->assertJsonPath('data.status', 'published');
    }

    public function test_happy_path_workflow_transitions(): void
    {
        $event = Event::factory()->create(['status' => EventStatus::DRAFT]);
        $token = $this->adminToken();

        foreach (['published', 'registration_open', 'sold_out', 'registration_closed', 'ongoing', 'completed'] as $status) {
            $this->withToken($token)
                ->postJson("/api/v1/events/{$event->id}/transition", ['status' => $status])
                ->assertOk()
                ->assertJsonPath('data.status', $status);
        }
    }

    public function test_cancelled_reachable_from_most_but_not_completed(): void
    {
        foreach ([
            EventStatus::DRAFT,
            EventStatus::PUBLISHED,
            EventStatus::REGISTRATION_OPEN,
            EventStatus::SOLD_OUT,
            EventStatus::REGISTRATION_CLOSED,
            EventStatus::ONGOING,
        ] as $from) {
            $event = Event::factory()->create(['status' => $from]);
            $this->assertTrue(
                $this->machine->canTransition($from, EventStatus::CANCELLED),
                "cancelled should be reachable from {$from->value}"
            );
        }

        $this->assertFalse(
            $this->machine->canTransition(EventStatus::COMPLETED, EventStatus::CANCELLED)
        );
    }

    public function test_deadline_gate_blocks_independently_of_capacity(): void
    {
        $event = Event::factory()->registrationOpen()->unlimitedCapacity()->create([
            'registrations_count' => 0,
            'registration_deadline' => now()->subHour(),
        ]);

        // Gate A: capacity NOT reached
        $this->assertFalse(EventRegistrationGate::isCapacityReached($event));
        // Gate B: deadline PASSED (independent)
        $this->assertTrue(EventRegistrationGate::isRegistrationDeadlinePassed($event));

        $eval = EventRegistrationGate::evaluate($event);
        $this->assertFalse($eval['allowed']);
        $this->assertSame('registration_deadline_passed', $eval['reason']);
        $this->assertFalse($eval['capacity_reached']);
        $this->assertTrue($eval['deadline_passed']);
    }

    public function test_capacity_gate_triggers_sold_out_independently_of_deadline(): void
    {
        $event = Event::factory()->registrationOpen()->create([
            'capacity' => 2,
            'registration_deadline' => now()->addDays(5),
        ]);
        app(ParticipationService::class)->join($event, User::factory()->create());
        app(ParticipationService::class)->join($event, User::factory()->create());
        $event = $event->fresh();

        // Gate B: deadline NOT passed
        $this->assertFalse(EventRegistrationGate::isRegistrationDeadlinePassed($event));
        // Gate A: capacity reached (independent)
        $this->assertTrue(EventRegistrationGate::isCapacityReached($event));

        $synced = $this->machine->syncSoldOutFromCapacity($event);
        $this->assertSame(EventStatus::SOLD_OUT, $synced->status);

        // Deadline still not passed after sold_out
        $this->assertFalse(EventRegistrationGate::isRegistrationDeadlinePassed($synced));
    }

    public function test_capacity_null_unlimited_distinct_from_zero(): void
    {
        $unlimited = Event::factory()->registrationOpen()->unlimitedCapacity()->create([
            'registrations_count' => 999,
            'registration_deadline' => now()->addDay(),
        ]);
        $this->assertFalse(EventRegistrationGate::isCapacityReached($unlimited));
        $this->assertTrue(EventRegistrationGate::canAcceptRegistration($unlimited));

        $zero = Event::factory()->registrationOpen()->zeroCapacity()->create([
            'registrations_count' => 0,
            'registration_deadline' => now()->addDay(),
        ]);
        $this->assertTrue(EventRegistrationGate::isCapacityReached($zero));
        $this->assertFalse(EventRegistrationGate::canAcceptRegistration($zero));
    }

    public function test_lat_long_must_be_provided_as_pair(): void
    {
        $organizer = $this->organizerWithQuota();
        $cat = EventCategory::factory()->create();

        $this->withToken($this->adminToken())
            ->postJson('/api/v1/events', [
                'organizer_id' => $organizer->id,
                'event_category_id' => $cat->id,
                'title' => 'Coords test',
                'latitude' => 1.23,
            ])
            ->assertStatus(400);

        $this->withToken($this->adminToken())
            ->postJson('/api/v1/events', [
                'organizer_id' => $organizer->id,
                'event_category_id' => $cat->id,
                'title' => 'Coords ok',
                'latitude' => 1.23,
                'longitude' => 4.56,
            ])
            ->assertCreated();
    }

    public function test_event_quota_blocks_create_when_zero_or_exhausted(): void
    {
        $organizer = $this->organizerWithQuota(0);
        $cat = EventCategory::factory()->create();

        $this->withToken($this->adminToken())
            ->postJson('/api/v1/events', [
                'organizer_id' => $organizer->id,
                'event_category_id' => $cat->id,
                'title' => 'Blocked',
            ])
            ->assertForbidden();
    }

    public function test_cancelled_event_cannot_be_force_deleted(): void
    {
        $event = Event::factory()->create(['status' => EventStatus::CANCELLED]);
        $event->delete();

        $this->withToken($this->adminToken())
            ->deleteJson("/api/v1/events/{$event->id}/force")
            ->assertForbidden();

        $this->assertDatabaseHas('events', ['id' => $event->id]);
    }

    public function test_gallery_image_delete_removes_file_from_disk(): void
    {
        $event = Event::factory()->create();
        $dir = public_path('assets/images/events');
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        $filename = 'test-gallery-'.uniqid().'.jpg';
        $relative = 'assets/images/events/'.$filename;
        $full = public_path($relative);
        File::put($full, 'fake-image');

        $image = EventImage::create([
            'event_id' => $event->id,
            'path' => '/'.$relative,
            'sort_order' => 0,
        ]);

        $this->assertFileExists($full);

        $this->withToken($this->adminToken())
            ->deleteJson("/api/v1/events/{$event->id}/gallery/{$image->id}")
            ->assertNoContent();

        $this->assertFileDoesNotExist($full);
        $this->assertDatabaseMissing('event_images', ['id' => $image->id]);
    }

    public function test_category_crud(): void
    {
        $token = $this->adminToken();

        $create = $this->withToken($token)
            ->postJson('/api/v1/event-categories', ['name' => 'Meetup'])
            ->assertCreated();

        $id = $create->json('data.id');

        $this->withToken($token)
            ->patchJson("/api/v1/event-categories/{$id}", ['name' => 'Meetup Plus'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Meetup Plus');
    }

    public function test_patch_status_rejected_must_use_transition(): void
    {
        $event = Event::factory()->create(['status' => EventStatus::DRAFT]);

        $this->withToken($this->adminToken())
            ->patchJson("/api/v1/events/{$event->id}", ['status' => 'completed'])
            ->assertStatus(400);
    }
}
