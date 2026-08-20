<?php

namespace Tests\Feature;

use App\Enums\SanctumAbility;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GoogleLoginTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.google.client_id' => 'test-google-client-id.apps.googleusercontent.com']);
    }

    public function test_google_login_creates_user_with_access_token(): void
    {
        Http::fake([
            'https://www.googleapis.com/oauth2/v3/tokeninfo*' => Http::response([
                'aud' => 'test-google-client-id.apps.googleusercontent.com',
                'azp' => 'test-google-client-id.apps.googleusercontent.com',
                'email' => 'new.google@example.com',
                'email_verified' => 'true',
                'sub' => 'google-sub-1',
            ], 200),
            'https://www.googleapis.com/oauth2/v3/userinfo*' => Http::response([
                'sub' => 'google-sub-1',
                'email' => 'new.google@example.com',
                'email_verified' => true,
                'name' => 'Google Newbie',
                'picture' => 'https://example.com/pic.png',
            ], 200),
        ]);

        $response = $this->postJson('/api/v1/auth/google/login', [
            'access_token' => 'ya29.fake-access-token',
        ])->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.email', 'new.google@example.com')
            ->assertJsonPath('data.user.name', 'Google Newbie')
            ->assertJsonPath('data.token_ability', SanctumAbility::WebParticipant->value);

        $this->assertNotEmpty($response->json('data.token'));

        $user = User::query()->where('email', 'new.google@example.com')->first();
        $this->assertNotNull($user);
        $this->assertSame(UserStatus::ACTIVE, $user->status);
        $this->assertSame(UserType::USER, $user->user_type);
        $this->assertSame('google', $user->provider);
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_google_login_logs_in_existing_user_and_activates_inactive(): void
    {
        $user = User::factory()->create([
            'email' => 'existing@example.com',
            'status' => UserStatus::INACTIVE,
            'user_type' => UserType::USER,
            'provider' => 'email',
        ]);

        Http::fake([
            'https://oauth2.googleapis.com/tokeninfo*' => Http::response([
                'aud' => 'test-google-client-id.apps.googleusercontent.com',
                'email' => 'existing@example.com',
                'email_verified' => 'true',
                'name' => 'Existing User',
                'sub' => 'google-sub-2',
            ], 200),
        ]);

        $this->postJson('/api/v1/auth/google/login', [
            'id_token' => 'fake.google.id.token',
        ])->assertOk()
            ->assertJsonPath('data.user.email', 'existing@example.com');

        $user->refresh();
        $this->assertSame(UserStatus::ACTIVE, $user->status);
    }

    public function test_google_login_rejects_suspended_user(): void
    {
        User::factory()->create([
            'email' => 'banned@example.com',
            'status' => UserStatus::SUSPENDED,
            'user_type' => UserType::USER,
        ]);

        Http::fake([
            'https://oauth2.googleapis.com/tokeninfo*' => Http::response([
                'aud' => 'test-google-client-id.apps.googleusercontent.com',
                'email' => 'banned@example.com',
                'email_verified' => 'true',
                'name' => 'Banned',
                'sub' => 'google-sub-3',
            ], 200),
        ]);

        $this->postJson('/api/v1/auth/google/login', [
            'id_token' => 'fake.google.id.token',
        ])->assertForbidden();
    }

    public function test_google_login_requires_api_key(): void
    {
        $this->withoutApiClientSigning()
            ->postJson('/api/v1/auth/google/login', ['access_token' => 'x'])
            ->assertStatus(401)
            ->assertJsonPath('errors.error_code.0', 'missing_api_key');
    }

    public function test_google_login_rejects_audience_mismatch(): void
    {
        Http::fake([
            'https://oauth2.googleapis.com/tokeninfo*' => Http::response([
                'aud' => 'other-client.apps.googleusercontent.com',
                'email' => 'x@example.com',
                'email_verified' => 'true',
                'name' => 'X',
                'sub' => 'sub',
            ], 200),
        ]);

        $this->postJson('/api/v1/auth/google/login', [
            'id_token' => 'fake.google.id.token',
        ])->assertUnauthorized();
    }
}
