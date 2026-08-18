<?php

namespace Tests\Concerns;

use App\Models\ApiClient;
use Illuminate\Support\Facades\Schema;

trait SignsApiClientRequests
{
    protected bool $apiClientSigningEnabled = true;

    protected string $testApiPublicKey = 'test-webapp-public-key-0123456789abcd';

    protected string $testApiSecret = 'test-webapp-secret-key-0123456789abcdefghijklmnopqrstuvwxyz0123456789ab';

    protected function setUpApiClient(): void
    {
        config([
            'services.webapp_api.public_key' => $this->testApiPublicKey,
        ]);

        if (! Schema::hasTable('api_clients')) {
            return;
        }

        ApiClient::query()->updateOrCreate(
            ['public_key' => $this->testApiPublicKey],
            [
                'name' => 'Web App (tests)',
                'secret' => $this->testApiSecret,
                'active' => true,
            ]
        );
    }

    protected function withoutApiClientSigning(): static
    {
        $this->apiClientSigningEnabled = false;

        return $this;
    }

    /**
     * @param  array<string, mixed>  $parameters
     * @param  array<string, mixed>  $server
     */
    public function call($method, $uri, $parameters = [], $cookies = [], $files = [], $server = [], $content = null)
    {
        if ($this->apiClientSigningEnabled && $this->shouldSignApiRequest($uri)) {
            $server['HTTP_X_API_KEY'] = $this->testApiPublicKey;
        }

        return parent::call($method, $uri, $parameters, $cookies, $files, $server, $content);
    }

    protected function shouldSignApiRequest(string $uri): bool
    {
        $path = str_starts_with($uri, '/') ? $uri : '/'.$uri;

        return str_starts_with($path, '/api');
    }
}
