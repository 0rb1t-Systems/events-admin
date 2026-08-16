<?php

namespace Tests\Feature;

use App\Enums\PaymentStatus;
use App\Enums\SanctumAbility;
use App\Enums\UserStatus;
use App\Models\Certificate;
use App\Models\Event;
use App\Models\Organizer;
use App\Models\OrganizerSubscription;
use App\Models\Package;
use App\Models\Participation;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class Prompt14AdminScreensTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'view payments',
            'manage payments',
            'refund payments',
            'view certificates',
            'reissue certificates',
            'view organizer subscriptions',
            'view events',
            'edit events',
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

    public function test_payments_index_filters_by_event_and_organizer(): void
    {
        $organizer = Organizer::factory()->create();
        $event = Event::factory()->create(['organizer_id' => $organizer->id]);
        $participation = Participation::factory()->create(['event_id' => $event->id]);
        Payment::factory()->completed()->create(['participation_id' => $participation->id]);

        $other = Payment::factory()->completed()->create();

        $byEvent = $this->auth()->getJson('/api/v1/payments?event_id='.$event->id);
        $byEvent->assertOk();
        $ids = collect($byEvent->json('data'))->pluck('id');
        $this->assertTrue($ids->contains(
            Payment::where('participation_id', $participation->id)->value('id')
        ));
        $this->assertFalse($ids->contains($other->id));

        $byOrg = $this->auth()->getJson('/api/v1/payments?organizer_id='.$organizer->id);
        $byOrg->assertOk();
        $this->assertGreaterThanOrEqual(1, count($byOrg->json('data')));
    }

    public function test_certificates_platform_index(): void
    {
        $event = Event::factory()->create();
        $participation = Participation::factory()->create(['event_id' => $event->id]);
        Certificate::factory()->create(['participation_id' => $participation->id]);

        $response = $this->auth()->getJson('/api/v1/certificates?event_id='.$event->id);
        $response->assertOk();
        $this->assertGreaterThanOrEqual(1, count($response->json('data')));
    }

    public function test_subscriptions_index_and_show(): void
    {
        $organizer = Organizer::factory()->create();
        $package = Package::factory()->create();
        $sub = OrganizerSubscription::factory()->create([
            'organizer_id' => $organizer->id,
            'package_id' => $package->id,
        ]);

        $list = $this->auth()->getJson('/api/v1/organizers/subscriptions?package_id='.$package->id);
        $list->assertOk();
        $this->assertGreaterThanOrEqual(1, count($list->json('data')));

        $show = $this->auth()->getJson('/api/v1/organizers/subscriptions/'.$sub->id);
        $show->assertOk();
        $show->assertJsonPath('data.subscription.id', $sub->id);
        $this->assertIsArray($show->json('data.history'));
    }

    public function test_refund_requires_refund_payments_permission(): void
    {
        Permission::findOrCreate('view payments', 'web');
        $viewer = User::factory()->admin()->create(['status' => UserStatus::ACTIVE]);
        $viewer->givePermissionTo('view payments');
        $token = $viewer->createToken('t', [SanctumAbility::AdminPanel->value])->plainTextToken;

        $payment = Payment::factory()->completed()->create();

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/payments/'.$payment->id.'/refund');

        $response->assertForbidden();
    }
}
