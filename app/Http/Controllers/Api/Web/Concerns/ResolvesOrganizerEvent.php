<?php

namespace App\Http\Controllers\Api\Web\Concerns;

use App\Models\DiscountCode;
use App\Models\Event;
use App\Models\EventImage;
use App\Models\EventSession;
use App\Models\EventSpeaker;
use App\Models\EventSponsor;
use App\Models\Organizer;
use App\Models\Participation;
use App\Models\PayoutRequest;
use App\Models\TicketType;
use Illuminate\Http\JsonResponse;

trait ResolvesOrganizerEvent
{
    protected function organizer(): Organizer
    {
        /** @var Organizer $organizer */
        $organizer = request()->user();

        return $organizer;
    }

    protected function ownedEventOrFail(int|string $eventId): Event|JsonResponse
    {
        $event = Event::query()
            ->whereKey($eventId)
            ->where('organizer_id', $this->organizer()->id)
            ->first();

        if (! $event) {
            return $this->notFoundResponse('Event not found');
        }

        return $event;
    }

    protected function ownedTicketTypeOrFail(int|string $id): TicketType|JsonResponse
    {
        $row = TicketType::query()
            ->whereKey($id)
            ->whereHas('event', fn ($q) => $q->where('organizer_id', $this->organizer()->id))
            ->first();

        return $row ?: $this->notFoundResponse('Ticket type not found');
    }

    protected function ownedDiscountCodeOrFail(int|string $id): DiscountCode|JsonResponse
    {
        $row = DiscountCode::query()
            ->whereKey($id)
            ->where(function ($q) {
                $q->where('organizer_id', $this->organizer()->id)
                    ->orWhereHas('event', fn ($e) => $e->where('organizer_id', $this->organizer()->id));
            })
            ->first();

        return $row ?: $this->notFoundResponse('Discount code not found');
    }

    protected function ownedSpeakerOrFail(int|string $id): EventSpeaker|JsonResponse
    {
        $row = EventSpeaker::query()
            ->whereKey($id)
            ->whereHas('event', fn ($q) => $q->where('organizer_id', $this->organizer()->id))
            ->first();

        return $row ?: $this->notFoundResponse('Speaker not found');
    }

    protected function ownedSponsorOrFail(int|string $id): EventSponsor|JsonResponse
    {
        $row = EventSponsor::query()
            ->whereKey($id)
            ->whereHas('event', fn ($q) => $q->where('organizer_id', $this->organizer()->id))
            ->first();

        return $row ?: $this->notFoundResponse('Sponsor not found');
    }

    protected function ownedSessionOrFail(int|string $id): EventSession|JsonResponse
    {
        $row = EventSession::query()
            ->whereKey($id)
            ->whereHas('event', fn ($q) => $q->where('organizer_id', $this->organizer()->id))
            ->first();

        return $row ?: $this->notFoundResponse('Session not found');
    }

    protected function ownedImageOrFail(int|string $eventId, int|string $imageId): EventImage|JsonResponse
    {
        $event = $this->ownedEventOrFail($eventId);
        if ($event instanceof JsonResponse) {
            return $event;
        }

        $row = EventImage::query()
            ->whereKey($imageId)
            ->where('event_id', $event->id)
            ->first();

        return $row ?: $this->notFoundResponse('Image not found');
    }

    protected function ownedParticipationOrFail(int|string $id): Participation|JsonResponse
    {
        $row = Participation::query()
            ->whereKey($id)
            ->whereHas('event', fn ($q) => $q->where('organizer_id', $this->organizer()->id))
            ->first();

        return $row ?: $this->notFoundResponse('Participation not found');
    }

    protected function ownedPayoutRequestOrFail(int|string $id): PayoutRequest|JsonResponse
    {
        $row = PayoutRequest::query()
            ->whereKey($id)
            ->where('organizer_id', $this->organizer()->id)
            ->first();

        return $row ?: $this->notFoundResponse('Payout request not found');
    }

    /**
     * @return array{items: mixed, pagination: array<string, mixed>}
     */
    protected function webPaginatorPayload($paginator): array
    {
        return [
            'items' => $paginator->items(),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ];
    }
}
