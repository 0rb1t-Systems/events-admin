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
        $hiddenCount = $rows->where('hidden', true)->count();

        return $this->successResponse([
            'event_id' => (int) $eventId,
            'average_rating' => $avg !== null ? round((float) $avg, 2) : null,
            'feedback_count' => $rows->count(),
            'hidden_count' => $hiddenCount,
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

        $this->logActivity(
            'Event feedback submitted',
            $row,
            [
                'participation_id' => $participation->id,
                'rating' => (int) $validated['rating'],
            ],
            'created'
        );

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

    // -------------------------------------------------------------------------
    // Announcements write
    // -------------------------------------------------------------------------

    /**
     * Send an announcement to all non-cancelled participants of an event.
     * Creates EventAnnouncement row, queues emails via MailService.
     */
    public function storeAnnouncement(Request $request, $eventId)
    {
        $event = Event::find($eventId);
        if (! $event) {
            return $this->notFoundResponse('Event not found');
        }

        $validated = $request->validate([
            'subject' => 'required|string|max:255',
            'body' => 'required|string|max:10000',
        ]);

        $announcement = EventAnnouncement::create([
            'event_id' => $event->id,
            'subject' => $validated['subject'],
            'body' => $validated['body'],
            'sent_at' => now(),
            'sent_by' => auth()->id(),
        ]);

        // Queue emails to non-cancelled participants
        $participations = \App\Models\Participation::query()
            ->with('user')
            ->where('event_id', $event->id)
            ->where('status', '!=', \App\Enums\ParticipationStatus::CANCELLED->value)
            ->get();

        $mailService = app(\App\Services\MailService::class);

        foreach ($participations as $participation) {
            if ($participation->user) {
                $mailService->sendEmailQueued(
                    $participation->user,
                    'notification',
                    [
                        'subject' => $validated['subject'],
                        'message' => $validated['body'],
                        'user_name' => $participation->user->name,
                    ]
                );
            }
        }

        $this->logActivity(
            'Event announcement sent',
            $announcement,
            [
                'event_id' => $event->id,
                'subject' => $validated['subject'],
                'recipients' => $participations->count(),
            ],
            'created'
        );

        return $this->createdResponse($announcement, 'Announcement sent to '.$participations->count().' participant(s)');
    }

    // -------------------------------------------------------------------------
    // Sponsors CRUD
    // -------------------------------------------------------------------------

    public function storeSponsor(Request $request, $eventId)
    {
        $event = Event::find($eventId);
        if (! $event) {
            return $this->notFoundResponse('Event not found');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'logo_path' => 'nullable|string|max:500',
            'tier' => ['required', \Illuminate\Validation\Rule::in(\App\Enums\SponsorTier::values())],
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $validated['event_id'] = $event->id;
        $validated['sort_order'] = $validated['sort_order'] ?? 0;

        $sponsor = EventSponsor::create($validated);

        $this->logActivity(
            'Event sponsor added',
            $sponsor,
            ['event_id' => $event->id],
            'created'
        );

        return $this->createdResponse($sponsor);
    }

    public function updateSponsor(Request $request, $eventId, $sponsorId)
    {
        if (! Event::find($eventId)) {
            return $this->notFoundResponse('Event not found');
        }

        $sponsor = EventSponsor::where('event_id', $eventId)->find($sponsorId);
        if (! $sponsor) {
            return $this->notFoundResponse('Sponsor not found');
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'logo_path' => 'nullable|string|max:500',
            'tier' => ['sometimes', \Illuminate\Validation\Rule::in(\App\Enums\SponsorTier::values())],
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $sponsor->update($validated);

        $this->logActivity('Event sponsor updated', $sponsor, [], 'updated');

        return $this->successResponse($sponsor->fresh(), 'Sponsor updated');
    }

    public function destroySponsor($eventId, $sponsorId)
    {
        if (! Event::find($eventId)) {
            return $this->notFoundResponse('Event not found');
        }

        $sponsor = EventSponsor::where('event_id', $eventId)->find($sponsorId);
        if (! $sponsor) {
            return $this->notFoundResponse('Sponsor not found');
        }

        $sponsor->delete();

        $this->logActivity('Event sponsor deleted', $sponsor, [], 'deleted');

        return $this->noContentResponse('Sponsor deleted');
    }

    // -------------------------------------------------------------------------
    // Speakers CRUD
    // -------------------------------------------------------------------------

    public function storeSpeaker(Request $request, $eventId)
    {
        $event = Event::find($eventId);
        if (! $event) {
            return $this->notFoundResponse('Event not found');
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

        $validated['event_id'] = $event->id;
        $validated['sort_order'] = $validated['sort_order'] ?? 0;

        $speaker = EventSpeaker::create($validated);

        $this->logActivity('Event speaker added', $speaker, ['event_id' => $event->id], 'created');

        return $this->createdResponse($speaker);
    }

    public function updateSpeaker(Request $request, $eventId, $speakerId)
    {
        if (! Event::find($eventId)) {
            return $this->notFoundResponse('Event not found');
        }

        $speaker = EventSpeaker::where('event_id', $eventId)->find($speakerId);
        if (! $speaker) {
            return $this->notFoundResponse('Speaker not found');
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

        $speaker->update($validated);

        $this->logActivity('Event speaker updated', $speaker, [], 'updated');

        return $this->successResponse($speaker->fresh(), 'Speaker updated');
    }

    public function destroySpeaker($eventId, $speakerId)
    {
        if (! Event::find($eventId)) {
            return $this->notFoundResponse('Event not found');
        }

        $speaker = EventSpeaker::where('event_id', $eventId)->find($speakerId);
        if (! $speaker) {
            return $this->notFoundResponse('Speaker not found');
        }

        $speaker->delete();

        $this->logActivity('Event speaker deleted', $speaker, [], 'deleted');

        return $this->noContentResponse('Speaker deleted');
    }

    // -------------------------------------------------------------------------
    // Sessions CRUD
    // -------------------------------------------------------------------------

    public function storeSession(Request $request, $eventId)
    {
        $event = Event::find($eventId);
        if (! $event) {
            return $this->notFoundResponse('Event not found');
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

        $validated['event_id'] = $event->id;
        $validated['sort_order'] = $validated['sort_order'] ?? 0;

        $session = EventSession::create($validated);

        $this->logActivity('Event session added', $session, ['event_id' => $event->id], 'created');

        return $this->createdResponse($session->load('speaker'));
    }

    public function updateSession(Request $request, $eventId, $sessionId)
    {
        if (! Event::find($eventId)) {
            return $this->notFoundResponse('Event not found');
        }

        $session = EventSession::where('event_id', $eventId)->find($sessionId);
        if (! $session) {
            return $this->notFoundResponse('Session not found');
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

        $session->update($validated);

        $this->logActivity('Event session updated', $session, [], 'updated');

        return $this->successResponse($session->fresh('speaker'), 'Session updated');
    }

    public function destroySession($eventId, $sessionId)
    {
        if (! Event::find($eventId)) {
            return $this->notFoundResponse('Event not found');
        }

        $session = EventSession::where('event_id', $eventId)->find($sessionId);
        if (! $session) {
            return $this->notFoundResponse('Session not found');
        }

        $session->delete();

        $this->logActivity('Event session deleted', $session, [], 'deleted');

        return $this->noContentResponse('Session deleted');
    }
}
