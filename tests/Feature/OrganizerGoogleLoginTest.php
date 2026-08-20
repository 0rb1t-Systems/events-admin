<?php

namespace Tests\Feature;

use App\Enums\OrganizerStatus;
use App\Enums\SanctumAbility;
use App\Models\Organizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OrganizerGoogleLoginTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.google.client_id' => 'test-google-client-id.apps.googleusercontent.com']);
    }

    public function test_organizer_google_login_creates_organizer(): void
    {
        Http::fake([
            'https://www.googleapis.com/oauth2/v3/tokeninfo*' => Http::response([
                'aud' => 'test-google-client-id.apps.googleusercontent.com',
                'azp' => 'test-google-client-id.apps.googleusercontent.com',
                'email' => 'org.google@example.com',
                'email_verified' => 'true',
                'sub' => 'google-org-1',
            ], 200),
            'https://www.googleapis.com/oauth2/v3/userinfo*' => Http::response([
                'sub' => 'google-org-1',
                'email' => 'org.google@example.com',
                'email_verified' => true,
                'name' => 'Org Google',
            ], 200),
        ]);

        $this->postJson('/api/v1/organizer-auth/google/login', [
            'access_token' => 'ya29.fake',
        ])->assertOk()
            ->assertJsonPath('data.organizer.email', 'org.google@example.com')
            ->assertJsonPath('data.organizer.business_name', 'Org Google')
            ->assertJsonPath('data.organizer.contact_name', 'Org Google')
            ->assertJsonPath('data.token_ability', SanctumAbility::OrganizerWeb->value);

        $this->assertDatabaseHas('organizers', [
            'email' => 'org.google@example.com',
            'status' => OrganizerStatus::ACTIVE->value,
        ]);
    }

    public function test_organizer_google_login_existing_and_rejects_suspended(): void
    {
        Organizer::factory()->create([
            'email' => 'existing.org@example.com',
            'status' => OrganizerStatus::ACTIVE,
        ]);

        Http::fake([
            'https://oauth2.googleapis.com/tokeninfo*' => Http::response([
                'aud' => 'test-google-client-id.apps.googleusercontent.com',
                'email' => 'existing.org@example.com',
                'email_verified' => 'true',
                'name' => 'Existing Org',
                'sub' => 'google-org-2',
            ], 200),
        ]);

        $this->postJson('/api/v1/organizer-auth/google/login', [
            'id_token' => 'fake.id.token',
        ])->assertOk()
            ->assertJsonPath('data.organizer.email', 'existing.org@example.com');

        Organizer::query()->where('email', 'existing.org@example.com')->update([
            'status' => OrganizerStatus::SUSPENDED,
        ]);

        $this->postJson('/api/v1/organizer-auth/google/login', [
            'id_token' => 'fake.id.token',
        ])->assertForbidden()
            ->assertJsonPath('errors.error_code.0', 'organizer_suspended');
    }
}
