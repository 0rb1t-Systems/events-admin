<?php

namespace App\Http\Controllers\Api\Web;

use App\Http\Controllers\Api\BaseController;
use App\Http\Controllers\Api\Web\Concerns\ResolvesOrganizerEvent;
use App\Models\EventSpeaker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Organizer Web API — speakers for owned events only (cross-organizer → 404).
 * photo_path is a string path like Admin storeSpeaker; no separate upload flow.
 */
class OrganizerSpeakerController extends BaseController
{
    use ResolvesOrganizerEvent;

    protected $model = EventSpeaker::class;

    protected $searchableFields = [];

    protected $sortableFields = ['id', 'sort_order', 'name'];

    protected $relationships = [];

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

        $paginator = EventSpeaker::query()
            ->where('event_id', $owned->id)
            ->orderBy('sort_order')
            ->orderBy('id')
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
            'name' => 'required|string|max:255',
            'photo_path' => 'nullable|string|max:500',
            'title' => 'nullable|string|max:255',
            'organization' => 'nullable|string|max:255',
            'bio' => 'nullable|string|max:5000',
            'social_links' => 'nullable|array',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $validated['event_id'] = $owned->id;
        $validated['sort_order'] = $validated['sort_order'] ?? 0;

        $speaker = EventSpeaker::create($validated);

        $this->logActivity('Event speaker added', $speaker, ['event_id' => $owned->id], 'created');

        return $this->createdResponse($speaker);
    }

    public function update(Request $request, $speaker)
    {
        $row = $this->ownedSpeakerOrFail($speaker);
        if ($row instanceof JsonResponse) {
            return $row;
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'photo_path' => 'nullable|string|max:500',
            'title' => 'nullable|string|max:255',
            'organization' => 'nullable|string|max:255',
            'bio' => 'nullable|string|max:5000',
            'social_links' => 'nullable|array',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $row->update($validated);

        $this->logActivity('Event speaker updated', $row, [], 'updated');

        return $this->successResponse($row->fresh(), 'Speaker updated');
    }

    public function destroy($speaker)
    {
        $row = $this->ownedSpeakerOrFail($speaker);
        if ($row instanceof JsonResponse) {
            return $row;
        }

        $row->delete();

        $this->logActivity('Event speaker deleted', $row, [], 'deleted');

        return $this->noContentResponse('Speaker deleted');
    }
}
