<?php

namespace App\Http\Controllers\Api;

use App\Enums\EventMode;
use App\Enums\EventStatus;
use App\Enums\SanctumAbility;
use App\Models\Event;
use App\Models\EventImage;
use App\Models\Organizer;
use App\Models\User;
use App\Services\EventMonetization;
use App\Services\EventRegistrationGate;
use App\Services\EventStatusMachine;
use App\Support\EventFieldRules;
use App\Support\EventQuota;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use InvalidArgumentException;

/**
 * Admin oversight of events across organizers.
 * Admins view/moderate (featured, monetized, status transitions) — not full organizer create UI.
 * Store exists for ops/tests and future organizer API reuse; FE create form is moderation-scoped.
 */
class EventController extends BaseController
{
    protected $model = Event::class;

    protected $searchableFields = ['title', 'description', 'city', 'address'];

    protected $sortableFields = [
        'id',
        'title',
        'status',
        'featured',
        'monetized',
        'capacity',
        'starts_at',
        'ends_at',
        'registration_deadline',
        'created_at',
        'updated_at',
    ];

    protected $relationships = ['organizer', 'category', 'images', 'ticketTypes', 'discountCodes'];

    /** @var list<string> */
    protected array $publicListRelationships = ['organizer', 'category', 'images', 'ticketTypes'];

    /** @var list<string> */
    protected array $publicShowRelationships = [
        'organizer',
        'category',
        'images',
        'ticketTypes',
        'speakers',
        'sponsors',
        'sessions',
    ];

    protected $validationRules = [
        'store' => [],
        'update' => [],
    ];

    public function __construct(private EventStatusMachine $statusMachine) {}

    public function index(Request $request)
    {
        $isAdmin = $this->isAdminPanelCaller($request);
        $query = $this->model::query();

        if (! $isAdmin) {
            $query->publicCatalog();
        }

        $query = $this->applyApiFilters(
            $query,
            $request,
            $this->searchableFields,
            $this->sortableFields,
            $this->defaultSortField,
            $this->defaultSortDirection
        );

        $query->with($isAdmin ? $this->relationships : $this->publicListRelationships);

        if ($isAdmin) {
            return $this->paginateResponse($query, $request);
        }

        $perPage = min((int) $request->input('per_page', 15), 100);
        if ($request->input('all') === 'true') {
            $perPage = 1000;
        }

        $paginator = $query->paginate($perPage);
        $paginator->getCollection()->each(fn (Event $event) => $this->sanitizePublicEvent($event));

        return response()->json($paginator);
    }

    public function show($id)
    {
        $request = request();
        $isAdmin = $this->isAdminPanelCaller($request);
        $query = $this->model::query()->with(
            $isAdmin
                ? array_values(array_unique([...$this->relationships, 'speakers', 'sponsors', 'sessions']))
                : $this->publicShowRelationships
        );

        if (! $isAdmin) {
            $query->publicCatalog();
        }

        $event = $query->find($id);
        if (! $event) {
            return $this->notFoundResponse();
        }

        if (! $isAdmin) {
            $this->sanitizePublicEvent($event);
        }

        return $this->successResponse($event);
    }

    /**
     * Admin-panel Sanctum ability sees all statuses; API-key-only (or other tokens) get the public catalog.
     */
    private function isAdminPanelCaller(Request $request): bool
    {
        $user = $request->user('sanctum');
        if (! $user instanceof User || ! $user->isAdmin()) {
            return false;
        }

        $token = $user->currentAccessToken();

        return $token && $token->can(SanctumAbility::AdminPanel->value);
    }

    private function sanitizePublicEvent(Event $event): void
    {
        if ($event->relationLoaded('organizer') && $event->organizer) {
            $event->organizer->setVisible(['id', 'business_name']);
        }

        $event->unsetRelation('discountCodes');
    }

    /**
     * Shared create/update field rules (organizer create + admin seed).
     *
     * @return array<string, mixed>
     */
    private function eventFieldRules(bool $isUpdate = false): array
    {
        $req = $isUpdate ? 'sometimes' : 'required';

        return array_merge(EventFieldRules::rules($isUpdate, false), [
            'organizer_id' => [$req, 'integer', 'exists:organizers,id'],
            'featured' => ['sometimes', 'boolean'],
            'monetized' => ['sometimes', 'boolean'],
        ]);
    }

