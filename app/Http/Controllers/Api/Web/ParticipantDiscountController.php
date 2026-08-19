<?php

namespace App\Http\Controllers\Api\Web;

use App\Models\Event;
use App\Models\TicketType;
use App\Services\DiscountPricingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class ParticipantDiscountController extends WebController
{
    public function __construct(private DiscountPricingService $pricing) {}

    public function validateForEvent(Request $request, $event): JsonResponse
    {
        $row = Event::query()->publicCatalog()->find($event);
        if (! $row) {
            return $this->notFoundResponse('Event not found');
        }

        $validated = $request->validate([
            'code' => 'required|string|max:64',
            'ticket_type_id' => 'required|integer|exists:ticket_types,id',
        ]);

        $ticket = TicketType::query()
            ->whereKey($validated['ticket_type_id'])
            ->where('event_id', $row->id)
            ->where('sales_enabled', true)
            ->first();

        if (! $ticket) {
            return $this->notFoundResponse('Ticket type not found');
        }

        $code = $this->pricing->findScoped($row, $validated['code']);
        if (! $code) {
            return $this->errorResponse('Discount code not valid for this event', [
                'error_code' => [DiscountPricingService::ERROR_NOT_FOUND],
            ], 404);
        }

        try {
            $this->pricing->assertUsable($code);
        } catch (InvalidArgumentException $e) {
            return $this->badRequestResponse(
                DiscountPricingService::customerMessage($e->getMessage()),
                ['error_code' => [$e->getMessage()]]
            );
        }

        $quote = $this->pricing->quote($ticket, $code);
        unset($quote['discount_code_id']);

        return $this->successResponse($quote, 'Discount code is valid for this event');
    }
}
