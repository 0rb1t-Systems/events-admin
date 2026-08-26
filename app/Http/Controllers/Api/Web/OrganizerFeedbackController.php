<?php

namespace App\Http\Controllers\Api\Web;

use App\Http\Controllers\Api\BaseController;
use App\Http\Controllers\Api\Web\Concerns\ResolvesOrganizerEvent;
use App\Models\EventFeedback;
use Illuminate\Http\JsonResponse;

class OrganizerFeedbackController extends BaseController
{
    use ResolvesOrganizerEvent;

    public function forEvent($event): JsonResponse
    {
        $owned = $this->ownedEventOrFail($event);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $rows = EventFeedback::query()
            ->with(['participation.user:id,name,email'])
            ->whereHas('participation', fn ($q) => $q->where('event_id', $owned->id))
            ->where('hidden', false)
            ->orderByDesc('submitted_at')
            ->get();

        $avg = $rows->avg('rating');

        return $this->successResponse([
            'event_id' => $owned->id,
            'average_rating' => $avg !== null ? round((float) $avg, 2) : null,
            'feedback_count' => $rows->count(),
            'feedback' => $rows,
        ]);
    }
}
