<?php

namespace App\Http\Controllers\Api\Web;

use App\Http\Controllers\Api\BaseController;
use App\Http\Controllers\Api\Web\Concerns\ResolvesOrganizerEvent;
use App\Models\Participation;
use App\Services\ParticipationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Registrations for owned events only (cross-organizer → 404).
 * Cancel reuses ParticipationService. Waitlist promote is removed.
 */
class OrganizerParticipationController extends BaseController
{
    use ResolvesOrganizerEvent;

    protected $model = Participation::class;

    protected $searchableFields = [];

    protected $sortableFields = ['id', 'status', 'payment_status', 'created_at'];

    protected $relationships = ['user', 'event', 'ticketType'];

    protected $validationRules = [
        'store' => [],
        'update' => [],
    ];

    public function __construct(private ParticipationService $participations) {}

    public function forEvent(Request $request, $event)
    {
        $owned = $this->ownedEventOrFail($event);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $query = Participation::query()
            ->with(['user', 'ticketType'])
            ->where('event_id', $owned->id);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $query->orderByDesc('created_at');

        $perPage = min(max((int) $request->input('per_page', 15), 1), 100);
        $paginator = $query->paginate($perPage);
        $snapshot = $this->participations->capacitySnapshot($owned);

        return $this->successResponse([
            ...$this->webPaginatorPayload($paginator),
            'event_id' => (int) $owned->id,
            'capacity' => $snapshot,
        ]);
    }

    public function show($participation)
    {
        $row = $this->ownedParticipationOrFail($participation);
        if ($row instanceof JsonResponse) {
            return $row;
        }

        return $this->successResponse($row->load($this->relationships));
    }

    public function cancel(Request $request, $participation)
    {
        $row = $this->ownedParticipationOrFail($participation);
        if ($row instanceof JsonResponse) {
            return $row;
        }

        $validated = $request->validate([
            'reason' => 'nullable|string|max:500',
        ]);

        $row = $this->participations->cancel($row);

        $this->logActivity(
            'Participation cancelled',
            $row,
            ['reason' => $validated['reason'] ?? null],
            'participation_cancelled'
        );

        return $this->successResponse($row, 'Participation cancelled');
    }
}
