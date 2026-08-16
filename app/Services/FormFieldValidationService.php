<?php

namespace App\Services;

use App\Enums\FormFieldType;
use App\Models\Event;
use App\Models\EventFormField;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Validates participations.custom_field_answers against an event's form schema.
 *
 * Validation runs at submission time only — historical answers are never
 * retroactively invalidated when the schema changes.
 *
 * Web App join will call validateOrFail() / validate().
 */
class FormFieldValidationService
{
    /**
     * @param  Collection<int, EventFormField>|iterable<EventFormField>|null  $fields
     * @param  array<string, mixed>|null  $answers
     * @return array{valid: bool, errors: array<string, list<string>>}
     */
    public function validate(Event|int $event, ?array $answers, iterable $fields = null): array
    {
        $eventId = $event instanceof Event ? (int) $event->id : (int) $event;
        $answers = $answers ?? [];

        $schema = $fields !== null
            ? collect($fields)->filter(fn ($f) => $f->active)->values()
            : EventFormField::query()->forEvent($eventId)->active()->get();

        $errors = [];

        foreach ($schema as $field) {
            $key = $field->key;
            $present = array_key_exists($key, $answers) && ! $this->isEmptyAnswer($answers[$key], $field->type);

            if ($field->required && ! $present) {
                $errors[$key][] = "The {$field->label} field is required.";

                continue;
            }

            if (! $present) {
                continue;
            }

            $typeErrors = $this->validateType($field, $answers[$key]);
            if ($typeErrors !== []) {
                $errors[$key] = array_merge($errors[$key] ?? [], $typeErrors);
            }
        }

        return [
            'valid' => $errors === [],
            'errors' => $errors,
        ];
    }

    /**
     * @param  array<string, mixed>|null  $answers
     *
     * @throws ValidationException
     */
    public function validateOrFail(Event|int $event, ?array $answers, iterable $fields = null): void
    {
        $result = $this->validate($event, $answers, $fields);

        if (! $result['valid']) {
            throw ValidationException::withMessages($result['errors']);
        }
    }

    private function isEmptyAnswer(mixed $value, FormFieldType|string $type): bool
    {
        $typeValue = $type instanceof FormFieldType ? $type : FormFieldType::from($type);

        if ($typeValue === FormFieldType::CHECKBOX) {
            // false is a valid answer for a required checkbox "unchecked"
            return $value === null || $value === '';
        }

        if (is_array($value)) {
            return $value === [];
        }

        return $value === null || $value === '';
    }

    /**
     * @return list<string>
     */
    private function validateType(EventFormField $field, mixed $value): array
    {
        $type = $field->type instanceof FormFieldType
            ? $field->type
            : FormFieldType::from((string) $field->type);

        return match ($type) {
            FormFieldType::TEXT => $this->assertString($value, $field->label),
            FormFieldType::NUMBER => $this->assertNumber($value, $field->label),
            FormFieldType::DATE => $this->assertDate($value, $field->label),
            FormFieldType::SELECT => $this->assertSelect($value, $field),
            FormFieldType::CHECKBOX => $this->assertCheckbox($value, $field),
        };
    }

    /** @return list<string> */
    private function assertString(mixed $value, string $label): array
    {
        if (! is_string($value) && ! is_numeric($value)) {
            return ["The {$label} field must be text."];
        }

        return [];
    }

    /** @return list<string> */
    private function assertNumber(mixed $value, string $label): array
    {
        if (is_bool($value) || ! is_numeric($value)) {
            return ["The {$label} field must be a number."];
        }

        return [];
    }

    /** @return list<string> */
    private function assertDate(mixed $value, string $label): array
    {
        if (! is_string($value) || strtotime($value) === false) {
            return ["The {$label} field must be a valid date."];
        }

        return [];
    }

    /** @return list<string> */
    private function assertSelect(mixed $value, EventFormField $field): array
    {
        if (! is_string($value) && ! is_numeric($value)) {
            return ["The {$field->label} field must be a selected option."];
        }

        $options = $this->optionValues($field);
        if ($options !== [] && ! in_array((string) $value, $options, true)) {
            return ["The {$field->label} field has an invalid option."];
        }

        return [];
    }

    /** @return list<string> */
    private function assertCheckbox(mixed $value, EventFormField $field): array
    {
        $options = $this->optionValues($field);

        // Boolean checkbox
        if ($options === []) {
            if (! is_bool($value) && ! in_array($value, [0, 1, '0', '1'], true)) {
                return ["The {$field->label} field must be true or false."];
            }

            return [];
        }

        // Multi-option checkbox → array of option values
        if (! is_array($value)) {
            return ["The {$field->label} field must be a list of options."];
        }

        foreach ($value as $item) {
            if (! in_array((string) $item, $options, true)) {
                return ["The {$field->label} field has an invalid option."];
            }
        }

        return [];
    }

    /** @return list<string> */
    private function optionValues(EventFormField $field): array
    {
        $options = $field->options ?? [];
        if (! is_array($options)) {
            return [];
        }

        return array_map(
            static fn ($opt) => (string) (is_array($opt) ? ($opt['value'] ?? $opt['label'] ?? '') : $opt),
            $options
        );
    }
}
