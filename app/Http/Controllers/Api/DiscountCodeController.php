<?php

namespace App\Http\Controllers\Api;

use App\Enums\DiscountCodeType;
use App\Models\DiscountCode;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Admin read-only oversight of discount codes (+ store for ops/tests).
 * Organizers manage codes on Web App later. Scope enforced in queries.
 */
class DiscountCodeController extends BaseController
{
    protected $model = DiscountCode::class;

    protected $searchableFields = ['code'];

    protected $sortableFields = ['id', 'code', 'type', 'value', 'expires_at', 'created_at'];

    protected $relationships = ['event', 'organizer'];

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

        // Event-scoped codes for this event + organizer-wide codes for the event's organizer
        $codes = DiscountCode::query()
            ->where(function ($q) use ($event) {
                $q->where('event_id', $event->id)
                    ->orWhere(function ($q2) use ($event) {
                        $q2->whereNull('event_id')
                            ->where('organizer_id', $event->organizer_id);
                    });
            })
            ->orderByDesc('created_at')
            ->get();

        return $this->successResponse([
            'event_id' => (int) $eventId,
            'discount_codes' => $codes,
        ]);
    }

    /**
     * Validate a code against a specific event (scope at query level).
     */
    public function validateForEvent(Request $request, $eventId)
    {
        $event = Event::find($eventId);
        if (! $event) {
            return $this->notFoundResponse('Event not found');
        }

        $validated = $request->validate([
            'code' => 'required|string|max:64',
        ]);

        $code = DiscountCode::query()
            ->usableForEvent($event)
            ->byCode($validated['code'])
            ->first();

        if (! $code) {
            return $this->notFoundResponse('Discount code not valid for this event');
        }

        if ($code->isExpired()) {
            return $this->badRequestResponse('Discount code has expired');
        }

        if (! $code->hasRemainingUses()) {
            return $this->badRequestResponse('Discount code usage limit reached');
        }

        return $this->successResponse($code, 'Discount code is valid for this event');
    }

    /**
     * Ops/test create — Web App will own organizer management later.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|max:64',
            'event_id' => 'nullable|integer|exists:events,id',
            'organizer_id' => 'nullable|integer|exists:organizers,id',
            'type' => ['required', Rule::in(DiscountCodeType::values())],
            'value' => 'required|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'expires_at' => 'nullable|date',
            'active' => 'sometimes|boolean',
        ]);

        if (empty($validated['event_id']) && empty($validated['organizer_id'])) {
            return $this->badRequestResponse('Provide event_id (event-scoped) or organizer_id (organizer-wide).');
        }

        if (! empty($validated['event_id'])) {
            $event = Event::findOrFail($validated['event_id']);
            $validated['organizer_id'] = $validated['organizer_id'] ?? $event->organizer_id;
        }

        if (($validated['type'] ?? null) === DiscountCodeType::PERCENT->value && $validated['value'] > 100) {
            return $this->badRequestResponse('Percent discount cannot exceed 100.');
        }

        $validated['usage_count'] = 0;
        $validated['active'] = $validated['active'] ?? true;
        $validated['code'] = strtoupper($validated['code']);

        $code = DiscountCode::create($validated);

        $this->logActivity(
            'Discount code was created',
            $code,
            ['attributes' => $code->getAttributes()],
            'created'
        );

        return $this->createdResponse($code);
    }

    /**
     * Update allowed fields on an existing discount code.
     */
    public function update(Request $request, $id)
    {
        $code = DiscountCode::find($id);
        if (! $code) {
            return $this->notFoundResponse();
        }

        $validated = $request->validate([
            'code' => 'sometimes|string|max:64',
            'event_id' => 'nullable|integer|exists:events,id',
            'organizer_id' => 'nullable|integer|exists:organizers,id',
            'type' => ['sometimes', Rule::in(DiscountCodeType::values())],
            'value' => 'sometimes|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'expires_at' => 'nullable|date',
            'active' => 'sometimes|boolean',
        ]);

        $type = $validated['type'] ?? $code->type?->value;
        $value = $validated['value'] ?? $code->value;

        if ($type === DiscountCodeType::PERCENT->value && (float) $value > 100) {
            return $this->badRequestResponse('Percent discount cannot exceed 100.');
        }

        if (isset($validated['code'])) {
            $validated['code'] = strtoupper($validated['code']);
        }

        $old = $code->getOriginal();
        $code->update($validated);

        $this->logActivity(
            'Discount code was updated',
            $code,
            ['old' => $old, 'attributes' => $code->getAttributes()],
            'updated'
        );

        return $this->successResponse($code->fresh(), 'Discount code updated');
    }

    /**
     * Soft-delete a discount code.
     */
    public function destroy($id)
    {
        $code = DiscountCode::find($id);
        if (! $code) {
            return $this->notFoundResponse();
        }

        $code->delete();

        $this->logActivity(
            'Discount code was deleted',
            $code,
            ['code' => $code->code],
            'deleted'
        );

        return $this->noContentResponse('Discount code deleted');
    }
}
