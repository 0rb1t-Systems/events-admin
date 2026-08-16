<?php

namespace App\Http\Middleware;

use App\Enums\OrganizerStatus;
use App\Enums\SanctumAbility;
use App\Models\Organizer;
use App\Traits\ApiResponseTrait;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ensures the caller is an Organizer with an organizer-web Sanctum token.
 * Admin User tokens must never pass this middleware.
 */
class EnsureOrganizerWebAccess
{
    use ApiResponseTrait;

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof Organizer) {
            return $this->unauthorizedResponse('Organizer authentication required.');
        }

        if ($user->status === OrganizerStatus::SUSPENDED) {
            return response()->json([
                'success' => false,
                'message' => 'This organizer account is suspended. Contact support or wait for reactivation.',
                'errors' => [
                    'error_code' => ['organizer_suspended'],
                ],
                'status_code' => 403,
            ], 403);
        }

        $token = $user->currentAccessToken();
        if (! $token || ! $token->can(SanctumAbility::OrganizerWeb->value)) {
            return $this->forbiddenResponse(
                'Organizer access requires an organizer-web scoped token.'
            );
        }

        return $next($request);
    }
}
