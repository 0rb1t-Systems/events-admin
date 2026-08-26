<?php

namespace App\Http\Controllers\Api\Web;

use App\Enums\ParticipationStatus;
use App\Http\Controllers\Api\BaseController;
use App\Models\Event;
use App\Models\EventAnnouncement;
use App\Models\EventDiscussion;
use App\Models\EventSpeaker;
use App\Models\Participation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParticipantEventRoomController extends BaseController
{
    private function activeParticipationOrFail(Request $request, int|string $eventId): Participation|JsonResponse
    {
        $event = Event::find($eventId);
        if (! $event) {
            return $this->notFoundResponse('Event not found');
        }

        $row = Participation::query()
            ->where('event_id', $event->id)
            ->where('user_id', $request->user()->id)
            ->where('status', '!=', ParticipationStatus::CANCELLED->value)
            ->first();

        if (! $row) {
            return $this->notFoundResponse('Participation not found');
        }

        return $row;
    }

    private function ownedParticipationOrFail(Request $request, int|string $participationId): Participation|JsonResponse
    {
        $row = Participation::query()
            ->whereKey($participationId)
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $row) {
            return $this->notFoundResponse('Participation not found');
        }

        return $row;
    }

    public function announcements(Request $request, $participation): JsonResponse
    {
        $row = $this->ownedParticipationOrFail($request, $participation);
        if ($row instanceof JsonResponse) {
            return $row;
        }

        if ($row->status === ParticipationStatus::CANCELLED) {
            return $this->notFoundResponse('Participation not found');
        }

        $items = EventAnnouncement::query()
            ->where('event_id', $row->event_id)
            ->orderByDesc('sent_at')
            ->orderByDesc('id')
            ->limit(50)
            ->get(['id', 'subject', 'body', 'sent_at', 'created_at']);

        return $this->successResponse([
            'event_id' => $row->event_id,
            'announcements' => $items,
        ]);
    }

    public function listDiscussions(Request $request, $event): JsonResponse
    {
        $participation = $this->activeParticipationOrFail($request, $event);
        if ($participation instanceof JsonResponse) {
            return $participation;
        }

        $query = EventDiscussion::query()
            ->with(['speaker:id,name'])
            ->where('event_id', $participation->event_id)
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at');

        return $this->successResponse([
            'items' => $query->limit(100)->get(),
        ]);
    }

    public function storeDiscussion(Request $request, $event): JsonResponse
    {
        $participation = $this->activeParticipationOrFail($request, $event);
        if ($participation instanceof JsonResponse) {
            return $participation;
        }

        $validated = $request->validate([
            'body' => 'required|string|max:2000',
            'speaker_id' => 'nullable|integer|exists:event_speakers,id',
        ]);

        if (! empty($validated['speaker_id'])) {
            $speakerOk = EventSpeaker::query()
                ->whereKey($validated['speaker_id'])
                ->where('event_id', $participation->event_id)
                ->exists();
            if (! $speakerOk) {
                return $this->badRequestResponse('Speaker does not belong to this event.');
            }
        }

        $row = EventDiscussion::create([
            'event_id' => $participation->event_id,
            'user_id' => $request->user()->id,
            'speaker_id' => $validated['speaker_id'] ?? null,
            'body' => $validated['body'],
            'status' => 'open',
        ]);

        return $this->createdResponse($row->fresh(['speaker:id,name']), 'Question submitted');
    }

    public function updateDiscussion(Request $request, $event, $discussion): JsonResponse
    {
        $participation = $this->activeParticipationOrFail($request, $event);
        if ($participation instanceof JsonResponse) {
            return $participation;
        }

        $row = EventDiscussion::query()
            ->where('event_id', $participation->event_id)
            ->where('user_id', $request->user()->id)
            ->whereKey($discussion)
            ->first();

        if (! $row) {
            return $this->notFoundResponse('Discussion not found');
        }

        $validated = $request->validate([
            'body' => 'required|string|max:2000',
        ]);

        $row->body = $validated['body'];
        $row->save();

        return $this->successResponse($row->fresh(['speaker:id,name']), 'Question updated');
    }

    public function destroyDiscussion(Request $request, $event, $discussion): JsonResponse
    {
        $participation = $this->activeParticipationOrFail($request, $event);
        if ($participation instanceof JsonResponse) {
            return $participation;
        }

        $row = EventDiscussion::query()
            ->where('event_id', $participation->event_id)
            ->where('user_id', $request->user()->id)
            ->whereKey($discussion)
            ->first();

        if (! $row) {
            return $this->notFoundResponse('Discussion not found');
        }

        $row->delete();

        return $this->noContentResponse('Question deleted');
    }
}
