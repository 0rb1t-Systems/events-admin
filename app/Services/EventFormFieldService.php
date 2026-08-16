<?php

namespace App\Services;

use App\Models\EventFormField;
use App\Models\Participation;

/**
 * Soft-handles form field removal so historical custom_field_answers stay displayable.
 * There is no FK from answers → fields; answers are JSON snapshots validated only at submit.
 */
class EventFormFieldService
{
    /**
     * Deactivate when any participation already recorded an answer for this key;
     * otherwise hard-delete is safe (no historical orphan risk).
     *
     * @return array{action: 'deactivated'|'deleted', field: EventFormField|null}
     */
    public function remove(EventFormField $field): array
    {
        if ($this->hasRecordedAnswers($field)) {
            $field->active = false;
            $field->save();

            return ['action' => 'deactivated', 'field' => $field->fresh()];
        }

        $field->delete();

        return ['action' => 'deleted', 'field' => null];
    }

    public function hasRecordedAnswers(EventFormField $field): bool
    {
        return Participation::query()
            ->where('event_id', $field->event_id)
            ->whereNotNull('custom_field_answers')
            ->get(['custom_field_answers'])
            ->contains(function (Participation $p) use ($field) {
                $answers = $p->custom_field_answers;

                return is_array($answers) && array_key_exists($field->key, $answers);
            });
    }
}
