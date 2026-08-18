<?php

namespace App\Http\Controllers\Api\Web;

use App\Http\Controllers\Api\BaseController;
use App\Http\Controllers\Api\Web\Concerns\ResolvesOrganizerEvent;
use App\Models\Event;
use App\Models\TicketType;
use App\Services\EventMonetization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrganizerTicketTypeController extends BaseController
{
    use ResolvesOrganizerEvent;

    protected $model = TicketType::class;

    public function index(Request $request): JsonResponse
    {
        $owned = $this->ownedEventOrFail($request->route('event'));
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $types = TicketType::query()
            ->where('event_id', $owned->id)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return $this->successResponse([
            'event_id' => $owned->id,
            'monetized' => (bool) $owned->monetized,
            'derived_monetized' => EventMonetization::hasPaidTicketTypes($owned),
            'ticket_types' => $types,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $owned = $this->ownedEventOrFail($request->route('event'));
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'quantity_limit' => 'nullable|integer|min:0',
            'sort_order' => 'sometimes|integer|min:0',
            'sales_enabled' => 'sometimes|boolean',
        ]);

        $validated['event_id'] = $owned->id;
        $validated['quantity_sold'] = 0;
        $validated['sort_order'] = $validated['sort_order'] ?? 0;
        $validated['sales_enabled'] = $validated['sales_enabled'] ?? true;

        $ticketType = TicketType::create($validated);
        EventMonetization::syncMonetized($owned->fresh());

        $this->logActivity(
            'Ticket type was created',
            $ticketType,
            ['attributes' => $ticketType->getAttributes()],
            'created'
        );

        return $this->createdResponse($ticketType->fresh('event'));
    }

    public function update(Request $request, $ticketType): JsonResponse
    {
        $owned = $this->ownedTicketTypeOrFail($ticketType);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'price' => 'sometimes|numeric|min:0',
            'quantity_limit' => 'nullable|integer|min:0',
            'sales_enabled' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $old = $owned->getOriginal();
        $priceChanged = isset($validated['price']) && (float) $validated['price'] !== (float) $owned->price;

        $owned->update($validated);

        if ($priceChanged) {
            EventMonetization::syncMonetized($owned->fresh()->event);
        }

        $this->logActivity(
            'Ticket type was updated',
            $owned,
            ['old' => $old, 'attributes' => $owned->getAttributes()],
            'updated'
        );

        return $this->successResponse($owned->fresh(), 'Ticket type updated');
    }

    public function updateSales(Request $request, $ticketType): JsonResponse
    {
        $owned = $this->ownedTicketTypeOrFail($ticketType);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $validated = $request->validate([
            'sales_enabled' => 'required|boolean',
        ]);

        $owned->sales_enabled = $validated['sales_enabled'];
        $owned->save();

        $this->logActivity(
            $owned->sales_enabled ? 'Ticket type sales enabled' : 'Ticket type sales disabled',
            $owned,
            ['sales_enabled' => $owned->sales_enabled],
            $owned->sales_enabled ? 'sales_enabled' : 'sales_disabled'
        );

        return $this->successResponse(
            $owned,
            $owned->sales_enabled
                ? 'Sales re-enabled for this ticket type'
                : 'Further sales disabled for this ticket type'
        );
    }

    public function destroy($ticketType): JsonResponse
    {
        $owned = $this->ownedTicketTypeOrFail($ticketType);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        // Soft-delete only. Force-delete is blocked when quantity_sold > 0 (admin forceDestroy);
        // organizers never hard-delete ticket types.
        $eventId = $owned->event_id;
        $owned->delete();

        $event = Event::find($eventId);
        if ($event) {
            EventMonetization::syncMonetized($event);
        }

        $this->logActivity(
            'Ticket type was soft-deleted',
            $owned,
            ['quantity_sold' => $owned->quantity_sold],
            'deleted'
        );

        return $this->noContentResponse('Ticket type moved to trash (soft delete)');
    }
}
