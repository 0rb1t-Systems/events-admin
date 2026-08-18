<?php

namespace App\Http\Controllers\Api\Web;

use App\Enums\EventStatus;
use App\Http\Controllers\Api\BaseController;
use App\Http\Controllers\Api\Web\Concerns\ResolvesOrganizerEvent;
use App\Models\Event;
use App\Models\Organizer;
use App\Services\EventMonetization;
use App\Services\EventStatusMachine;
use App\Support\EventQuota;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use InvalidArgumentException;

class OrganizerEventController extends BaseController
{
    use ResolvesOrganizerEvent;

    protected $model = Event::class;

    protected $searchableFields = ['title', 'city'];

    protected $sortableFields = ['id', 'title', 'status', 'starts_at', 'created_at'];

    protected $relationships = ['category', 'images', 'ticketTypes'];

    public function __construct(private EventStatusMachine $statusMachine) {}

    public function index(Request $request): JsonResponse
    {
        $query = Event::query()->where('organizer_id', $this->organizer()->id);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('search') && ! $request->filled('q')) {
            $request->merge(['q' => $request->input('search')]);
        }

        $query = $this->applyApiFilters(
            $query,
            $request,
            $this->searchableFields,
            $this->sortableFields,
            $this->defaultSortField,
            $this->defaultSortDirection
        );

        $query->with(['category']);

        $perPage = min((int) $request->input('per_page', 15), 100);
        $paginator = $query->paginate($perPage);

        return $this->successResponse($this->webPaginatorPayload($paginator));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->eventFieldRules(false));

        if ($pairError = $this->validateLatLongPair($validated)) {
            return $this->badRequestResponse($pairError);
        }

        $organizer = $this->organizer();
        if ($quotaError = $this->assertOrganizerMayCreateEvent($organizer)) {
            return $this->forbiddenResponse($quotaError);
        }

        $validated['organizer_id'] = $organizer->id;
        $validated['status'] = EventStatus::DRAFT->value;
        $validated['registrations_count'] = 0;
        $validated['featured'] = false;
        $validated['monetized'] = false;

        $event = Event::create($validated);
        $event->load($this->relationships);

        $this->logActivity(
            'Event was created',
            $event,
            ['attributes' => $event->getAttributes()],
            'created'
        );

        return $this->createdResponse($event);
    }

    public function show($event): JsonResponse
    {
        $owned = $this->ownedEventOrFail($event);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $owned->load($this->relationships);

        return $this->successResponse($owned);
    }

    public function update(Request $request, $event): JsonResponse
    {
        $owned = $this->ownedEventOrFail($event);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        if ($request->exists('status')) {
            return $this->badRequestResponse(
                'Use POST /organizer/events/{event}/transition to change status (state machine enforced).'
            );
        }

        if ($request->exists('featured') || $request->exists('monetized') || $request->exists('organizer_id')) {
            return $this->badRequestResponse(
                'featured, monetized, and organizer_id cannot be set via organizer PATCH.'
            );
        }

        $validated = $request->validate($this->eventFieldRules(true));

        if (array_key_exists('category_id', $validated) && ! array_key_exists('event_category_id', $validated)) {
            $validated['event_category_id'] = $validated['category_id'];
        }
        unset($validated['category_id']);

        if ($pairError = $this->validateLatLongPair($validated, $owned)) {
            return $this->badRequestResponse($pairError);
        }

        $old = $owned->getOriginal();
        $owned->update($validated);

        $this->statusMachine->syncSoldOutFromCapacity($owned->fresh());
        EventMonetization::syncMonetized($owned->fresh());

        $owned = $owned->fresh($this->relationships);

        $this->logActivity(
            'Event was updated',
            $owned,
            ['old' => $old, 'attributes' => $owned->getAttributes()],
            'updated'
        );

        return $this->successResponse($owned, 'Event updated successfully');
    }

    public function destroy($event): JsonResponse
    {
        $owned = $this->ownedEventOrFail($event);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        // Soft-delete only. Cancelled events cannot be force-deleted; organizers never hard-delete.
        $owned->delete();

        $this->logActivity(
            'Event was soft-deleted',
            $owned,
            ['old' => $owned->getOriginal()],
            'deleted'
        );

        return $this->noContentResponse('Event moved to trash');
    }

    public function transition(Request $request, $event): JsonResponse
    {
        $owned = $this->ownedEventOrFail($event);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(EventStatus::values())],
        ]);

        try {
            $this->statusMachine->transition($owned, $validated['status']);
        } catch (InvalidArgumentException $e) {
            return $this->badRequestResponse($e->getMessage(), [
                'error_code' => ['invalid_status_transition'],
            ]);
        }

        $owned = $owned->fresh($this->relationships);

        $this->logActivity(
            'Event status transitioned',
            $owned,
            ['status' => $owned->status],
            'status_transition'
        );

        return $this->successResponse([
            'event' => $owned,
            'allowed_transitions' => $this->allowedTransitions($owned),
        ], 'Event status updated');
    }

    /**
     * Writable organizer fields. organizer_id / status / featured / monetized are never accepted.
     *
     * @return array<string, mixed>
     */
    private function eventFieldRules(bool $isUpdate = false): array
    {
        $req = $isUpdate ? 'sometimes' : 'required';

        return [
            'event_category_id' => ['nullable', 'integer', 'exists:event_categories,id'],
            'category_id' => ['nullable', 'integer', 'exists:event_categories,id'],
            'title' => [$req, 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'banner_path' => ['nullable', 'string', 'max:500'],
            'capacity' => ['nullable', 'integer', 'min:0'],
            'registration_deadline' => ['nullable', 'date'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function validateLatLongPair(array $data, ?Event $existing = null): ?string
    {
        $lat = array_key_exists('latitude', $data)
            ? $data['latitude']
            : $existing?->latitude;
        $lng = array_key_exists('longitude', $data)
            ? $data['longitude']
            : $existing?->longitude;

        $latSet = $lat !== null && $lat !== '';
        $lngSet = $lng !== null && $lng !== '';

        if ($latSet xor $lngSet) {
            return 'Latitude and longitude must be provided together as a pair.';
        }

        return null;
    }

    private function assertOrganizerMayCreateEvent(Organizer $organizer): ?string
    {
        $organizer->load('activeSubscription.package');
        $sub = $organizer->activeSubscription;
        if (! $sub || ! $sub->package) {
            return 'Organizer has no active subscription package; cannot create events.';
        }

        $quota = $sub->package->event_quota;
        $created = $organizer->events()->count();

        if (! EventQuota::canCreateEvent($quota, $created)) {
            if (EventQuota::isZeroQuota($quota)) {
                return 'Package event quota is 0 — no events allowed.';
            }

            return 'Organizer has reached their package event quota.';
        }

        return null;
    }

    /**
     * @return list<string>
     */
    private function allowedTransitions(Event $event): array
    {
        $from = $event->status instanceof EventStatus ? $event->status->value : (string) $event->status;

        return EventStatusMachine::TRANSITIONS[$from] ?? [];
    }
}
