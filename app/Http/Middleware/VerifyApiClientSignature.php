<?php

namespace App\Http\Middleware;

use App\Models\ApiClient;
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

        if (! is_string($publicKey) || $publicKey === '') {
            return $this->errorResponse(
                'Missing API key.',
                ['error_code' => ['missing_api_key']],
                401
            );
        }

        $client = ApiClient::query()
            ->where('public_key', $publicKey)
            ->where('active', true)
            ->first();

        if (! $client) {
            return $this->errorResponse(
                'Invalid API key.',
                ['error_code' => ['invalid_api_key']],
                401
            );
        }

        return $next($request);
    }
}
