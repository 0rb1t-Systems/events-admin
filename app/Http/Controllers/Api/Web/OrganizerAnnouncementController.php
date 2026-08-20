<?php

namespace App\Http\Controllers\Api\Web;

use App\Enums\ParticipationStatus;
use App\Http\Controllers\Api\BaseController;
use App\Http\Controllers\Api\Web\Concerns\ResolvesOrganizerEvent;
use App\Models\EventAnnouncement;
use App\Models\Participation;
use App\Services\MailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Organizer Web API — announcements for owned events only (cross-organizer → 404).
 * Store queues emails to non-cancelled participants (same as EventAddOnController::storeAnnouncement).
 */
class OrganizerAnnouncementController extends BaseController
{
    use ResolvesOrganizerEvent;

    protected $model = EventAnnouncement::class;

    protected $searchableFields = [];

    protected $sortableFields = ['id', 'sent_at'];

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

        $paginator = EventAnnouncement::query()
            ->where('event_id', $owned->id)
            ->orderByDesc('sent_at')
            ->orderByDesc('id')
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
            'subject' => 'required|string|max:255',
            'body' => 'required|string|max:10000',
        ]);

        $announcement = EventAnnouncement::create([
            'event_id' => $owned->id,
            'subject' => $validated['subject'],
            'body' => $validated['body'],
            'sent_at' => now(),
            'sent_by' => $this->organizer()->id,
        ]);

        $participations = Participation::query()
            ->with('user')
            ->where('event_id', $owned->id)
            ->where('status', '!=', ParticipationStatus::CANCELLED->value)
            ->get();

        $mailService = app(MailService::class);
        $recipientCount = 0;

        foreach ($participations as $participation) {
            if ($participation->user) {
                $mailService->sendEmailQueued(
                    $participation->user,
                    'notification',
                    [
                        'subject' => $validated['subject'],
                        'body' => $validated['body'],
                        'user_name' => $participation->user->name,
                    ]
                );
                $recipientCount++;
            }
        }

        $this->logActivity(
            'Event announcement sent',
            $announcement,
            [
                'event_id' => $owned->id,
                'subject' => $validated['subject'],
                'recipients' => $recipientCount,
            ],
            'created'
        );

        return $this->createdResponse(
            $announcement,
            'Announcement sent to '.$recipientCount.' participant(s)'
        );
    }
}
