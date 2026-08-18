<?php

namespace App\Http\Middleware;

use App\Enums\SanctumAbility;
use App\Models\User;
use App\Traits\ApiResponseTrait;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ensures the caller is a User with a web-participant Sanctum token.
 * Admin users are allowed when the current token ability is web-participant.
 */
class EnsureParticipantWebAccess
{
    use ApiResponseTrait;

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $this->errorResponse(
                'Unauthenticated.',
                ['error_code' => ['unauthenticated']],
                401
            );
        }

        if (! $user instanceof User) {
            return $this->errorResponse(
                'Participant access requires a web-participant scoped user token.',
                ['error_code' => ['wrong_ability']],
                403
            );
        }

        $token = $user->currentAccessToken();
        if (! $token || ! $token->can(SanctumAbility::WebParticipant->value)) {
            return $this->errorResponse(
                'Participant access requires a web-participant scoped token.',
                ['error_code' => ['wrong_ability']],
                403
            );
        }

        return $next($request);
    }
}
