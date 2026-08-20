<?php

namespace App\Http\Controllers\Api;

use App\Models\Event;
use App\Models\TicketType;
use App\Services\EventMonetization;
use Illuminate\Http\Request;

/**
 * Admin oversight of ticket types — visibility + disable sales.
 * Full create/edit of tiers is Web App (organizer) scope; store exists for ops/tests.
 */
class TicketTypeController extends BaseController
{
    protected $model = TicketType::class;

    protected $searchableFields = ['name'];

    protected $sortableFields = ['id', 'name', 'price', 'quantity_limit', 'quantity_sold', 'sort_order', 'created_at'];

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

        $types = TicketType::query()
            ->where('event_id', $eventId)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return $this->successResponse([
            'event_id' => (int) $eventId,
            'monetized' => (bool) $event->monetized,
            'derived_monetized' => EventMonetization::hasPaidTicketTypes($event),
            'ticket_types' => $types,
        ]);
    }

    /**
     * Ops/test create — organizers will own full CRUD on Web App later.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'event_id' => 'required|integer|exists:events,id',
            'name' => 'required|string|max:255',
            'is_vip' => 'sometimes|boolean',
            'price' => 'required|numeric|min:0',
            'quantity_limit' => 'nullable|integer|min:0',
            'sort_order' => 'sometimes|integer|min:0',
            'sales_enabled' => 'sometimes|boolean',
        ]);

        $validated['quantity_sold'] = 0;
        $validated['sort_order'] = $validated['sort_order'] ?? 0;
        $validated['sales_enabled'] = $validated['sales_enabled'] ?? true;
        $validated['is_vip'] = $validated['is_vip'] ?? false;

        $ticketType = TicketType::create($validated);
        EventMonetization::syncMonetized($ticketType->event);

        $this->logActivity(
            'Ticket type was created',
            $ticketType,
            ['attributes' => $ticketType->getAttributes()],
            'created'
        );

        return $this->createdResponse($ticketType->fresh('event'));
    }

    /**
     * Admin full update: name, is_vip, price, quantity_limit, sales_enabled, sort_order.
     * Price changes re-sync monetized flag. VIP is never inferred from name.
     */
    public function update(Request $request, $id)
    {
        $ticketType = TicketType::find($id);
        if (! $ticketType) {
            return $this->notFoundResponse();
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'is_vip' => 'sometimes|boolean',
            'price' => 'sometimes|numeric|min:0',
            'quantity_limit' => 'nullable|integer|min:0',
            'sales_enabled' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $old = $ticketType->getOriginal();
        $priceChanged = isset($validated['price']) && (float) $validated['price'] !== (float) $ticketType->price;

        $ticketType->update($validated);

        if ($priceChanged) {
            EventMonetization::syncMonetized($ticketType->fresh()->event);
        }

        $this->logActivity(
            'Ticket type was updated',
            $ticketType,
            ['old' => $old, 'attributes' => $ticketType->getAttributes()],
            'updated'
        );

        return $this->successResponse($ticketType->fresh(), 'Ticket type updated');
    }

    public function disableSales($id)
    {
        $ticketType = TicketType::find($id);
        if (! $ticketType) {
            return $this->notFoundResponse();
        }

        $ticketType->sales_enabled = false;
        $ticketType->save();

        $this->logActivity(
            'Ticket type sales disabled',
            $ticketType,
            ['sales_enabled' => false],
            'sales_disabled'
        );

        return $this->successResponse($ticketType, 'Further sales disabled for this ticket type');
    }

    public function enableSales($id)
    {
        $ticketType = TicketType::find($id);
        if (! $ticketType) {
            return $this->notFoundResponse();
        }

        $ticketType->sales_enabled = true;
        $ticketType->save();

        return $this->successResponse($ticketType, 'Sales re-enabled for this ticket type');
    }

    public function destroy($id)
    {
        $ticketType = TicketType::find($id);
        if (! $ticketType) {
            return $this->notFoundResponse();
        }

        // Soft-delete only — preserves financial history when quantity_sold > 0
        $eventId = $ticketType->event_id;
        $ticketType->delete();

        $event = Event::find($eventId);
        if ($event) {
            EventMonetization::syncMonetized($event);
        }

        $this->logActivity(
            'Ticket type was soft-deleted',
            $ticketType,
            ['quantity_sold' => $ticketType->quantity_sold],
            'deleted'
        );

        return $this->noContentResponse('Ticket type moved to trash (soft delete)');
    }

    public function forceDestroy($id)
    {
        $ticketType = TicketType::withTrashed()->find($id);
        if (! $ticketType) {
            return $this->notFoundResponse();
        }

        if ($ticketType->hasSales()) {
            return $this->forbiddenResponse(
                'Cannot permanently delete a ticket type that has sales. Soft-delete only to preserve financial history.'
            );
        }

        $eventId = $ticketType->event_id;
        $ticketType->forceDelete();

        $event = Event::find($eventId);
        if ($event) {
            EventMonetization::syncMonetized($event);
        }

        return $this->noContentResponse('Ticket type permanently deleted');
    }
}
