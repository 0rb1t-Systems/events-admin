<?php

namespace App\Http\Controllers\Api\Web;

use App\Http\Controllers\Api\BaseController;
use App\Http\Controllers\Api\Web\Concerns\ResolvesOrganizerEvent;
use App\Models\EventDiscussion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganizerDiscussionController extends BaseController
{
    use ResolvesOrganizerEvent;

    public function forEvent(Request $request, $event): JsonResponse
    {
        $owned = $this->ownedEventOrFail($event);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $query = EventDiscussion::query()
            ->with(['user:id,name', 'speaker:id,name'])
            ->where('event_id', $owned->id)
            ->orderByDesc('created_at');

        if ($request->filled('speaker_id')) {
            $query->where('speaker_id', (int) $request->input('speaker_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $perPage = min(max((int) $request->input('per_page', 50), 1), 100);

        return $this->successResponse($this->webPaginatorPayload($query->paginate($perPage)));
    }

    public function markAnswered($event, $discussion): JsonResponse
    {
        $owned = $this->ownedEventOrFail($event);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $row = EventDiscussion::query()
            ->where('event_id', $owned->id)
            ->whereKey($discussion)
            ->first();

        if (! $row) {
            return $this->notFoundResponse('Discussion not found');
        }

        $row->status = 'answered';
        $row->save();

        return $this->successResponse($row->fresh(['user:id,name', 'speaker:id,name']), 'Marked as answered');
    }
}