    /**
     * Lat/lng optional at DB; if either is present, both are required (pair).
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

    /**
     * Enforce EventQuota when creating an event for an organizer.
     */
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

    public function store(Request $request)
    {
        $validated = EventFieldRules::validateRequest($request, $this->eventFieldRules(false));

        if ($pairError = $this->validateLatLongPair($validated)) {
            return $this->badRequestResponse($pairError);
        }

        $organizer = Organizer::findOrFail($validated['organizer_id']);
        if ($quotaError = $this->assertOrganizerMayCreateEvent($organizer)) {
            return $this->forbiddenResponse($quotaError);
        }

        $validated['status'] = EventStatus::DRAFT->value;
        $validated['registrations_count'] = 0;
        $validated['featured'] = $validated['featured'] ?? false;
        $validated['monetized'] = $validated['monetized'] ?? false;
        $validated['event_mode'] = $validated['event_mode'] ?? EventMode::IN_PERSON->value;

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

    /**
     * Admin moderation update: featured, monetized, schedule/capacity fields —
     * not a full organizer creation form. Status changes go through transition().
     */
    public function update(Request $request, $id)
    {
        $event = Event::find($id);
        if (! $event) {
            return $this->notFoundResponse();
        }

        if ($request->has('status')) {
            return $this->badRequestResponse(
                'Use POST /events/{id}/transition to change status (state machine enforced).'
            );
        }

        $validated = EventFieldRules::validateRequest($request, [
            'featured' => ['sometimes', 'boolean'],
            'monetized' => ['sometimes', 'boolean'],
            'event_category_id' => ['sometimes', 'nullable', 'integer', 'exists:event_categories,id'],
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'why_attend' => ['nullable', 'array', 'max:6'],
            'why_attend.*' => ['nullable', 'string', 'max:200'],
            'city' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'event_mode' => ['sometimes', 'string', Rule::in(EventMode::values())],
            'online_url' => ['nullable', 'string', 'max:500', 'url'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'banner_path' => ['nullable', 'string', 'max:500'],
            'capacity' => ['nullable', 'integer', 'min:0'],
            'registration_deadline' => ['nullable', 'date'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'registrations_count' => ['sometimes', 'integer', 'min:0'],
        ], $event);

        if ($pairError = $this->validateLatLongPair($validated, $event)) {
            return $this->badRequestResponse($pairError);
        }

        // monetized is derived from paid ticket types — reject contradictory writes
        if (array_key_exists('monetized', $validated)) {
            $derived = EventMonetization::hasPaidTicketTypes($event);
            if ((bool) $validated['monetized'] !== $derived) {
                return $this->badRequestResponse(
                    'monetized is derived from ticket types (true iff any non-deleted type has price > 0). '
                    .'Add/remove paid ticket types instead of forcing this flag.'
                );
            }
            unset($validated['monetized']);
        }

        $old = $event->getOriginal();
        $event->update($validated);

        // Capacity sync after count/capacity changes (Gate A → sold_out)
        $this->statusMachine->syncSoldOutFromCapacity($event->fresh());
        EventMonetization::syncMonetized($event->fresh());

        $event = $event->fresh($this->relationships);

        $this->logActivity(
            'Event was updated',
            $event,
            ['old' => $old, 'attributes' => $event->getAttributes()],
            'updated'
        );

        return $this->successResponse($event, 'Event updated successfully');
    }

    public function transition(Request $request, $id)
    {
        $event = Event::find($id);
        if (! $event) {
            return $this->notFoundResponse();
        }

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(EventStatus::values())],
        ]);

        try {
            $this->statusMachine->transition($event, $validated['status']);
        } catch (InvalidArgumentException $e) {
            return $this->badRequestResponse($e->getMessage(), [
                'error_code' => ['invalid_status_transition'],
            ]);
        }

        $event = $event->fresh($this->relationships);

        $this->logActivity(
            'Event status transitioned',
            $event,
            ['status' => $event->status],
            'status_transition'
        );

        return $this->successResponse($event, 'Event status updated');
    }

