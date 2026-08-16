<?php

namespace App\Http\Controllers\Api;

use App\Enums\FormFieldType;
use App\Models\Event;
use App\Models\EventFormField;
use App\Services\EventFormFieldService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Admin: read-only form schema oversight.
 * Store / remove exist for ops + tests; Web App (organizer) will own authoring later.
 */
class EventFormFieldController extends BaseController
{
    protected $model = EventFormField::class;

    protected $searchableFields = ['key', 'label'];

    protected $sortableFields = ['id', 'key', 'label', 'type', 'sort_order', 'created_at'];

    protected $relationships = ['event'];

    protected $validationRules = [
        'store' => [],
        'update' => [],
    ];

    public function __construct(private EventFormFieldService $formFields) {}

    public function forEvent(Request $request, $eventId)
    {
        $event = Event::find($eventId);
        if (! $event) {
            return $this->notFoundResponse('Event not found');
        }

        $query = EventFormField::query()->forEvent((int) $eventId);

        // Admin oversight sees inactive fields too (historical schema); ?active=1 filters
        if ($request->boolean('active_only')) {
            $query->active();
        }

        return $this->successResponse([
            'event_id' => (int) $eventId,
            'form_fields' => $query->get(),
        ]);
    }

    /**
     * Ops/test create — organizers will own form builder on Web App.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'event_id' => 'required|integer|exists:events,id',
            'key' => [
                'required',
                'string',
                'max:100',
                'regex:/^[a-z][a-z0-9_]*$/',
                Rule::unique('event_form_fields', 'key')->where(
                    fn ($q) => $q->where('event_id', $request->integer('event_id'))
                ),
            ],
            'label' => 'required|string|max:255',
            'type' => ['required', Rule::in(FormFieldType::values())],
            'options' => 'nullable|array',
            'required' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer|min:0',
            'active' => 'sometimes|boolean',
        ]);

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

    /**
     * Update label, type, options, required, sort_order, active.
     * Key change is disallowed (answers stored by key — changing key would orphan historical answers).
     */
    public function update(Request $request, $id)
    {
        $field = EventFormField::find($id);
        if (! $field) {
            return $this->notFoundResponse();
        }

        $validated = $request->validate([
            'label' => 'sometimes|string|max:255',
            'type' => ['sometimes', Rule::in(FormFieldType::values())],
            'options' => 'nullable|array',
            'required' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer|min:0',
            'active' => 'sometimes|boolean',
        ]);

        $old = $field->getOriginal();
        $field->update($validated);

        $this->logActivity(
            'Event form field was updated',
            $field,
            ['old' => $old, 'attributes' => $field->getAttributes()],
            'updated'
        );

        return $this->successResponse($field->fresh(), 'Form field updated');
    }

    /**
     * Reorder fields for an event. Accepts ordered_ids array and event_id.
     * Sets sort_order sequentially (0-based index).
     */
    public function reorder(Request $request)
    {
        $validated = $request->validate([
            'event_id' => 'required|integer|exists:events,id',
            'ordered_ids' => 'required|array|min:1',
            'ordered_ids.*' => 'integer',
        ]);

        foreach ($validated['ordered_ids'] as $index => $fieldId) {
            EventFormField::where('id', $fieldId)
                ->where('event_id', $validated['event_id'])
                ->update(['sort_order' => $index]);
        }

        $fields = EventFormField::query()
            ->forEvent($validated['event_id'])
            ->orderBy('sort_order')
            ->get();

        $this->logActivity(
            'Event form fields reordered',
            null,
            ['event_id' => $validated['event_id'], 'ordered_ids' => $validated['ordered_ids']],
            'updated'
        );

        return $this->successResponse([
            'event_id' => (int) $validated['event_id'],
            'form_fields' => $fields,
        ], 'Form fields reordered');
    }

    /**
     * Soft-handle remove: deactivate if answers exist, else hard-delete.
     */
    public function destroy($id)
    {
        $field = EventFormField::find($id);
        if (! $field) {
            return $this->notFoundResponse();
        }

        $result = $this->formFields->remove($field);

        $this->logActivity(
            $result['action'] === 'deactivated'
                ? 'Event form field was deactivated (answers exist)'
                : 'Event form field was deleted',
            $field,
            ['action' => $result['action'], 'key' => $field->key],
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
