<?php

namespace Tests\Feature;

use App\Enums\EventStatus;
use App\Enums\PaymentStatus;
use App\Enums\PayoutRequestStatus;
use App\Enums\UserType;
use App\Models\Event;
use App\Models\Organizer;
use App\Models\Participation;
use App\Models\Payment;
use App\Models\PayoutRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DashboardStatsTest extends TestCase
{
    use RefreshDatabase;

    private function adminWithDashboard(): User
    {
        Permission::findOrCreate('view dashboard', 'web');
        $role = Role::findOrCreate('admin', 'web');
        $role->givePermissionTo('view dashboard');

        $user = User::factory()->create(['user_type' => UserType::ADMIN]);
        $user->assignRole($role);

        return $user;
    }

    public function test_dashboard_stats_requires_permission_and_returns_aggregates(): void
    {
        $admin = $this->adminWithDashboard();
        Sanctum::actingAs($admin, ['admin-panel']);

        $organizer = Organizer::factory()->create();
        $draft = Event::factory()->create([
            'organizer_id' => $organizer->id,
            'status' => EventStatus::DRAFT,
        ]);
        Event::factory()->create([
            'organizer_id' => $organizer->id,
            'status' => EventStatus::PUBLISHED,
        ]);

        $participation = Participation::factory()->create([
            'event_id' => $draft->id,
        ]);

        Payment::factory()->completed()->create([
            'participation_id' => $participation->id,
            'amount' => 50.5,
        ]);
        Payment::factory()->create([
            'participation_id' => $participation->id,
            'status' => PaymentStatus::PENDING,
            'amount' => 999,
        ]);

        PayoutRequest::factory()->create([
            'organizer_id' => $organizer->id,
            'event_id' => $draft->id,
            'status' => PayoutRequestStatus::REQUESTED,
        ]);
        PayoutRequest::factory()->create([
            'organizer_id' => $organizer->id,
            'event_id' => $draft->id,
            'status' => PayoutRequestStatus::APPROVED,
        ]);

        $response = $this->getJson('/api/v1/dashboard/stats');

        $response->assertOk()
            ->assertJsonPath('data.total_organizers', 1)
            ->assertJsonPath('data.total_events', 2)
            ->assertJsonPath('data.events_by_status.draft', 1)
            ->assertJsonPath('data.events_by_status.published', 1)
            ->assertJsonPath('data.total_collected_funds', 50.5)
            ->assertJsonPath('data.pending_payout_requests', 1)
            ->assertJsonPath('data.approved_awaiting_payment', 1);
    }
}
