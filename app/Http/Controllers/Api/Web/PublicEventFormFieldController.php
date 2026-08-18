<?php

namespace App\Http\Controllers\Api\Web;

use App\Enums\SanctumAbility;
use App\Http\Controllers\Api\EventFormFieldController;
use App\Models\Event;
use App\Models\EventFormField;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public catalog form schema (API-key-only) with dual-access for Admin Panel tokens.
 */
class PublicEventFormFieldController extends WebController
{
    public function show(Request $request, $eventId): JsonResponse
    {
        $user = $request->user('sanctum');

        if ($user instanceof User) {
            $token = $user->currentAccessToken();
            if ($token && $token->can(SanctumAbility::AdminPanel->value)) {
                if (! $user->can('view event form fields')) {
                    return $this->forbiddenResponse(
                        'This action is unauthorized.',
                        ['permission' => ['view event form fields']]
                    );
                }

                return app(EventFormFieldController::class)->forEvent($request, $eventId);
            }
        }

        $event = Event::query()
            ->publicCatalog()
            ->whereKey($eventId)
            ->first();

        if (! $event) {
            return $this->notFoundResponse('Event not found');
        }

        $fields = EventFormField::query()
            ->forEvent((int) $eventId)
            ->active()
            ->get()
            ->map(fn (EventFormField $field) => [
                'id' => $field->id,
                'key' => $field->key,
                'label' => $field->label,
                'type' => $field->type instanceof \BackedEnum ? $field->type->value : $field->type,
                'options' => $field->options,
                'required' => (bool) $field->required,
                'sort_order' => (int) $field->sort_order,
            ])
            ->values()
            ->all();

        return $this->successResponse($fields);
    }
}
