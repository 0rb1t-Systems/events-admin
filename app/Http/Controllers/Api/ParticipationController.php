<?php

namespace App\Http\Controllers\Api;

use App\Models\Event;
use App\Models\Participation;
use App\Models\User;
use App\Services\ParticipationService;
use Illuminate\Http\Request;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

class ParticipationController extends BaseController
{
    protected $model = Participation::class;

    protected $searchableFields = [];

    protected $sortableFields = ['id', 'status', 'payment_status', 'created_at'];

    protected $relationships = ['user', 'event', 'ticketType'];

    protected $validationRules = [
        'store' => [],
        'update' => [],
    ];

    public function __construct(private ParticipationService $participations) {}

    public function forEvent(Request $request, $eventId)
    {
        $event = Event::find($eventId);
        if (! $event) {
            return $this->notFoundResponse('Event not found');
        }

        $query = Participation::query()
            ->with(['user', 'ticketType'])
            ->where('event_id', $eventId);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $query->orderByDesc('created_at');

        $rows = $query->get();
        $snapshot = $this->participations->capacitySnapshot($event);

        return $this->successResponse([
            'event_id' => (int) $eventId,
            'capacity' => $snapshot,
            'participations' => $rows,
        ]);
    }

    public function index(Request $request)
    {
        $query = Participation::query()->with($this->relationships);

        if ($request->filled('event_id')) {
            $query->where('event_id', $request->integer('event_id'));
        }
        if ($request->filled('organizer_id')) {
            $query->whereHas('event', fn ($q) => $q->where('organizer_id', $request->integer('organizer_id')));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $query = $this->applyApiFilters(
            $query,
            $request,
            $this->searchableFields,
            $this->sortableFields,
            'created_at',
            'desc'
        );

        return $this->paginateResponse($query, $request);
    }

    /**
     * Admin stand-in for Web App join (creates joined or waitlisted).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'event_id' => 'required|integer|exists:events,id',
            'user_id' => 'required|integer|exists:users,id',
            'ticket_type_id' => 'nullable|integer|exists:ticket_types,id',
            'custom_field_answers' => 'nullable|array',
        ]);

        $event = Event::findOrFail($validated['event_id']);
        $user = User::findOrFail($validated['user_id']);

        try {
            $participation = $this->participations->join(
                $event,
                $user,
                $validated['ticket_type_id'] ?? null,
                $validated['custom_field_answers'] ?? null,
                allowWaitlist: true
            );
        } catch (InvalidArgumentException $e) {
            return $this->badRequestResponse($e->getMessage());
        } catch (RuntimeException $e) {
            return $this->badRequestResponse($e->getMessage());
        } catch (Throwable $e) {
            // Unique constraint race
            if (str_contains($e->getMessage(), 'UNIQUE') || str_contains($e->getMessage(), 'Duplicate')) {
                return $this->badRequestResponse('User already has an active participation for this event.');
            }
            throw $e;
        }

        $this->logActivity(
            'Participation created',
            $participation,
            ['status' => $participation->status],
            'participation_joined'
        );

        return $this->createdResponse($participation);
    }

    public function promote($id)
    {
        $participation = Participation::find($id);
        if (! $participation) {
            return $this->notFoundResponse();
        }

        try {
            $participation = $this->participations->promoteFromWaitlist($participation);
        } catch (InvalidArgumentException|RuntimeException $e) {
            return $this->badRequestResponse($e->getMessage());
        }

        $this->logActivity(
            'Waitlisted participation promoted',
            $participation,
            [],
            'participation_promoted'
        );

        return $this->successResponse($participation, 'Promoted from waitlist');
    }

    public function cancel($id)
    {
        $participation = Participation::find($id);
        if (! $participation) {
            return $this->notFoundResponse();
        }

        $participation = $this->participations->cancel($participation);

        $this->logActivity(
            'Participation cancelled',
            $participation,
            [],
            'participation_cancelled'
        );

        return $this->successResponse($participation, 'Participation cancelled');
    }

    public function show($id)
    {
        $participation = Participation::with($this->relationships)->find($id);
        if (! $participation) {
            return $this->notFoundResponse();
        }

        return $this->successResponse($participation);
    }
}
