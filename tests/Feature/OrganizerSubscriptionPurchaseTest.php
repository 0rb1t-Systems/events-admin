<?php

namespace Tests\Feature;

use App\Enums\PackageDurationUnit;
use App\Enums\PackageStatus;
use App\Enums\SanctumAbility;
use App\Enums\SubscriptionOrderStatus;
use App\Enums\SubscriptionStatus;
use App\Enums\UserStatus;
use App\Jobs\ExpireOrganizerSubscriptions;
use App\Models\Organizer;
use App\Models\OrganizerSubscription;
use App\Models\OrganizerSubscriptionOrder;
use App\Models\Package;
use App\Models\User;
use App\Support\PackageDuration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class OrganizerSubscriptionPurchaseTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsOrganizer(Organizer $organizer): Organizer
    {
        Sanctum::actingAs($organizer, [SanctumAbility::OrganizerWeb->value]);

        return $organizer;
    }

    private function adminToken(): string
    {
        foreach ([
            'view packages',
            'create packages',
            'edit packages',
            'delete packages',
            'view organizers',
            'view organizer subscriptions',
            'assign organizer subscriptions',
        ] as $name) {
            Permission::findOrCreate($name, 'web');
        }

        $role = Role::findOrCreate('admin', 'web');
        $role->syncPermissions(Permission::all());

        $admin = User::factory()->admin()->create([
            'email' => 'admin-sub-purchase@example.com',
            'status' => UserStatus::ACTIVE,
        ]);
        $admin->assignRole($role);

        return $admin->createToken('admin_auth_token', [SanctumAbility::AdminPanel->value])->plainTextToken;
    }

    private function waafiApproved(): void
    {
        Http::fake([
            '*' => Http::response([
                'responseCode' => '2001',
                'responseMsg' => 'OK',
                'params' => [
                    'state' => 'approved',
                    'transactionId' => 'TX-1',
                    'issuerTransactionId' => 'ISS-1',
                ],
            ], 200),
        ]);
    }

    private function waafiRejected(): void
    {
        Http::fake([
            '*' => Http::response([
                'responseCode' => '5301',
                'responseMsg' => 'RCS_USER_REJECTED',
                'params' => [
                    'state' => 'declined',
                    'description' => 'Payment was rejected on the phone.',
                ],
            ], 200),
        ]);
    }

    public function test_package_duration_validation_and_label(): void
    {
        $token = $this->adminToken();

        $this->withToken($token)
            ->postJson('/api/v1/packages', [
                'name' => 'Bad Duration',
                'price' => 10,
                'event_quota' => 5,
                'duration_value' => 1,
                'tier_rank' => 1,
            ])
            ->assertStatus(422);

        $ok = $this->withToken($token)
            ->postJson('/api/v1/packages', [
                'name' => 'Monthly',
                'price' => 10,
                'event_quota' => 5,
                'duration_value' => 1,
                'duration_unit' => 'month',
                'tier_rank' => 10,
            ]);

        $ok->assertCreated()
            ->assertJsonPath('data.duration_value', 1)
            ->assertJsonPath('data.duration_unit', 'month')
            ->assertJsonPath('data.duration_label', '1 month')
            ->assertJsonPath('data.tier_rank', 10);

        $nonExpiring = $this->withToken($token)
            ->postJson('/api/v1/packages', [
                'name' => 'Forever',
                'price' => 0,
                'event_quota' => null,
                'duration_value' => null,
                'duration_unit' => null,
                'tier_rank' => 99,
            ]);

        $nonExpiring->assertCreated()
            ->assertJsonPath('data.duration_value', null)
            ->assertJsonPath('data.duration_label', null);
    }

    public function test_duration_calculates_calendar_expiry(): void
    {
        $start = now()->startOfDay();
        $expires = PackageDuration::expiresAt($start, 1, PackageDurationUnit::MONTH);
        $this->assertTrue($expires->equalTo($start->copy()->addMonthsNoOverflow(1)));

        $expiresYear = PackageDuration::expiresAt($start, 2, PackageDurationUnit::YEAR);
        $this->assertTrue($expiresYear->equalTo($start->copy()->addYearsNoOverflow(2)));

        $this->assertNull(PackageDuration::expiresAt($start, null, null));
    }

    public function test_free_subscription_activates_immediately_without_waafi(): void
    {
        Http::fake();
        $organizer = Organizer::factory()->create();
        $package = Package::factory()->free()->create([
            'tier_rank' => 1,
            'duration_value' => 1,
            'duration_unit' => PackageDurationUnit::MONTH,
            'event_quota' => 3,
        ]);

        $this->actingAsOrganizer($organizer);

        $res = $this->postJson('/api/v1/organizer/subscriptions', [
            'package_id' => $package->id,
        ]);

        $res->assertOk()
            ->assertJsonPath('data.outcome', 'activated')
            ->assertJsonPath('data.subscription.package_id', $package->id);

        Http::assertNothingSent();

        $this->assertDatabaseHas('organizer_subscriptions', [
            'organizer_id' => $organizer->id,
            'package_id' => $package->id,
            'status' => SubscriptionStatus::ACTIVE->value,
        ]);

        $this->assertNotNull($organizer->fresh()->activeSubscription);
    }

    public function test_paid_subscription_activates_only_after_waafi_success(): void
    {
        $this->waafiApproved();
        config([
            'waafipay.merchant_uid' => 'm',
            'waafipay.api_user_id' => 'u',
            'waafipay.api_key' => 'k',
        ]);

        $organizer = Organizer::factory()->create();
        $package = Package::factory()->create([
            'price' => 25.5,
            'tier_rank' => 5,
            'duration_value' => 1,
            'duration_unit' => PackageDurationUnit::MONTH,
        ]);

        $this->actingAsOrganizer($organizer);

        $res = $this->postJson('/api/v1/organizer/subscriptions', [
            'package_id' => $package->id,
            'payer_phone' => '0612345678',
            'amount' => 1, // must be ignored / rejected
        ]);

        $res->assertStatus(400);

        $res = $this->postJson('/api/v1/organizer/subscriptions', [
            'package_id' => $package->id,
            'payer_phone' => '0612345678',
        ]);

        $res->assertOk()
            ->assertJsonPath('data.outcome', 'activated')
            ->assertJsonPath('data.order.amount', '25.50');

        $order = OrganizerSubscriptionOrder::first();
        $this->assertSame(SubscriptionOrderStatus::COMPLETED, $order->status);
        $this->assertSame('25.50', $order->amountForWaafi());
        $this->assertNotNull($organizer->fresh()->activeSubscription);
    }

    public function test_failed_payment_creates_no_active_subscription(): void
    {
        $this->waafiRejected();
        config([
            'waafipay.merchant_uid' => 'm',
            'waafipay.api_user_id' => 'u',
            'waafipay.api_key' => 'k',
        ]);

        $organizer = Organizer::factory()->create();
        $package = Package::factory()->create(['price' => 10, 'tier_rank' => 1]);

        $this->actingAsOrganizer($organizer);

        $this->postJson('/api/v1/organizer/subscriptions', [
            'package_id' => $package->id,
            'payer_phone' => '252612345678',
        ])
            ->assertStatus(422)
            ->assertJsonPath('data.outcome', 'payment_failed');

        $this->assertNull($organizer->fresh()->activeSubscription);
        $this->assertDatabaseHas('organizer_subscription_orders', [
            'organizer_id' => $organizer->id,
            'status' => SubscriptionOrderStatus::FAILED->value,
        ]);
    }

    public function test_expired_organizer_may_resubscribe_and_active_cannot_buy_same_or_downgrade(): void
    {
        $organizer = Organizer::factory()->create();
        $basic = Package::factory()->free()->create(['tier_rank' => 5, 'name' => 'Basic']);
        $pro = Package::factory()->free()->create(['tier_rank' => 10, 'name' => 'Pro']);
        $lower = Package::factory()->free()->create(['tier_rank' => 1, 'name' => 'Lower']);

        OrganizerSubscription::factory()->create([
            'organizer_id' => $organizer->id,
            'package_id' => $basic->id,
            'status' => SubscriptionStatus::ACTIVE,
            'started_at' => now()->subMonths(2),
            'expires_at' => now()->subDay(),
            'package_snapshot' => PackageDuration::snapshot($basic),
        ]);

        $this->assertNull($organizer->fresh()->activeSubscription);

        $this->actingAsOrganizer($organizer);
        $this->postJson('/api/v1/organizer/subscriptions', ['package_id' => $basic->id])
            ->assertOk()
            ->assertJsonPath('data.outcome', 'activated');

        $this->postJson('/api/v1/organizer/subscriptions', ['package_id' => $basic->id])
            ->assertStatus(400)
            ->assertJsonFragment(['message' => 'You already have an active subscription to this package.']);

        $this->postJson('/api/v1/organizer/subscriptions', ['package_id' => $lower->id])
            ->assertStatus(400);

        $this->getJson('/api/v1/organizer/packages')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Pro', 'selectable' => true, 'upgrade_allowed' => true]);
    }

    public function test_upgrade_success_and_failed_upgrade_leaves_old_active(): void
    {
        config([
            'waafipay.merchant_uid' => 'm',
            'waafipay.api_user_id' => 'u',
            'waafipay.api_key' => 'k',
        ]);

        $organizer = Organizer::factory()->create();
        $basic = Package::factory()->free()->create(['tier_rank' => 1, 'event_quota' => 2]);
        $pro = Package::factory()->create([
            'price' => 40,
            'tier_rank' => 10,
            'event_quota' => 20,
            'duration_value' => 1,
            'duration_unit' => PackageDurationUnit::MONTH,
        ]);

        $this->actingAsOrganizer($organizer);
        $this->postJson('/api/v1/organizer/subscriptions', ['package_id' => $basic->id])->assertOk();
        $oldId = $organizer->fresh()->activeSubscription->id;

        Http::fake([
            '*' => Http::sequence()
                ->push([
                    'responseCode' => '5301',
                    'responseMsg' => 'RCS_USER_REJECTED',
                    'params' => [
                        'state' => 'declined',
                        'description' => 'Payment was rejected on the phone.',
                    ],
                ], 200)
                ->push([
                    'responseCode' => '2001',
                    'responseMsg' => 'OK',
                    'params' => [
                        'state' => 'approved',
                        'transactionId' => 'TX-2',
                        'issuerTransactionId' => 'ISS-2',
                    ],
                ], 200),
        ]);

        $this->postJson('/api/v1/organizer/subscriptions', [
            'package_id' => $pro->id,
            'payer_phone' => '0612345678',
        ])->assertStatus(422);

        $this->assertSame($oldId, $organizer->fresh()->activeSubscription->id);
        $this->assertSame(SubscriptionStatus::ACTIVE, $organizer->fresh()->activeSubscription->status);

        $this->postJson('/api/v1/organizer/subscriptions', [
            'package_id' => $pro->id,
            'payer_phone' => '0612345678',
        ])->assertOk()->assertJsonPath('data.outcome', 'activated');

        $organizer->refresh()->load('activeSubscription');
        $this->assertSame($pro->id, $organizer->activeSubscription->package_id);
        $this->assertDatabaseHas('organizer_subscriptions', [
            'id' => $oldId,
            'status' => SubscriptionStatus::CANCELLED->value,
        ]);
        $this->assertSame(20, $organizer->activeSubscription->package_snapshot['event_quota']);
    }

    public function test_archived_package_cannot_be_purchased(): void
    {
        $organizer = Organizer::factory()->create();
        $package = Package::factory()->free()->archived()->create(['tier_rank' => 1]);

        $this->actingAsOrganizer($organizer);
        $this->postJson('/api/v1/organizer/subscriptions', ['package_id' => $package->id])
            ->assertStatus(400);
    }

    public function test_organizer_cannot_access_another_organizers_orders(): void
    {
        $owner = Organizer::factory()->create();
        $intruder = Organizer::factory()->create();
        $package = Package::factory()->free()->create(['tier_rank' => 1]);

        $this->actingAsOrganizer($owner);
        $this->postJson('/api/v1/organizer/subscriptions', ['package_id' => $package->id])->assertOk();
        $orderId = OrganizerSubscriptionOrder::first()->id;

        $this->actingAsOrganizer($intruder);
        $this->getJson("/api/v1/organizer/subscription-orders/{$orderId}")
            ->assertNotFound();
    }

    public function test_elapsed_subscription_not_active_before_cleanup_job(): void
    {
        $organizer = Organizer::factory()->create();
        $package = Package::factory()->create(['tier_rank' => 1, 'event_quota' => 5]);

        OrganizerSubscription::factory()->create([
            'organizer_id' => $organizer->id,
            'package_id' => $package->id,
            'status' => SubscriptionStatus::ACTIVE,
            'started_at' => now()->subMonths(2),
            'expires_at' => now()->subMinute(),
            'package_snapshot' => PackageDuration::snapshot($package),
        ]);

        $this->assertNull($organizer->fresh()->activeSubscription);

        (new ExpireOrganizerSubscriptions)->handle(app(\App\Services\OrganizerSubscriptionPurchaseService::class));

        $this->assertDatabaseHas('organizer_subscriptions', [
            'organizer_id' => $organizer->id,
            'status' => SubscriptionStatus::EXPIRED->value,
        ]);
    }

    public function test_package_edit_does_not_rewrite_subscription_snapshot(): void
    {
        $organizer = Organizer::factory()->create();
        $package = Package::factory()->free()->create([
            'name' => 'Original',
            'price' => 0,
            'event_quota' => 4,
            'tier_rank' => 1,
        ]);

        $this->actingAsOrganizer($organizer);
        $this->postJson('/api/v1/organizer/subscriptions', ['package_id' => $package->id])->assertOk();

        $sub = $organizer->fresh()->activeSubscription;
        $this->assertSame('Original', $sub->package_snapshot['package_name']);
        $this->assertSame(4, $sub->package_snapshot['event_quota']);

        $package->update(['name' => 'Renamed', 'event_quota' => 99, 'price' => 50]);

        $sub->refresh();
        $this->assertSame('Original', $sub->package_snapshot['package_name']);
        $this->assertSame(4, $sub->package_snapshot['event_quota']);
    }

    public function test_concurrent_pending_blocks_duplicate_purchase(): void
    {
        config([
            'waafipay.merchant_uid' => 'm',
            'waafipay.api_user_id' => 'u',
            'waafipay.api_key' => 'k',
        ]);

        $organizer = Organizer::factory()->create();
        $package = Package::factory()->create(['price' => 15, 'tier_rank' => 1]);

        OrganizerSubscriptionOrder::factory()->create([
            'organizer_id' => $organizer->id,
            'package_id' => $package->id,
            'status' => SubscriptionOrderStatus::PENDING,
            'amount' => 15,
            'expires_at' => now()->addMinutes(10),
            'package_snapshot' => PackageDuration::snapshot($package),
        ]);

        $this->actingAsOrganizer($organizer);
        $this->postJson('/api/v1/organizer/subscriptions', [
            'package_id' => $package->id,
            'payer_phone' => '0612345678',
        ])->assertStatus(400);
    }

    public function test_admin_assign_cancels_active_and_snapshots(): void
    {
        $token = $this->adminToken();
        $organizer = Organizer::factory()->create();
        $a = Package::factory()->free()->create(['tier_rank' => 1]);
        $b = Package::factory()->create([
            'tier_rank' => 5,
            'duration_value' => 7,
            'duration_unit' => PackageDurationUnit::DAY,
        ]);

        app(\App\Services\OrganizerSubscriptionPurchaseService::class)
            ->purchase($organizer, $a->id, null);
        $old = $organizer->fresh()->activeSubscription->id;

        $this->withToken($token)
            ->postJson("/api/v1/organizers/{$organizer->id}/subscriptions", [
                'package_id' => $b->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.package_snapshot.tier_rank', 5);

        $this->assertDatabaseHas('organizer_subscriptions', [
            'id' => $old,
            'status' => SubscriptionStatus::CANCELLED->value,
        ]);
        $this->assertSame($b->id, $organizer->fresh()->activeSubscription->package_id);
    }
}