    /**
     * Sync sold_out from capacity (admin/ops trigger). Deadline is NOT involved.
     */
    public function syncCapacity($id)
    {
        $event = Event::find($id);
        if (! $event) {
            return $this->notFoundResponse();
        }

        $before = $event->status;
        $event = $this->statusMachine->syncSoldOutFromCapacity($event);

        return $this->successResponse([
            'event' => $event->fresh($this->relationships),
            'capacity_reached' => EventRegistrationGate::isCapacityReached($event),
            'deadline_passed' => EventRegistrationGate::isRegistrationDeadlinePassed($event),
            'registration_gates' => EventRegistrationGate::evaluate($event),
            'status_changed' => $before !== $event->status,
        ]);
    }

    public function registrationGates($id)
    {
        $event = Event::find($id);
        if (! $event) {
            return $this->notFoundResponse();
        }

        return $this->successResponse(EventRegistrationGate::evaluate($event));
    }

    public function destroy($id)
    {
        $event = Event::find($id);
        if (! $event) {
            return $this->notFoundResponse();
        }

        // Soft-delete only — cancelled events stay in DB history; never hard-delete here
        $event->delete();

        $this->logActivity(
            'Event was soft-deleted',
            $event,
            ['old' => $event->getOriginal()],
            'deleted'
        );

        return $this->noContentResponse('Event moved to trash');
    }

    public function forceDestroy($id)
    {
        $event = $this->model::withTrashed()->find($id);
        if (! $event) {
            return $this->notFoundResponse();
        }

        // Cancelled events must remain visible in history — block hard delete
        if ($event->status === EventStatus::CANCELLED) {
            return $this->forbiddenResponse(
                'Cancelled events cannot be permanently deleted. They remain for oversight history.'
            );
        }

        // Remove gallery files from disk (Organization logo pattern)
        foreach ($event->images as $image) {
            $image->deleteFileFromDisk();
        }

        if ($event->banner_path) {
            $relative = ltrim($event->banner_path, '/');
            $full = public_path($relative);
            if (file_exists($full) && is_file($full)) {
                unlink($full);
            }
        }

        $event->forceDelete();

        $this->logActivity(
            'Event was permanently deleted',
            $event,
            [],
            'force_deleted'
        );

        return $this->noContentResponse('Event permanently deleted');
    }

    public function uploadGalleryImage(Request $request, $id)
    {
        $event = Event::find($id);
        if (! $event) {
            return $this->notFoundResponse();
        }

        $request->validate([
            'image' => 'required|file|mimes:jpeg,png,jpg,gif,webp|max:4096',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $file = $request->file('image');
        $filename = 'event-'.$event->id.'-'.date('Y-m-d-H-i-s').'-'.uniqid().'.'.$file->getClientOriginalExtension();
        $relative = 'assets/images/events/'.$filename;
        $fullPath = public_path($relative);
        if (! is_dir(dirname($fullPath))) {
            mkdir(dirname($fullPath), 0755, true);
        }
        $file->move(dirname($fullPath), $filename);

        $image = EventImage::create([
            'event_id' => $event->id,
            'path' => '/'.$relative,
            'sort_order' => $request->integer('sort_order', $event->images()->count()),
        ]);

        return $this->createdResponse($image, 'Gallery image uploaded');
    }

    public function deleteGalleryImage($eventId, $imageId)
    {
        $event = Event::find($eventId);
        if (! $event) {
            return $this->notFoundResponse('Event not found');
        }

        $image = EventImage::where('event_id', $eventId)->find($imageId);
        if (! $image) {
            return $this->notFoundResponse('Image not found');
        }

        // Mirror Organization logo removal: unlink file then DB row
        $image->deleteFileFromDisk();
        $image->delete();

        return $this->noContentResponse('Gallery image deleted');
    }

    public function reorderGallery(Request $request, $id)
    {
        $event = Event::find($id);
        if (! $event) {
            return $this->notFoundResponse();
        }

        $validated = $request->validate([
            'order' => 'required|array',
            'order.*.id' => 'required|integer|exists:event_images,id',
            'order.*.sort_order' => 'required|integer|min:0',
        ]);

        foreach ($validated['order'] as $row) {
            EventImage::where('event_id', $event->id)
                ->where('id', $row['id'])
                ->update(['sort_order' => $row['sort_order']]);
        }

        return $this->successResponse(
            $event->fresh('images'),
            'Gallery reordered'
        );
    }
}
