<?php

namespace App\Http\Controllers\Api\Web;

use App\Http\Controllers\Api\BaseController;
use App\Http\Controllers\Api\Web\Concerns\ResolvesOrganizerEvent;
use App\Models\EventSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Organizer Web API — sessions for owned events only (cross-organizer → 404).
 * No reorder endpoint — EventAddOnController does not expose one.
 */
class OrganizerSessionController extends BaseController
{
    use ResolvesOrganizerEvent;

    protected $model = EventSession::class;

    protected $searchableFields = [];

    protected $sortableFields = ['id', 'starts_at', 'sort_order'];

    protected $relationships = ['speaker'];

    protected $validationRules = [
        'store' => [],
        'update' => [],
    ];

    public function forEvent(Request $request, $event)
    {
        $owned = $this->ownedEventOrFail($event);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $perPage = min(max((int) $request->input('per_page', 15), 1), 100);

        $paginator = EventSession::query()
            ->with('speaker')
            ->where('event_id', $owned->id)
            ->orderBy('starts_at')
            ->orderBy('sort_order')
            ->paginate($perPage);

        return $this->successResponse($this->webPaginatorPayload($paginator));
    }

    public function storeForEvent(Request $request, $event)
    {
        $owned = $this->ownedEventOrFail($event);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $validated = $request->validate([
            'speaker_id' => 'nullable|integer|exists:event_speakers,id',
            'title' => 'required|string|max:255',
            'starts_at' => 'required|date',
            'ends_at' => 'nullable|date|after:starts_at',
            'room' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:5000',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $validated['event_id'] = $owned->id;
        $validated['sort_order'] = $validated['sort_order'] ?? 0;

        $session = EventSession::create($validated);

        $this->logActivity('Event session added', $session, ['event_id' => $owned->id], 'created');

        return $this->createdResponse($session->load('speaker'));
    }

    public function update(Request $request, $session)
    {
        $row = $this->ownedSessionOrFail($session);
        if ($row instanceof JsonResponse) {
            return $row;
        }

        $validated = $request->validate([
            'speaker_id' => 'nullable|integer|exists:event_speakers,id',
            'title' => 'sometimes|string|max:255',
            'starts_at' => 'sometimes|date',
            'ends_at' => 'nullable|date',
            'room' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:5000',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $row->update($validated);

        $this->logActivity('Event session updated', $row, [], 'updated');

        return $this->successResponse($row->fresh('speaker'), 'Session updated');
    }

    public function destroy($session)
    {
        $row = $this->ownedSessionOrFail($session);
        if ($row instanceof JsonResponse) {
            return $row;
        }

        $row->delete();

        $this->logActivity('Event session deleted', $row, [], 'deleted');

        return $this->noContentResponse('Session deleted');
    }
}
