<?php

namespace Tests\Feature;

use App\Enums\EventStatus;
use App\Enums\ParticipationPaymentStatus;
use App\Enums\ParticipationStatus;
use App\Enums\QrScanResult;
use App\Enums\SanctumAbility;
use App\Enums\UserStatus;
use App\Models\Event;
use App\Models\Participation;
use App\Models\QrScanLog;
use App\Models\User;
use App\Services\ParticipationService;
use App\Services\QrTokenService;
use App\Services\QrValidationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class QrInvitationModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private QrValidationService $validator;

    private QrTokenService $tokens;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'view events',
            'view qr scan logs',
            'manage qr scans',
            'view dashboard',
        ] as $name) {
            Permission::create(['name' => $name]);
        }

        $role = Role::create(['name' => 'admin']);
        $role->givePermissionTo(Permission::all());

        $this->admin = User::factory()->admin()->create([
            'email' => 'admin-qr@example.com',
            'password' => 'password',
            'status' => UserStatus::ACTIVE,
        ]);
        $this->admin->assignRole('admin');

        $this->validator = app(QrValidationService::class);
        $this->tokens = app(QrTokenService::class);
    }

    private function adminToken(): string
    {
        return $this->admin->createToken(
            'admin_auth_token',
            [SanctumAbility::AdminPanel->value]
        )->plainTextToken;
    }

    private function confirmedParticipation(array $attrs = []): Participation
    {
        $event = Event::factory()->create([
            'status' => EventStatus::REGISTRATION_OPEN,
            'capacity' => 50,
            'registration_deadline' => now()->addDays(7),
        ]);
        $user = User::factory()->create();

        $p = Participation::factory()->create(array_merge([
            'user_id' => $user->id,
            'event_id' => $event->id,
            'status' => ParticipationStatus::JOINED,
            'payment_status' => ParticipationPaymentStatus::NOT_REQUIRED,
            'qr_token' => null,
        ], $attrs));

        return $this->tokens->ensureForConfirmed($p->fresh());
    }

    public function test_qr_token_column_has_unique_index(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        $this->assertTrue(
            Schema::hasColumn('participations', 'qr_token'),
            'participations.qr_token column must exist'
        );

        // Create two with same token should fail uniqueness
        $a = $this->confirmedParticipation();
        $this->assertNotNull($a->qr_token);

        $b = Participation::factory()->create([
            'status' => ParticipationStatus::JOINED,
            'payment_status' => ParticipationPaymentStatus::NOT_REQUIRED,
            'qr_token' => null,
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);
        $b->qr_token = $a->qr_token;
        $b->save();
    }

    public function test_free_join_generates_cryptographic_qr_token(): void
    {
        $event = Event::factory()->create([
            'status' => EventStatus::REGISTRATION_OPEN,
            'capacity' => 10,
            'registration_deadline' => now()->addDays(3),
        ]);
        $user = User::factory()->create();

        $p = app(ParticipationService::class)->join($event, $user);

        $this->assertSame(ParticipationStatus::JOINED, $p->status);
        $this->assertNotNull($p->qr_token);
        $this->assertSame(QrTokenService::TOKEN_LENGTH, strlen($p->qr_token));
        $this->assertMatchesRegularExpression('/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/', $p->qr_token);
    }

    public function test_pending_payment_does_not_get_qr_token(): void
    {
        $p = Participation::factory()->create([
            'status' => ParticipationStatus::JOINED,
            'payment_status' => ParticipationPaymentStatus::PENDING,
            'qr_token' => null,
        ]);

        $this->tokens->ensureForConfirmed($p);

        $this->assertNull($p->fresh()->qr_token);
    }

    public function test_valid_scan_checks_in_and_logs(): void
    {
        $p = $this->confirmedParticipation();

        $outcome = $this->validator->validate($p->qr_token, 'Gate A', $this->admin);

        $this->assertSame(QrScanResult::VALID, $outcome['result']);
        $this->assertTrue($outcome['checked_in']);
        $this->assertSame(ParticipationStatus::CHECKED_IN, $p->fresh()->status);
        $this->assertDatabaseHas('qr_scan_logs', [
            'participation_id' => $p->id,
            'result' => QrScanResult::VALID->value,
            'gate' => 'Gate A',
        ]);
    }

    public function test_rescan_returns_already_used_without_side_effects(): void
    {
        $p = $this->confirmedParticipation();

        $first = $this->validator->validate($p->qr_token, 'Main', $this->admin);
        $this->assertSame(QrScanResult::VALID, $first['result']);
        $this->assertTrue($first['checked_in']);

        $second = $this->validator->validate($p->qr_token, 'Main', $this->admin);

        $this->assertSame(QrScanResult::ALREADY_USED, $second['result']);
        $this->assertFalse($second['checked_in']);
        $this->assertSame(ParticipationStatus::CHECKED_IN, $p->fresh()->status);

        // Two separate log rows
        $this->assertSame(2, QrScanLog::where('participation_id', $p->id)->count());
        $this->assertDatabaseHas('qr_scan_logs', [
            'participation_id' => $p->id,
            'result' => QrScanResult::ALREADY_USED->value,
        ]);
        $this->assertDatabaseHas('qr_scan_logs', [
            'participation_id' => $p->id,
            'result' => QrScanResult::VALID->value,
        ]);
    }

    public function test_unknown_token_returns_invalid(): void
    {
        $outcome = $this->validator->validate('definitely-not-a-real-token');

        $this->assertSame(QrScanResult::INVALID, $outcome['result']);
        $this->assertFalse($outcome['checked_in']);
        $this->assertNull($outcome['participation']);
        $this->assertDatabaseHas('qr_scan_logs', [
            'result' => QrScanResult::INVALID->value,
            'scanned_token' => 'DEFINITELY-NOT-A-REAL-TOKEN',
        ]);
    }

    public function test_cancelled_participation_returns_invalid_not_already_used(): void
    {
        $p = $this->confirmedParticipation();
        // Simulate: was checked in, then somehow cancelled (or cancel after token issued)
        $p->status = ParticipationStatus::CHECKED_IN;
        $p->save();
        $p->status = ParticipationStatus::CANCELLED;
        $p->save();

        $outcome = $this->validator->validate($p->qr_token);

        $this->assertSame(QrScanResult::INVALID, $outcome['result']);
        $this->assertNotSame(QrScanResult::ALREADY_USED, $outcome['result']);
        $this->assertFalse($outcome['checked_in']);
        $this->assertSame(
            'cancelled',
            $outcome['scan_log']->meta['reason'] ?? null
        );
    }

    public function test_cancelled_before_checkin_returns_invalid(): void
    {
        $p = $this->confirmedParticipation();
        $p->status = ParticipationStatus::CANCELLED;
        $p->save();

        $outcome = $this->validator->validate($p->qr_token);

        $this->assertSame(QrScanResult::INVALID, $outcome['result']);
        $this->assertSame(ParticipationStatus::CANCELLED, $p->fresh()->status);
    }

    public function test_refunded_returns_invalid_before_already_used(): void
    {
        $p = $this->confirmedParticipation([
            'status' => ParticipationStatus::CHECKED_IN,
            'payment_status' => ParticipationPaymentStatus::REFUNDED,
        ]);
        // Ensure token exists
        if (! $p->qr_token) {
            $p = $this->tokens->assignToken($p);
        }

        $outcome = $this->validator->validate($p->qr_token);

        $this->assertSame(QrScanResult::INVALID, $outcome['result']);
        $this->assertSame('refunded', $outcome['scan_log']->meta['reason'] ?? null);
    }

    public function test_check_in_stats_and_admin_api(): void
    {
        $p = $this->confirmedParticipation();
        $this->validator->validate($p->qr_token);
        $this->validator->validate($p->qr_token); // already_used

        $stats = $this->validator->checkInStats($p->event_id);

        $this->assertSame(1, $stats['registered']);
        $this->assertSame(1, $stats['arrived']);
        $this->assertSame(0, $stats['absent']);
        $this->assertSame(1, $stats['valid_scans']);
        $this->assertSame(1, $stats['already_used_scans']);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken())
            ->getJson("/api/v1/events/{$p->event_id}/check-in-stats");

        $response->assertOk();
        $response->assertJsonPath('data.arrived', 1);

        $list = $this->withHeader('Authorization', 'Bearer '.$this->adminToken())
            ->getJson('/api/v1/qr-scan-logs?event_id='.$p->event_id);

        $list->assertOk();
        $this->assertGreaterThanOrEqual(2, count($list->json('data')));
    }

    public function test_validate_api_endpoint(): void
    {
        $p = $this->confirmedParticipation();

        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken())
            ->postJson('/api/v1/qr-scan-logs/validate', [
                'token' => $p->qr_token,
                'gate' => 'East',
            ]);

        // Admin Panel tokens cannot check-in — organizer Web App owns scanning (Prompt 13).
        $response->assertForbidden();
        $response->assertJsonPath('errors.error_code.0', 'action_requires_organizer_scope');
    }
}
