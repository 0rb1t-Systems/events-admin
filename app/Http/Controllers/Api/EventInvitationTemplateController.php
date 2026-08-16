<?php

namespace App\Http\Controllers\Api;

use App\Models\Event;
use App\Models\EventInvitationTemplate;
use Illuminate\Http\Request;

/**
 * Invitation template storage — Admin read-only; Web App owns designer later.
 * Store exists for ops/tests.
 */
class EventInvitationTemplateController extends BaseController
{
    protected $model = EventInvitationTemplate::class;

    protected $searchableFields = [];

    protected $sortableFields = ['id', 'event_id', 'created_at'];

    protected $relationships = ['event'];

    protected $validationRules = [
        'store' => [],
        'update' => [],
    ];

    public function forEvent($eventId)
    {
        $event = Event::find($eventId);
        if (! $event) {
            return $this->notFoundResponse('Event not found');
        }

        $template = EventInvitationTemplate::query()
            ->where('event_id', $eventId)
            ->first();

        return $this->successResponse([
            'event_id' => (int) $eventId,
            'template' => $template,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'event_id' => 'required|integer|exists:events,id|unique:event_invitation_templates,event_id',
            'config' => 'nullable|array',
        ]);

        $template = EventInvitationTemplate::create($validated);

        $this->logActivity(
            'Event invitation template was created',
            $template,
            ['attributes' => $template->getAttributes()],
            'created'
        );

        return $this->createdResponse($template->fresh('event'));
    }

    public function update(Request $request, $id)
    {
        $template = EventInvitationTemplate::find($id);
        if (! $template) {
            return $this->notFoundResponse();
        }

        $validated = $request->validate([
            'config' => 'nullable|array',
        ]);

        $old = $template->getOriginal();
        $template->update($validated);

        $this->logActivity(
            'Event invitation template was updated',
            $template,
            ['old' => $old, 'attributes' => $template->getAttributes()],
            'updated'
        );

        return $this->successResponse($template->fresh('event'));
    }
}
