<?php

namespace App\Http\Controllers\Api\Web;

use App\Http\Controllers\Api\BaseController;
use App\Http\Controllers\Api\Web\Concerns\ResolvesOrganizerEvent;
use App\Models\EventInvitationTemplate;
use App\Models\InvitationSystemTemplate;
use App\Support\InvitationCanvas;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Organizer Web App invitation templates — system catalog (active) + per-event upsert.
 */
class OrganizerInvitationController extends BaseController
{
    use ResolvesOrganizerEvent;

    public function systemTemplates(): JsonResponse
    {
        $templates = InvitationSystemTemplate::query()
            ->where('active', true)
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'slug',
                'thumbnail_path',
                'background_image_path',
                'default_overlay_positions',
                'default_customizations',
            ]);

        return $this->successResponse($templates);
    }

    public function show($event): JsonResponse
    {
        $owned = $this->ownedEventOrFail($event);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $template = EventInvitationTemplate::query()
            ->with('systemTemplate')
            ->where('event_id', $owned->id)
            ->first();

        return $this->successResponse([
            'event_id' => $owned->id,
            'template' => $template,
            'canvas' => $this->canvasPayload(),
        ]);
    }

    public function storeForEvent(Request $request, $event): JsonResponse
    {
        return $this->upsert($request, $event);
    }

    public function update(Request $request, $event): JsonResponse
    {
        return $this->upsert($request, $event);
    }

    public function uploadBackground(Request $request, $event): JsonResponse
    {
        $owned = $this->ownedEventOrFail($event);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $request->validate([
            'background' => 'required|file|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        $file = $request->file('background');
        $filename = 'invitation-bg-'.$owned->id.'-'.date('Y-m-d-H-i-s').'-'.uniqid().'.'.$file->getClientOriginalExtension();
        $relative = 'assets/images/events/invitations/'.$filename;
        $fullPath = public_path($relative);
        if (! is_dir(dirname($fullPath))) {
            mkdir(dirname($fullPath), 0755, true);
        }
        $file->move(dirname($fullPath), $filename);
        $path = '/'.$relative;

        $template = EventInvitationTemplate::query()->firstOrNew(['event_id' => $owned->id]);
        $isNew = ! $template->exists;

        if ($isNew) {
            $template->mode = 'custom';
            $template->overlay_positions = InvitationCanvas::defaultOverlayPositions();
            $template->customizations = InvitationCanvas::defaultCustomizations();
        }

        $template->background_image_path = $path;
        $template->save();

        $this->logActivity(
            $isNew ? 'Event invitation template was created' : 'Event invitation template was updated',
            $template,
            ['background_image_path' => $path, 'event_id' => $owned->id],
            $isNew ? 'created' : 'updated'
        );

        $fresh = $template->fresh(['systemTemplate']);

        return $isNew
            ? $this->createdResponse($this->eventTemplatePayload($owned->id, $fresh), 'Background uploaded')
            : $this->successResponse($this->eventTemplatePayload($owned->id, $fresh), 'Background uploaded');
    }

    private function upsert(Request $request, $event): JsonResponse
    {
        $owned = $this->ownedEventOrFail($event);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $existing = EventInvitationTemplate::query()
            ->where('event_id', $owned->id)
            ->first();
        $isNew = $existing === null;

        $validated = $request->validate([
            'mode' => ($isNew ? 'required' : 'sometimes|required').'|in:template,custom',
            'system_template_id' => [
                'nullable',
                'required_if:mode,template',
                'integer',
                Rule::exists('invitation_system_templates', 'id')->where(function ($q) {
                    $q->where('active', true)->whereNull('deleted_at');
                }),
            ],
            'customizations' => 'nullable|array',
            'overlay_positions' => 'nullable|array',
        ]);

        $template = $existing ?? new EventInvitationTemplate(['event_id' => $owned->id]);

        if ($isNew) {
            $template->overlay_positions = $validated['overlay_positions'] ?? InvitationCanvas::defaultOverlayPositions();
            $template->customizations = $validated['customizations'] ?? InvitationCanvas::defaultCustomizations();
        }

        $template->fill($validated);
        $template->event_id = $owned->id;
        $template->save();

        $this->logActivity(
            $isNew ? 'Event invitation template was created' : 'Event invitation template was updated',
            $template,
            [
                'event_id' => $owned->id,
                'mode' => $template->mode,
                'system_template_id' => $template->system_template_id,
            ],
            $isNew ? 'created' : 'updated'
        );

        $fresh = $template->fresh(['systemTemplate']);
        $payload = $this->eventTemplatePayload($owned->id, $fresh);

        return $isNew
            ? $this->createdResponse($payload)
            : $this->successResponse($payload);
    }

    /**
     * @return array{event_id: int, template: EventInvitationTemplate, canvas: array<string, int|string>}
     */
    private function eventTemplatePayload(int $eventId, EventInvitationTemplate $template): array
    {
        return [
            'event_id' => $eventId,
            'template' => $template,
            'canvas' => $this->canvasPayload(),
        ];
    }

    /**
     * @return array{width: int, height: int, orientation: string}
     */
    private function canvasPayload(): array
    {
        return [
            'width' => InvitationCanvas::WIDTH,
            'height' => InvitationCanvas::HEIGHT,
            'orientation' => 'portrait',
        ];
    }
}
