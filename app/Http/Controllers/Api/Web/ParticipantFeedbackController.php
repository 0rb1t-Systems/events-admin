<?php

namespace App\Http\Controllers\Api\Web;

use App\Models\EventFeedback;
use App\Services\EventFeedbackService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class ParticipantFeedbackController extends WebController
{
    public function __construct(private EventFeedbackService $feedback) {}

    public function show($participation): JsonResponse
    {
        $row = $this->ownedParticipationOrFail($participation);
        if ($row instanceof JsonResponse) {
            return $row;
        }

        $feedback = EventFeedback::query()
            ->where('participation_id', $row->id)
            ->first();

        return $this->successWithNullableData($feedback);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'participation_id' => 'required|integer',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:5000',
        ]);

        $participation = $this->ownedParticipationOrFail($validated['participation_id']);
        if ($participation instanceof JsonResponse) {
            return $participation;
        }

        try {
            $row = $this->feedback->submit(
                $participation,
                (int) $validated['rating'],
                $validated['comment'] ?? null
            );
        } catch (InvalidArgumentException $e) {
            return $this->badRequestResponse($e->getMessage());
        }

        return $this->createdResponse($row);
    }
}
