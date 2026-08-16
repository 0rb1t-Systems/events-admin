<?php

namespace App\Http\Middleware;

use App\Enums\SanctumAbility;
use App\Enums\UserType;
use App\Traits\ApiResponseTrait;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminPanelAccess
{
    use ApiResponseTrait;

    /**
     * Ensure the caller is an admin user with an admin-panel scoped Sanctum token.
     * Web-participant tokens (even for admin users) cannot access Admin Panel APIs.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $this->unauthorizedResponse('Unauthenticated.');
        }

        if (! $user instanceof \App\Models\User) {
            return $this->forbiddenResponse(
                'Admin Panel access requires an admin user token.'
            );
        }

        if ($user->user_type !== UserType::ADMIN) {
            return $this->forbiddenResponse(
                'This account cannot access the Admin Panel. Participant accounts must use the Web App login.'
            );
        }

        $token = $user->currentAccessToken();

        if (! $token || ! $token->can(SanctumAbility::AdminPanel->value)) {
            return $this->forbiddenResponse(
                'Admin Panel access requires an admin-scoped token. Please sign in through the Admin login.'
            );
        }

        return $next($request);
    }
}
