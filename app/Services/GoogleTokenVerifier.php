<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use InvalidArgumentException;

/**
 * Verifies Google OAuth credentials for Web App Google sign-in.
 * Accepts a GIS ID token or an OAuth access token (userinfo).
 */
class GoogleTokenVerifier
{
    /**
     * @return array{email: string, name: string, picture: ?string, sub: string}
     */
    public function verify(?string $idToken, ?string $accessToken): array
    {
        $clientId = config('services.google.client_id');
        if (! is_string($clientId) || trim($clientId) === '') {
            throw new InvalidArgumentException('Google sign-in is not configured on the server.');
        }

        if ($idToken) {
            return $this->fromIdToken($idToken, $clientId);
        }

        if ($accessToken) {
            return $this->fromAccessToken($accessToken, $clientId);
        }

        throw new InvalidArgumentException('A Google id_token or access_token is required.');
    }

    /**
     * @return array{email: string, name: string, picture: ?string, sub: string}
     */
    private function fromIdToken(string $idToken, string $clientId): array
    {
        $response = Http::timeout(10)->get('https://oauth2.googleapis.com/tokeninfo', [
            'id_token' => $idToken,
        ]);

        if (! $response->successful()) {
            throw new InvalidArgumentException('Invalid Google ID token.');
        }

        $payload = $response->json();
        if (! is_array($payload)) {
            throw new InvalidArgumentException('Invalid Google ID token response.');
        }

        $aud = $payload['aud'] ?? null;
        if ($aud !== $clientId) {
            throw new InvalidArgumentException('Google token audience mismatch.');
        }

        return $this->normalizePayload($payload);
    }

    /**
     * @return array{email: string, name: string, picture: ?string, sub: string}
     */
    private function fromAccessToken(string $accessToken, string $clientId): array
    {
        $info = Http::timeout(10)->get('https://www.googleapis.com/oauth2/v3/tokeninfo', [
            'access_token' => $accessToken,
        ]);

        if (! $info->successful()) {
            throw new InvalidArgumentException('Invalid Google access token.');
        }

        $infoPayload = $info->json();
        if (! is_array($infoPayload)) {
            throw new InvalidArgumentException('Invalid Google access token response.');
        }

        $aud = $infoPayload['aud'] ?? $infoPayload['azp'] ?? null;
        if ($aud !== $clientId) {
            throw new InvalidArgumentException('Google token audience mismatch.');
        }

        $userinfo = Http::timeout(10)
            ->withToken($accessToken)
            ->get('https://www.googleapis.com/oauth2/v3/userinfo');

        if (! $userinfo->successful()) {
            throw new InvalidArgumentException('Could not load Google profile.');
        }

        $payload = $userinfo->json();
        if (! is_array($payload)) {
            throw new InvalidArgumentException('Invalid Google profile response.');
        }

        return $this->normalizePayload($payload);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{email: string, name: string, picture: ?string, sub: string}
     */
    private function normalizePayload(array $payload): array
    {
        $email = isset($payload['email']) && is_string($payload['email'])
            ? strtolower(trim($payload['email']))
            : '';
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException('Google account email is missing.');
        }

        $verified = $payload['email_verified'] ?? $payload['verified_email'] ?? false;
        if ($verified !== true && $verified !== 'true' && $verified !== 1 && $verified !== '1') {
            throw new InvalidArgumentException('Google account email is not verified.');
        }

        $name = isset($payload['name']) && is_string($payload['name']) && trim($payload['name']) !== ''
            ? trim($payload['name'])
            : (strstr($email, '@', true) ?: 'Google User');

        $picture = isset($payload['picture']) && is_string($payload['picture'])
            ? $payload['picture']
            : null;

        $sub = isset($payload['sub']) && is_string($payload['sub'])
            ? $payload['sub']
            : $email;

        return [
            'email' => $email,
            'name' => $name,
            'picture' => $picture,
            'sub' => $sub,
        ];
    }
}
