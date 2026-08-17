<?php

namespace App\Http\Middleware;

use App\Models\ApiClient;
use App\Support\ApiClientSignature;
use App\Traits\ApiResponseTrait;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyApiClientSignature
{
    use ApiResponseTrait;

    public function handle(Request $request, Closure $next): Response
    {
        $publicKey = $request->header('X-API-Key');
        $timestamp = $request->header('X-API-Timestamp');
        $signature = $request->header('X-API-Signature');

        if ($publicKey === null || $timestamp === null || $signature === null) {
            return $this->errorResponse(
                'Missing API authentication headers.',
                ['error_code' => ['missing_api_headers']],
                401
            );
        }

        if (! ctype_digit((string) $timestamp)) {
            return $this->errorResponse(
                'Invalid API timestamp.',
                ['error_code' => ['request_expired']],
                401
            );
        }

        $client = ApiClient::query()->where('public_key', $publicKey)->first();

        if (! $client || ! $client->active) {
            return $this->errorResponse(
                'Invalid API key.',
                ['error_code' => ['invalid_api_key']],
                401
            );
        }

        $timestampInt = (int) $timestamp;

        if (abs(time() - $timestampInt) > ApiClientSignature::TIMESTAMP_TOLERANCE_SECONDS) {
            return $this->errorResponse(
                'Request timestamp is outside the allowed window.',
                ['error_code' => ['request_expired']],
                401
            );
        }

        $plainSecret = $this->resolvePlainSecret($client);

        if ($plainSecret === null || ! $client->matchesPlainSecret($plainSecret)) {
            return $this->errorResponse(
                'Invalid API key.',
                ['error_code' => ['invalid_api_key']],
                401
            );
        }

        $body = $request->getContent();
        $contentType = strtolower((string) $request->header('Content-Type', ''));

        if (str_contains($contentType, 'multipart/form-data')) {
            $body = '';
        }

        $expected = ApiClientSignature::sign(
            $request->getMethod(),
            $request->getPathInfo(),
            $body,
            $timestampInt,
            $plainSecret
        );

        if (! hash_equals($expected, $signature)) {
            return $this->errorResponse(
                'Invalid API signature.',
                ['error_code' => ['invalid_signature']],
                401
            );
        }

        return $next($request);
    }

    private function resolvePlainSecret(ApiClient $client): ?string
    {
        $configuredPublicKey = config('services.webapp_api.public_key');
        $configuredSecret = config('services.webapp_api.secret');

        if (
            is_string($configuredPublicKey)
            && is_string($configuredSecret)
            && $configuredPublicKey !== ''
            && $configuredSecret !== ''
            && hash_equals($configuredPublicKey, $client->public_key)
        ) {
            return $configuredSecret;
        }

        return null;
    }
}
