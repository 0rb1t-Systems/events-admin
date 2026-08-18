<?php

namespace App\Http\Controllers\Api\Web;

use App\Enums\DiscountCodeType;
use App\Http\Controllers\Api\BaseController;
use App\Http\Controllers\Api\Web\Concerns\ResolvesOrganizerEvent;
use App\Models\DiscountCode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrganizerDiscountCodeController extends BaseController
{
    use ResolvesOrganizerEvent;

    protected $model = DiscountCode::class;

    public function index(Request $request): JsonResponse
    {
        $owned = $this->ownedEventOrFail($request->route('event'));
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $codes = DiscountCode::query()
            ->where(function ($q) use ($owned) {
                $q->where('event_id', $owned->id)
                    ->orWhere(function ($q2) use ($owned) {
                        $q2->whereNull('event_id')
                            ->where('organizer_id', $owned->organizer_id);
                    });
            })
            ->orderByDesc('created_at')
            ->get();

        return $this->successResponse([
            'event_id' => $owned->id,
            'discount_codes' => $codes,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $owned = $this->ownedEventOrFail($request->route('event'));
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $validated = $request->validate([
            'code' => 'required|string|max:64',
            'type' => ['required', Rule::in(DiscountCodeType::values())],
            'value' => 'required|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'expires_at' => 'nullable|date',
            'active' => 'sometimes|boolean',
        ]);

        if ($validated['type'] === DiscountCodeType::PERCENT->value && $validated['value'] > 100) {
            return $this->badRequestResponse('Percent discount cannot exceed 100.');
        }

        $validated['event_id'] = $owned->id;
        $validated['organizer_id'] = $owned->organizer_id;
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

    public function update(Request $request, $discountCode): JsonResponse
    {
        $owned = $this->ownedDiscountCodeOrFail($discountCode);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $validated = $request->validate([
            'code' => 'sometimes|string|max:64',
            'type' => ['sometimes', Rule::in(DiscountCodeType::values())],
            'value' => 'sometimes|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'expires_at' => 'nullable|date',
            'active' => 'sometimes|boolean',
        ]);

        $type = $validated['type'] ?? ($owned->type instanceof DiscountCodeType ? $owned->type->value : $owned->type);
        $value = $validated['value'] ?? $owned->value;

        if ($type === DiscountCodeType::PERCENT->value && (float) $value > 100) {
            return $this->badRequestResponse('Percent discount cannot exceed 100.');
        }

        if (isset($validated['code'])) {
            $validated['code'] = strtoupper($validated['code']);
        }

        $old = $owned->getOriginal();
        $owned->update($validated);

        $this->logActivity(
            'Discount code was updated',
            $owned,
            ['old' => $old, 'attributes' => $owned->getAttributes()],
            'updated'
        );

        return $this->successResponse($owned->fresh(), 'Discount code updated');
    }

    public function updateActive(Request $request, $discountCode): JsonResponse
    {
        $owned = $this->ownedDiscountCodeOrFail($discountCode);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $validated = $request->validate([
            'active' => 'required|boolean',
        ]);

        $owned->active = $validated['active'];
        $owned->save();

        $this->logActivity(
            $owned->active ? 'Discount code activated' : 'Discount code deactivated',
            $owned,
            ['active' => $owned->active],
            'updated'
        );

        return $this->successResponse($owned->fresh(), 'Discount code updated');
    }

    public function destroy($discountCode): JsonResponse
    {
        $owned = $this->ownedDiscountCodeOrFail($discountCode);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $owned->delete();

        $this->logActivity(
            'Discount code was deleted',
            $owned,
            ['code' => $owned->code],
            'deleted'
        );

        return $this->noContentResponse('Discount code deleted');
    }
}
