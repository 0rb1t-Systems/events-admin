<?php

namespace App\Http\Controllers\Api\Web;

use App\Models\Event;
use App\Models\EventInvitationTemplate;
use App\Models\Participation;
use App\Services\ParticipationService;
use App\Support\InvitationCanvas;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

class ParticipantParticipationController extends WebController
{
    public function __construct(private ParticipationService $participations) {}

    public function index(Request $request): JsonResponse
    {
        $query = Participation::query()
            ->with(['event', 'ticketType'])
            ->where('user_id', $request->user()->id);

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $query->orderByDesc('created_at');

        $perPage = min(max($request->integer('per_page', 15), 1), 100);
        $paginator = $query->paginate($perPage);

        return $this->successResponse($this->webPaginatorPayload($paginator));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'event_id' => 'required|integer|exists:events,id',
            'ticket_type_id' => 'nullable|integer|exists:ticket_types,id',
            'discount_code' => 'nullable|string|max:64',
            'custom_field_answers' => 'nullable|array',
        ]);

        $event = Event::find($validated['event_id']);
        if (! $event) {
            return $this->notFoundResponse('Event not found');
        }

        $user = $request->user();

        try {
            $participation = $this->participations->join(
                $event,
                $user,
                $validated['ticket_type_id'] ?? null,
                $validated['custom_field_answers'] ?? null,
                true,
                $validated['discount_code'] ?? null
            );
        } catch (ValidationException $e) {
            return $this->validationErrorResponse($e->errors());
        } catch (InvalidArgumentException $e) {
            $code = $e->getMessage();
            if (str_starts_with($code, 'discount_')) {
                return $this->badRequestResponse(
                    \App\Services\DiscountPricingService::customerMessage($code),
                    ['error_code' => [$code]]
                );
            }

            return $this->badRequestResponse($e->getMessage());
        } catch (RuntimeException $e) {
            return $this->badRequestResponse($e->getMessage());
        } catch (Throwable $e) {
            if (str_contains($e->getMessage(), 'UNIQUE') || str_contains($e->getMessage(), 'Duplicate')) {
                return $this->badRequestResponse('User already has an active participation for this event.');
            }
            throw $e;
        }

        return $this->createdResponse(
            $participation->fresh(['event', 'ticketType']),
            'Participation created'
        );
    }

    public function show($participation): JsonResponse
    {
        $row = $this->ownedParticipationOrFail($participation);
        if ($row instanceof JsonResponse) {
            return $row;
        }

        return $this->successResponse($row->load(['event', 'ticketType']));
    }

    public function cancel($participation): JsonResponse
    {
        $row = $this->ownedParticipationOrFail($participation);
        if ($row instanceof JsonResponse) {
            return $row;
        }

        try {
            $row = $this->participations->cancel($row);
        } catch (InvalidArgumentException $e) {
            return $this->badRequestResponse($e->getMessage());
        }

        return $this->successResponse($row->fresh(['event', 'ticketType']), 'Participation cancelled');
    }

    public function invitation($participation): JsonResponse
    {
        $row = $this->ownedParticipationOrFail($participation);
        if ($row instanceof JsonResponse) {
            return $row;
        }

        $row->load(['event', 'ticketType']);

        $template = EventInvitationTemplate::query()
            ->with('systemTemplate')
            ->where('event_id', $row->event_id)
            ->first();

        $invitation = null;
        if ($template) {
            $invitation = [
                'mode' => $template->mode,
                'system_template' => $template->systemTemplate,
                'background_image_path' => $template->background_image_path,
                'customizations' => $template->customizations,
                'overlay_positions' => $template->overlay_positions,
            ];
        }

        return $this->successResponse([
            'id' => $row->id,
            'status' => $row->status,
            'payment_status' => $row->payment_status,
            'qr_token' => $row->qr_token,
            'created_at' => $row->created_at,
            'event' => $row->event,
            'ticket_type' => $row->ticketType,
            'invitation' => $invitation,
            'canvas' => [
                'width' => InvitationCanvas::WIDTH,
                'height' => InvitationCanvas::HEIGHT,
            ],
        ]);
    }

    public function certificate($participation): JsonResponse
    {
        $row = $this->ownedParticipationOrFail($participation);
        if ($row instanceof JsonResponse) {
            return $row;
        }

        $certificate = $row->certificate;

        if (! $certificate) {
            return $this->successResponse([
                'available' => false,
                'certificate' => null,
            ]);
        }

        return $this->successResponse([
            'available' => true,
            'certificate' => [
                'id' => $certificate->id,
                'issued_at' => $certificate->issued_at,
                'file_path' => $certificate->file_path,
                'file_url' => $certificate->file_url,
                'verified' => (bool) $certificate->verified,
            ],
        ]);
    }
}
