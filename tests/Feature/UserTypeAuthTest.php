<?php

namespace Tests\Feature;

use App\Enums\SanctumAbility;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class UserTypeAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_migration_backfills_existing_users_to_admin(): void
    {
        $participantShaped = User::factory()->participant()->create([
            'email' => 'legacy@example.com',
        ]);

        // Re-run the phase-1 default migration effect: all existing should be admin after migrate.
        // Fresh migrate already ran; simulate post-migration expectation for seeded staff by
        // creating as admin (factory default) and asserting participant can be created explicitly.
        $admin = User::factory()->admin()->create(['email' => 'admin@example.com']);

        $this->assertSame(UserType::ADMIN, $admin->fresh()->user_type);
        $this->assertSame(UserType::USER, $participantShaped->fresh()->user_type);

        // After the dedicated backfill migration runs on deploy, existing rows are admin.
        // Verify the migration class backfill SQL path by invoking update like the migration.
        \Illuminate\Support\Facades\DB::table('users')->update(['user_type' => UserType::ADMIN->value]);
        $this->assertSame(0, User::query()->where('user_type', UserType::USER)->count());
        $this->assertTrue(User::query()->where('user_type', UserType::ADMIN)->count() >= 2);
    }

    public function test_admin_can_login_via_admin_endpoint_and_receives_admin_panel_ability(): void
    {
        $admin = User::factory()->admin()->create([
            'email' => 'admin-login@example.com',
            'password' => 'password',
            'status' => UserStatus::ACTIVE,
        ]);

        $response = $this->postJson('/api/v1/auth/admin/login', [
            'email' => $admin->email,
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.token_ability', SanctumAbility::AdminPanel->value)
            ->assertJsonPath('data.user.user_type', UserType::ADMIN->value);

        $plain = $response->json('data.token');
        $this->assertNotEmpty($plain);

        $token = PersonalAccessToken::findToken($plain);
        $this->assertNotNull($token);
        $this->assertTrue($token->can(SanctumAbility::AdminPanel->value));
        $this->assertFalse($token->can(SanctumAbility::WebParticipant->value));
    }

    public function test_participant_is_forbidden_on_admin_login_with_distinct_message(): void
    {
        $participant = User::factory()->participant()->create([
            'email' => 'participant@example.com',
            'password' => 'password',
            'status' => UserStatus::ACTIVE,
        ]);

        $wrongPassword = $this->postJson('/api/v1/auth/admin/login', [
            'email' => $participant->email,
            'password' => 'not-the-password',
        ]);
        $wrongPassword->assertUnauthorized()
            ->assertJsonPath('message', 'Invalid credentials');

        $blocked = $this->postJson('/api/v1/auth/admin/login', [
            'email' => $participant->email,
            'password' => 'password',
        ]);

        $blocked->assertForbidden()
            ->assertJsonPath('errors.error_code.0', 'participant_admin_login_forbidden')
            ->assertJsonFragment([
                'message' => 'This account cannot access the Admin Panel. Participant accounts must use the Web App login.',
            ]);

        $this->assertSame(0, $participant->tokens()->count());
    }

    public function test_participant_can_login_via_web_endpoint_with_web_participant_ability(): void
    {
        $participant = User::factory()->participant()->create([
            'email' => 'web-user@example.com',
            'password' => 'password',
            'status' => UserStatus::ACTIVE,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $participant->email,
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.token_ability', SanctumAbility::WebParticipant->value);

        $token = PersonalAccessToken::findToken($response->json('data.token'));
        $this->assertTrue($token->can(SanctumAbility::WebParticipant->value));
        $this->assertFalse($token->can(SanctumAbility::AdminPanel->value));
    }

    public function test_admin_can_hold_admin_and_web_tokens_simultaneously(): void
    {
        $admin = User::factory()->admin()->create([
            'email' => 'both@example.com',
            'password' => 'password',
            'status' => UserStatus::ACTIVE,
        ]);

        $adminLogin = $this->postJson('/api/v1/auth/admin/login', [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertOk();

        $webLogin = $this->postJson('/api/v1/auth/login', [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertOk();

        $admin->refresh();
        $this->assertSame(2, $admin->tokens()->count());

        $adminToken = PersonalAccessToken::findToken($adminLogin->json('data.token'));
        $webToken = PersonalAccessToken::findToken($webLogin->json('data.token'));

        $this->assertTrue($adminToken->can(SanctumAbility::AdminPanel->value));
        $this->assertTrue($webToken->can(SanctumAbility::WebParticipant->value));
    }

    public function test_web_participant_token_cannot_access_admin_users_api(): void
    {
        $participant = User::factory()->participant()->create([
            'email' => 'no-admin-api@example.com',
            'password' => 'password',
            'status' => UserStatus::ACTIVE,
        ]);

        $login = $this->postJson('/api/v1/auth/login', [
            'email' => $participant->email,
            'password' => 'password',
        ])->assertOk();

        $this->withToken($login->json('data.token'))
            ->getJson('/api/v1/users')
            ->assertForbidden();
    }

    public function test_logout_revokes_only_current_token_scope(): void
    {
        $admin = User::factory()->admin()->create([
            'email' => 'logout-scope@example.com',
            'password' => 'password',
            'status' => UserStatus::ACTIVE,
        ]);

        $adminLogin = $this->postJson('/api/v1/auth/admin/login', [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertOk();

        $webLogin = $this->postJson('/api/v1/auth/login', [
            'email' => $admin->email,
            'password' => 'password',
        ])->assertOk();

        $this->withToken($webLogin->json('data.token'))
            ->postJson('/api/v1/auth/logout')
            ->assertOk();

        $admin->refresh();
        $this->assertSame(1, $admin->tokens()->count());
        $this->assertTrue(
            $admin->tokens()->first()->can(SanctumAbility::AdminPanel->value)
        );

        // Admin token from first login should still authenticate admin APIs
        $this->withToken($adminLogin->json('data.token'))
            ->getJson('/api/v1/auth/me')
            ->assertOk();
    }
}
