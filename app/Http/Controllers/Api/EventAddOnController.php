<?php

namespace App\Http\Controllers\Api;

use App\Models\Certificate;
use App\Models\Event;
use App\Models\EventAnnouncement;
use App\Models\EventFeedback;
use App\Models\EventSession;
use App\Models\EventSpeaker;
use App\Models\EventSponsor;
use App\Models\Participation;
use App\Services\EventAnalyticsService;
use App\Services\EventFeedbackService;
use Illuminate\Http\Request;
use InvalidArgumentException;

/**
 * Admin read-only oversight for Prompt 10 add-ons (+ ops feedback submit for tests).
 */
class EventAddOnController extends BaseController
{
    protected $model = Event::class;

    protected $searchableFields = [];

    protected $sortableFields = ['id'];

    protected $relationships = [];

    protected $validationRules = [
        'store' => [],
        'update' => [],
    ];

    public function __construct(
        private EventAnalyticsService $analytics,
        private EventFeedbackService $feedback,
    ) {}

    public function analytics($eventId)
    {
        $event = Event::find($eventId);
        if (! $event) {
            return $this->notFoundResponse('Event not found');
        }

        return $this->successResponse($this->analytics->forEvent($event));
    }

    public function announcements($eventId)
    {
        if (! Event::find($eventId)) {
            return $this->notFoundResponse('Event not found');
        }

        $rows = EventAnnouncement::query()
            ->where('event_id', $eventId)
            ->orderByDesc('sent_at')
            ->orderByDesc('id')
            ->get();

        return $this->successResponse([
            'event_id' => (int) $eventId,
            'announcements' => $rows,
        ]);
    }

    public function certificates($eventId)
    {
        if (! Event::find($eventId)) {
            return $this->notFoundResponse('Event not found');
        }

        $rows = Certificate::query()
            ->with(['participation.user'])
            ->whereHas('participation', fn ($q) => $q->where('event_id', $eventId))
            ->orderByDesc('issued_at')
            ->get();

        return $this->successResponse([
            'event_id' => (int) $eventId,
            'certificates' => $rows,
        ]);
    }

    public function feedback($eventId)
    {
        if (! Event::find($eventId)) {
            return $this->notFoundResponse('Event not found');
        }

        $rows = EventFeedback::query()
            ->with(['participation.user'])
            ->whereHas('participation', fn ($q) => $q->where('event_id', $eventId))
            ->orderByDesc('submitted_at')
            ->get();

        $avg = $rows->avg('rating');

        return $this->successResponse([
            'event_id' => (int) $eventId,
            'average_rating' => $avg !== null ? round((float) $avg, 2) : null,
            'feedback_count' => $rows->count(),
            'feedback' => $rows,
        ]);
    }

    /**
     * Ops/test submit — Web App owns participant UX. Enforces checked_in.
     */
    public function submitFeedback(Request $request)
    {
        $validated = $request->validate([
            'participation_id' => 'required|integer|exists:participations,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:5000',
        ]);

        $participation = Participation::findOrFail($validated['participation_id']);

        try {
            $row = $this->feedback->submit(
                $participation,
                (int) $validated['rating'],
                $validated['comment'] ?? null
            );
        } catch (InvalidArgumentException $e) {
            return $this->badRequestResponse($e->getMessage(), [
                'error_code' => ['feedback_not_allowed'],
            ]);
        }

        return $this->createdResponse($row->fresh('participation'));
    }

    public function sponsors($eventId)
    {
        if (! Event::find($eventId)) {
            return $this->notFoundResponse('Event not found');
        }

        return $this->successResponse([
            'event_id' => (int) $eventId,
            'sponsors' => EventSponsor::query()
                ->where('event_id', $eventId)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get(),
        ]);
    }

    public function speakers($eventId)
    {
        if (! Event::find($eventId)) {
            return $this->notFoundResponse('Event not found');
        }

        return $this->successResponse([
            'event_id' => (int) $eventId,
            'speakers' => EventSpeaker::query()
                ->where('event_id', $eventId)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get(),
        ]);
    }

    public function sessions($eventId)
    {
        if (! Event::find($eventId)) {
            return $this->notFoundResponse('Event not found');
        }

        return $this->successResponse([
            'event_id' => (int) $eventId,
            'sessions' => EventSession::query()
                ->with('speaker')
                ->where('event_id', $eventId)
                ->orderBy('starts_at')
                ->orderBy('sort_order')
                ->get(),
        ]);
    }

    /** Ops/test: record a view increment. */
    public function recordView(Request $request, $eventId)
    {
        $event = Event::find($eventId);
        if (! $event) {
            return $this->notFoundResponse('Event not found');
        }

        $validated = $request->validate([
            'viewer_key' => 'nullable|string|max:100',
        ]);

        $this->analytics->recordView($event, $validated['viewer_key'] ?? null);

        return $this->successResponse([
            'event_id' => (int) $eventId,
            'views_count' => (int) $event->fresh()->views_count,
        ], 'View recorded.');
    }
}
