<?php

namespace App\Http\Controllers\Api\Web;

use App\Enums\FormFieldType;
use App\Http\Controllers\Api\BaseController;
use App\Http\Controllers\Api\Web\Concerns\ResolvesOrganizerEvent;
use App\Models\EventFormField;
use App\Services\EventFormFieldService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrganizerFormFieldController extends BaseController
{
    use ResolvesOrganizerEvent;

    protected $model = EventFormField::class;

    public function __construct(private EventFormFieldService $formFields) {}

    public function index(Request $request): JsonResponse
    {
        $owned = $this->ownedEventOrFail($request->route('event'));
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $query = EventFormField::query()->forEvent($owned->id);

        if ($request->boolean('active_only')) {
            $query->active();
        }

        return $this->successResponse([
            'event_id' => $owned->id,
            'form_fields' => $query->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $owned = $this->ownedEventOrFail($request->route('event'));
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $validated = $request->validate([
            'key' => [
                'required',
                'string',
                'max:100',
                'regex:/^[a-z][a-z0-9_]*$/',
                Rule::unique('event_form_fields', 'key')->where(
                    fn ($q) => $q->where('event_id', $owned->id)
                ),
            ],
            'label' => 'required|string|max:255',
            'type' => ['required', Rule::in(FormFieldType::values())],
            'options' => 'nullable|array',
            'required' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer|min:0',
            'active' => 'sometimes|boolean',
        ]);

        $validated['event_id'] = $owned->id;
        $validated['required'] = $validated['required'] ?? false;
        $validated['sort_order'] = $validated['sort_order'] ?? 0;
        $validated['active'] = $validated['active'] ?? true;

        $field = EventFormField::create($validated);

        $this->logActivity(
            'Event form field was created',
            $field,
            ['attributes' => $field->getAttributes()],
            'created'
        );

        return $this->createdResponse($field->fresh('event'));
    }

    public function update(Request $request, $field): JsonResponse
    {
        $owned = $this->ownedFormFieldOrFail($field);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        if ($request->exists('key')) {
            return $this->badRequestResponse('Form field key cannot be changed.');
        }

        $validated = $request->validate([
            'label' => 'sometimes|string|max:255',
            'type' => ['sometimes', Rule::in(FormFieldType::values())],
            'options' => 'nullable|array',
            'required' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer|min:0',
            'active' => 'sometimes|boolean',
        ]);

        $old = $owned->getOriginal();
        $owned->update($validated);

        $this->logActivity(
            'Event form field was updated',
            $owned,
            ['old' => $old, 'attributes' => $owned->getAttributes()],
            'updated'
        );

        return $this->successResponse($owned->fresh(), 'Form field updated');
    }

    public function reorder(Request $request, $event): JsonResponse
    {
        $owned = $this->ownedEventOrFail($event);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $validated = $request->validate([
            'ordered_ids' => 'required|array|min:1',
            'ordered_ids.*' => 'integer',
        ]);

        foreach ($validated['ordered_ids'] as $index => $fieldId) {
            EventFormField::where('id', $fieldId)
                ->where('event_id', $owned->id)
                ->update(['sort_order' => $index]);
        }

        $fields = EventFormField::query()
            ->forEvent($owned->id)
            ->orderBy('sort_order')
            ->get();

        $this->logActivity(
            'Event form fields reordered',
            $owned,
            ['event_id' => $owned->id, 'ordered_ids' => $validated['ordered_ids']],
            'updated'
        );

        return $this->successResponse([
            'event_id' => $owned->id,
            'form_fields' => $fields,
        ], 'Form fields reordered');
    }

    public function destroy($field): JsonResponse
    {
        $owned = $this->ownedFormFieldOrFail($field);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $result = $this->formFields->remove($owned);

        $this->logActivity(
            $result['action'] === 'deactivated'
                ? 'Event form field was deactivated (answers exist)'
                : 'Event form field was deleted',
            $owned,
            ['action' => $result['action'], 'key' => $owned->key],
            $result['action'] === 'deactivated' ? 'updated' : 'deleted'
        );

        return $this->successResponse([
            'action' => $result['action'],
            'form_field' => $result['field'],
        ], $result['action'] === 'deactivated'
            ? 'Form field deactivated (historical answers retained).'
            : 'Form field deleted.');
    }
}
