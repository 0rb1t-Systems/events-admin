<?php

namespace Tests\Feature;

use App\Models\ApiClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use App\Enums\UserType;
use App\Models\User;
use Tests\TestCase;

class ApiClientSignatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_ping_requires_api_key(): void
    {
        $this->withoutApiClientSigning()
            ->getJson('/api/ping')
            ->assertUnauthorized()
            ->assertJsonPath('errors.error_code.0', 'missing_api_key');
    }

    public function test_invalid_api_key_is_rejected(): void
    {
        $this->withoutApiClientSigning()
            ->withHeaders([
                'X-API-Key' => 'unknown-public-key',
            ])->getJson('/api/ping')
            ->assertUnauthorized()
            ->assertJsonPath('errors.error_code.0', 'invalid_api_key');
    }

    public function test_valid_api_key_allows_api_ping(): void
    {
        $this->getJson('/api/ping')
            ->assertOk()
            ->assertJsonPath('message', 'API is working ✅');
    }

    public function test_inactive_client_is_rejected(): void
    {
        ApiClient::query()
            ->where('public_key', $this->testApiPublicKey)
            ->update(['active' => false]);

        $this->getJson('/api/ping')
            ->assertUnauthorized()
            ->assertJsonPath('errors.error_code.0', 'invalid_api_key');
    }

    public function test_api_clients_list_is_read_only_and_hides_secret(): void
    {
        Permission::findOrCreate('view api clients', 'web');
        $role = Role::findOrCreate('admin', 'web');
        $role->givePermissionTo('view api clients');

        $admin = User::factory()->create(['user_type' => UserType::ADMIN]);
        $admin->assignRole($role);
        Sanctum::actingAs($admin, ['admin-panel']);

        $response = $this->getJson('/api/v1/api-clients');

        $response->assertOk()
            ->assertJsonPath('data.0.name', 'Web App (tests)')
            ->assertJsonMissingPath('data.0.secret')
            ->assertJsonStructure([
                'data' => [
                    ['id', 'name', 'public_key', 'public_key_masked', 'active', 'created_at', 'updated_at'],
                ],
            ]);
    }
}
