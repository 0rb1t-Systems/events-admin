<?php

namespace Tests\Concerns;

use App\Models\ApiClient;
use App\Support\ApiClientSignature;
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
            'services.webapp_api.secret' => $this->testApiSecret,
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
            [$path, $body] = $this->resolveApiSigningInput($method, $uri, $parameters, $content);
            $headers = ApiClientSignature::headers(
                $this->testApiPublicKey,
                $this->testApiSecret,
                $method,
                $path,
                $body
            );

            foreach ($headers as $name => $value) {
                $server['HTTP_'.str_replace('-', '_', strtoupper($name))] = $value;
            }
        }

        return parent::call($method, $uri, $parameters, $cookies, $files, $server, $content);
    }

    protected function shouldSignApiRequest(string $uri): bool
    {
        $path = str_starts_with($uri, '/') ? $uri : '/'.$uri;

        return str_starts_with($path, '/api');
    }

    /**
     * @param  array<string, mixed>  $parameters
     * @return array{0: string, 1: string}
     */
    protected function resolveApiSigningInput(string $method, string $uri, array $parameters, ?string $content): array
    {
        $path = parse_url($uri, PHP_URL_PATH) ?? $uri;
        if (! str_starts_with($path, '/')) {
            $path = '/'.$path;
        }

        if ($content !== null) {
            return [$path, $content];
        }

        if (in_array(strtoupper($method), ['POST', 'PUT', 'PATCH', 'DELETE'], true) && $parameters !== []) {
            return [$path, json_encode($parameters, JSON_THROW_ON_ERROR)];
        }

        return [$path, ''];
    }
}
