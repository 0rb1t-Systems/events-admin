<?php

namespace App\Http\Controllers\Api\Web;

use App\Enums\SponsorTier;
use App\Http\Controllers\Api\BaseController;
use App\Http\Controllers\Api\Web\Concerns\ResolvesOrganizerEvent;
use App\Models\EventSponsor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Organizer Web API — sponsors for owned events only (cross-organizer → 404).
 * Tiers: platinum, gold, silver, partner (SponsorTier).
 */
class OrganizerSponsorController extends BaseController
{
    use ResolvesOrganizerEvent;

    protected $model = EventSponsor::class;

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

        $paginator = EventSponsor::query()
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
            'logo_path' => 'nullable|string|max:500',
            'tier' => ['required', Rule::in(SponsorTier::values())],
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $validated['event_id'] = $owned->id;
        $validated['sort_order'] = $validated['sort_order'] ?? 0;

        $sponsor = EventSponsor::create($validated);

        $this->logActivity(
            'Event sponsor added',
            $sponsor,
            ['event_id' => $owned->id],
            'created'
        );

        return $this->createdResponse($sponsor);
    }

    public function update(Request $request, $sponsor)
    {
        $row = $this->ownedSponsorOrFail($sponsor);
        if ($row instanceof JsonResponse) {
            return $row;
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'logo_path' => 'nullable|string|max:500',
            'tier' => ['sometimes', Rule::in(SponsorTier::values())],
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $row->update($validated);

        $this->logActivity('Event sponsor updated', $row, [], 'updated');

        return $this->successResponse($row->fresh(), 'Sponsor updated');
    }

    public function destroy($sponsor)
    {
        $row = $this->ownedSponsorOrFail($sponsor);
        if ($row instanceof JsonResponse) {
            return $row;
        }

        $row->delete();

        $this->logActivity('Event sponsor deleted', $row, [], 'deleted');

        return $this->noContentResponse('Sponsor deleted');
    }
}
