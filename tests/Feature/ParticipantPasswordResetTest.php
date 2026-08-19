<?php

namespace Tests\Feature;

use App\Enums\SanctumAbility;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class ParticipantPasswordResetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
    }

    public function test_forgot_password_sets_reset_code_expiry(): void
    {
        $user = User::factory()->participant()->create([
            'email' => 'reset-expiry@example.com',
            'status' => UserStatus::ACTIVE,
        ]);

        $this->postJson('/api/v1/auth/forgot-password', [
            'email' => $user->email,
        ])->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonMissing(['reset_code']);

        $user->refresh();

        $this->assertNotNull($user->reset_code);
        $this->assertMatchesRegularExpression('/^\d{4}$/', $user->reset_code);
        $this->assertNotNull($user->reset_code_expires_at);
        $this->assertTrue($user->reset_code_expires_at->greaterThan(now()->addMinutes(29)));
        $this->assertTrue($user->reset_code_expires_at->lessThanOrEqualTo(now()->addMinutes(30)));
    }

    public function test_reset_password_succeeds_with_valid_code(): void
    {
        $user = User::factory()->participant()->create([
            'email' => 'reset-valid@example.com',
            'password' => Hash::make('old-password'),
            'status' => UserStatus::ACTIVE,
            'reset_code' => '4321',
            'reset_code_expires_at' => now()->addMinutes(30),
        ]);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email,
            'reset_code' => '4321',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Password reset successfully');

        $user->refresh();

        $this->assertTrue(Hash::check('new-password', $user->password));
        $this->assertNull($user->reset_code);
        $this->assertNull($user->reset_code_expires_at);
    }

    public function test_reset_password_fails_with_wrong_code(): void
    {
        $user = User::factory()->participant()->create([
            'email' => 'reset-wrong@example.com',
            'password' => Hash::make('old-password'),
            'status' => UserStatus::ACTIVE,
            'reset_code' => '1111',
            'reset_code_expires_at' => now()->addMinutes(30),
        ]);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email,
            'reset_code' => '9999',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertStatus(400)
            ->assertJsonPath('message', 'Invalid reset code or email')
            ->assertJsonPath('errors.reset_code.0', 'Invalid reset code or email');

        $user->refresh();

        $this->assertTrue(Hash::check('old-password', $user->password));
        $this->assertSame('1111', $user->reset_code);
        $this->assertNotNull($user->reset_code_expires_at);
    }

    public function test_reset_password_fails_with_expired_code(): void
    {
        $user = User::factory()->participant()->create([
            'email' => 'reset-expired@example.com',
            'password' => Hash::make('old-password'),
            'status' => UserStatus::ACTIVE,
            'reset_code' => '2222',
            'reset_code_expires_at' => now()->subMinute(),
        ]);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email,
            'reset_code' => '2222',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertStatus(400)
            ->assertJsonPath('message', 'Reset code has expired')
            ->assertJsonPath('errors.reset_code.0', 'Reset code has expired. Please request a new one.');

        $user->refresh();

        $this->assertTrue(Hash::check('old-password', $user->password));
        $this->assertSame('2222', $user->reset_code);
        $this->assertNotNull($user->reset_code_expires_at);
    }

    public function test_reset_password_clears_code_and_expiry_after_success(): void
    {
        $user = User::factory()->participant()->create([
            'email' => 'reset-clear@example.com',
            'password' => Hash::make('old-password'),
            'status' => UserStatus::ACTIVE,
            'reset_code' => '3333',
            'reset_code_expires_at' => now()->addMinutes(15),
        ]);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email,
            'reset_code' => '3333',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertOk();

        $user->refresh();

        $this->assertNull($user->reset_code);
        $this->assertNull($user->reset_code_expires_at);
    }

    public function test_reset_password_revokes_all_user_tokens(): void
    {
        $user = User::factory()->participant()->create([
            'email' => 'reset-tokens@example.com',
            'password' => Hash::make('old-password'),
            'status' => UserStatus::ACTIVE,
            'reset_code' => '4444',
            'reset_code_expires_at' => now()->addMinutes(30),
        ]);

        $webToken = $user->createToken('web', [SanctumAbility::WebParticipant->value])->plainTextToken;
        $adminToken = $user->createToken('admin', [SanctumAbility::AdminPanel->value])->plainTextToken;

        $this->assertNotNull(PersonalAccessToken::findToken($webToken));
        $this->assertNotNull(PersonalAccessToken::findToken($adminToken));

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email,
            'reset_code' => '4444',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertOk();

        $this->assertSame(0, $user->fresh()->tokens()->count());
        $this->assertNull(PersonalAccessToken::findToken($webToken));
        $this->assertNull(PersonalAccessToken::findToken($adminToken));
    }
}
