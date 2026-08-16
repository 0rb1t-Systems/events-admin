<?php

namespace App\Traits;

use App\Enums\SanctumAbility;
use Illuminate\Http\JsonResponse;

/**
 * Blocks Admin Panel tokens from organizer-owned event operations.
 * Keep endpoint logic for the Web App; reject admin-panel ability with a clear 403.
 */
trait RejectsAdminPanelOrganizerActions
{
    protected function rejectIfAdminPanelToken(
        string $message = 'This action requires organizer scope. Admin Panel tokens cannot perform event-operation actions.'
    ): ?JsonResponse {
        $user = request()->user();
        $token = $user?->currentAccessToken();

        if ($token && $token->can(SanctumAbility::AdminPanel->value)) {
            return $this->forbiddenResponse($message, [
                'error_code' => ['action_requires_organizer_scope'],
            ]);
        }

        return null;
    }
}
