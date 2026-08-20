<?php

namespace App\Http\Controllers\Api\Web;

use App\Models\Organization;
use Illuminate\Http\JsonResponse;

/**
 * Public (API-key-only) platform branding for the Web App.
 * Returns only safe display fields — no contact/address PII.
 */
class PlatformBrandingController extends WebController
{
    public function show(): JsonResponse
    {
        $organization = Organization::query()->first();

        if (! $organization) {
            return $this->successWithNullableData([
                'name' => null,
                'logo_url' => null,
                'logo_dark_url' => null,
                'icon_url' => null,
            ], 'No organization profile configured');
        }

        return $this->successResponse([
            'name' => $organization->name,
            'logo_url' => $this->normalizePublicPath($organization->logo_url),
            'logo_dark_url' => $this->normalizePublicPath($organization->logo_dark_url),
            'icon_url' => $this->normalizePublicPath($organization->icon_url),
        ], 'Platform branding retrieved successfully');
    }

    private function normalizePublicPath(?string $path): ?string
    {
        if ($path === null || trim($path) === '') {
            return null;
        }

        $path = trim($path);
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        return str_starts_with($path, '/') ? $path : '/'.$path;
    }
}
