<?php

namespace Tests\Feature;

use App\Models\ApiClient;
use App\Support\ApiClientSignature;
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

    public function test_ping_requires_api_signature_headers(): void
    {
        $this->withoutApiClientSigning()
            ->getJson('/api/ping')
            ->assertUnauthorized()
            ->assertJsonPath('errors.error_code.0', 'missing_api_headers');
    }

    public function test_invalid_api_key_is_rejected(): void
    {
        $timestamp = time();
        $path = '/api/ping';
        $signature = ApiClientSignature::sign('GET', $path, '', $timestamp, $this->testApiSecret);

        $this->withoutApiClientSigning()
            ->withHeaders([
                'X-API-Key' => 'unknown-public-key',
                'X-API-Timestamp' => (string) $timestamp,
                'X-API-Signature' => $signature,
            ])->getJson('/api/ping')
            ->assertUnauthorized()
            ->assertJsonPath('errors.error_code.0', 'invalid_api_key');
    }

    public function test_expired_timestamp_is_rejected(): void
    {
        $timestamp = time() - 600;
        $path = '/api/ping';
        $signature = ApiClientSignature::sign('GET', $path, '', $timestamp, $this->testApiSecret);

        $this->withoutApiClientSigning()
            ->withHeaders([
                'X-API-Key' => $this->testApiPublicKey,
                'X-API-Timestamp' => (string) $timestamp,
                'X-API-Signature' => $signature,
            ])->getJson('/api/ping')
            ->assertUnauthorized()
            ->assertJsonPath('errors.error_code.0', 'request_expired');
    }

    public function test_invalid_signature_is_rejected(): void
    {
        $this->withoutApiClientSigning()
            ->withHeaders([
                'X-API-Key' => $this->testApiPublicKey,
                'X-API-Timestamp' => (string) time(),
                'X-API-Signature' => 'invalid-signature',
            ])->getJson('/api/ping')
            ->assertUnauthorized()
            ->assertJsonPath('errors.error_code.0', 'invalid_signature');
    }

    public function test_valid_signature_allows_api_ping(): void
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
