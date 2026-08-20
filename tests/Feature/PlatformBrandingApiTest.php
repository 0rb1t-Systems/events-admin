<?php

namespace Tests\Feature;

use App\Enums\SanctumAbility;
use App\Enums\UserStatus;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PlatformBrandingApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::create(['name' => 'view organizations']);
        Permission::create(['name' => 'edit organizations']);
        $role = Role::create(['name' => 'admin']);
        $role->givePermissionTo(['view organizations', 'edit organizations']);

        $this->admin = User::factory()->admin()->create([
            'email' => 'admin-branding@example.com',
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

    public function test_public_branding_returns_nulls_when_no_organization(): void
    {
        $this->getJson('/api/v1/platform/branding')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', null)
            ->assertJsonPath('data.logo_url', null)
            ->assertJsonPath('data.logo_dark_url', null)
            ->assertJsonPath('data.icon_url', null);
    }

    public function test_public_branding_returns_safe_fields_only(): void
    {
        Organization::query()->create([
            'name' => 'EventHub Demo',
            'email' => 'secret@example.com',
            'phone' => '+252611111111',
            'address' => 'Hidden Street',
            'logo_url' => 'assets/images/logo.png',
            'logo_dark_url' => '/assets/images/logo-dark.png',
            'icon_url' => '/assets/images/icon.ico',
        ]);

        $response = $this->getJson('/api/v1/platform/branding')
            ->assertOk()
            ->assertJsonPath('data.name', 'EventHub Demo')
            ->assertJsonPath('data.logo_url', '/assets/images/logo.png')
            ->assertJsonPath('data.logo_dark_url', '/assets/images/logo-dark.png')
            ->assertJsonPath('data.icon_url', '/assets/images/icon.ico');

        $data = $response->json('data');
        $this->assertArrayNotHasKey('email', $data);
        $this->assertArrayNotHasKey('phone', $data);
        $this->assertArrayNotHasKey('address', $data);
    }

    public function test_public_branding_requires_api_key(): void
    {
        $this->withoutApiClientSigning()
            ->getJson('/api/v1/platform/branding')
            ->assertStatus(401)
            ->assertJsonPath('errors.error_code.0', 'missing_api_key');
    }

    public function test_admin_organization_profile_is_not_swallowed_by_id_route(): void
    {
        Organization::query()->create([
            'name' => 'Profile Route Org',
            'email' => 'org@example.com',
        ]);

        $this->withHeader('Authorization', 'Bearer '.$this->adminToken())
            ->getJson('/api/v1/organizations/profile')
            ->assertOk()
            ->assertJsonPath('data.name', 'Profile Route Org');
    }
}
