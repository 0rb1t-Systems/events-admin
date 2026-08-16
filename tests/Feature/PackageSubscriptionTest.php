<?php

namespace Tests\Feature;

use App\Enums\PackageStatus;
use App\Enums\SanctumAbility;
use App\Enums\SubscriptionStatus;
use App\Enums\UserStatus;
use App\Models\Organizer;
use App\Models\OrganizerSubscription;
use App\Models\Package;
use App\Models\User;
use App\Support\EventQuota;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PackageSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'view packages',
            'create packages',
            'edit packages',
            'delete packages',
            'view organizers',
            'view organizer subscriptions',
            'assign organizer subscriptions',
            'view dashboard',
        ] as $name) {
            Permission::create(['name' => $name]);
        }

        $role = Role::create(['name' => 'admin']);
        $role->givePermissionTo(Permission::all());

        $this->admin = User::factory()->admin()->create([
            'email' => 'admin-pkg@example.com',
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

    public function test_event_quota_null_unlimited_is_distinct_from_zero(): void
    {
        $this->assertTrue(EventQuota::isUnlimited(null));
        $this->assertFalse(EventQuota::isUnlimited(0));
        $this->assertFalse(EventQuota::isZeroQuota(null));
        $this->assertTrue(EventQuota::isZeroQuota(0));

        $this->assertTrue(EventQuota::canCreateEvent(null, 999));
        $this->assertFalse(EventQuota::canCreateEvent(0, 0));
        $this->assertTrue(EventQuota::canCreateEvent(2, 1));
        $this->assertFalse(EventQuota::canCreateEvent(2, 2));

        $this->assertNull(EventQuota::remaining(null, 5));
        $this->assertSame(0, EventQuota::remaining(0, 0));
        $this->assertSame(1, EventQuota::remaining(3, 2));
    }

    public function test_package_crud_stores_null_and_zero_quota_explicitly(): void
    {
        $token = $this->adminToken();

        $unlimited = $this->withToken($token)
            ->postJson('/api/v1/packages', [
                'name' => 'Unlimited Plan',
                'description' => 'All events',
                'price' => 99.5,
                'event_quota' => null,
                'status' => 'active',
            ]);

        $unlimited->assertCreated()
            ->assertJsonPath('data.event_quota', null)
            ->assertJsonPath('data.name', 'Unlimited Plan');

        $zero = $this->withToken($token)
            ->postJson('/api/v1/packages', [
                'name' => 'Zero Plan',
                'price' => 0,
                'event_quota' => 0,
            ]);

        $zero->assertCreated()
            ->assertJsonPath('data.event_quota', 0);

        $finite = $this->withToken($token)
            ->postJson('/api/v1/packages', [
                'name' => 'Starter',
                'price' => 29,
                'event_quota' => 5,
            ]);

        $finite->assertCreated()
            ->assertJsonPath('data.event_quota', 5);

        $id = $finite->json('data.id');
        $this->withToken($token)
            ->patchJson("/api/v1/packages/{$id}", ['name' => 'Starter Plus'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Starter Plus');
    }

    public function test_cannot_delete_or_archive_package_with_active_subscribers(): void
    {
        $package = Package::factory()->create();
        $organizer = Organizer::factory()->create();
        OrganizerSubscription::factory()->create([
            'organizer_id' => $organizer->id,
            'package_id' => $package->id,
            'status' => SubscriptionStatus::ACTIVE,
        ]);

        $token = $this->adminToken();

        $this->withToken($token)
            ->postJson("/api/v1/packages/{$package->id}/archive")
            ->assertForbidden();

        $this->withToken($token)
            ->patchJson("/api/v1/packages/{$package->id}", [
                'status' => PackageStatus::ARCHIVED->value,
            ])
            ->assertForbidden();

        $this->withToken($token)
            ->deleteJson("/api/v1/packages/{$package->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('packages', [
            'id' => $package->id,
            'status' => PackageStatus::ACTIVE->value,
        ]);
    }

    public function test_cannot_delete_package_with_historical_subscriptions_even_if_cancelled(): void
    {
        $package = Package::factory()->create();
        OrganizerSubscription::factory()->cancelled()->create([
            'package_id' => $package->id,
        ]);

        $this->withToken($this->adminToken())
            ->deleteJson("/api/v1/packages/{$package->id}")
            ->assertForbidden();

        // Archive is allowed once no ACTIVE subscribers
        $this->withToken($this->adminToken())
            ->postJson("/api/v1/packages/{$package->id}/archive")
            ->assertOk()
            ->assertJsonPath('data.status', PackageStatus::ARCHIVED->value);
    }

    public function test_assign_creates_history_row_and_cancels_previous_active(): void
    {
        $first = Package::factory()->create(['name' => 'Basic']);
        $second = Package::factory()->unlimited()->create(['name' => 'Pro']);
        $organizer = Organizer::factory()->create();

        $token = $this->adminToken();

        $this->withToken($token)
            ->postJson("/api/v1/organizers/{$organizer->id}/subscriptions", [
                'package_id' => $first->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.package.name', 'Basic')
            ->assertJsonPath('data.quota_usage.events_created', 0)
            ->assertJsonPath('data.quota_usage.unlimited', false);

        $this->withToken($token)
            ->postJson("/api/v1/organizers/{$organizer->id}/subscriptions", [
                'package_id' => $second->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.package.name', 'Pro')
            ->assertJsonPath('data.quota_usage.unlimited', true)
            ->assertJsonPath('data.quota_usage.zero_quota', false);

        $this->assertSame(2, OrganizerSubscription::where('organizer_id', $organizer->id)->count());
        $this->assertSame(
            1,
            OrganizerSubscription::where('organizer_id', $organizer->id)
                ->where('status', SubscriptionStatus::ACTIVE)
                ->count()
        );
        $this->assertSame(
            1,
            OrganizerSubscription::where('organizer_id', $organizer->id)
                ->where('status', SubscriptionStatus::CANCELLED)
                ->count()
        );

        $history = $this->withToken($token)
            ->getJson("/api/v1/organizers/{$organizer->id}/subscriptions");

        $history->assertOk()
            ->assertJsonPath('data.active.package.name', 'Pro')
            ->assertJsonCount(2, 'data.history');

        // Organizer list/detail exposes active package via relationship
        $this->withToken($token)
            ->getJson("/api/v1/organizers/{$organizer->id}")
            ->assertOk()
            ->assertJsonPath('data.active_subscription.package.name', 'Pro');
    }

    public function test_quota_usage_payload_distinguishes_zero_from_unlimited(): void
    {
        $zeroPkg = Package::factory()->zeroQuota()->create();
        $organizer = Organizer::factory()->create();

        $this->withToken($this->adminToken())
            ->postJson("/api/v1/organizers/{$organizer->id}/subscriptions", [
                'package_id' => $zeroPkg->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.quota_usage.quota', 0)
            ->assertJsonPath('data.quota_usage.zero_quota', true)
            ->assertJsonPath('data.quota_usage.unlimited', false)
            ->assertJsonPath('data.quota_usage.can_create_event', false);
    }

    public function test_expires_at_null_means_not_time_boxed(): void
    {
        $package = Package::factory()->create();
        $organizer = Organizer::factory()->create();

        $sub = OrganizerSubscription::factory()->create([
            'organizer_id' => $organizer->id,
            'package_id' => $package->id,
            'status' => SubscriptionStatus::ACTIVE,
            'expires_at' => null,
        ]);

        $this->assertTrue($sub->isActive());
        $this->assertNotNull($organizer->fresh()->activeSubscription);
    }
}
