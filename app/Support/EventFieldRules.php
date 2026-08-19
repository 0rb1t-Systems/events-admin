<?php

namespace App\Support;

use App\Enums\EventMode;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator as ValidatorInstance;

class EventFieldRules
{
    /**
     * Shared writable event fields for organizer/admin create+update.
     *
     * @return array<string, mixed>
     */
    public static function rules(bool $isUpdate, bool $requireModeOnCreate = true): array
    {
        $req = $isUpdate ? 'sometimes' : 'required';
        $modeReq = $isUpdate ? 'sometimes' : ($requireModeOnCreate ? 'required' : 'sometimes');

        return [
            'event_category_id' => ['nullable', 'integer', 'exists:event_categories,id'],
            'category_id' => ['nullable', 'integer', 'exists:event_categories,id'],
            'title' => [$req, 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'why_attend' => ['nullable', 'array', 'max:6'],
            'why_attend.*' => ['nullable', 'string', 'max:200'],
            'city' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'event_mode' => [$modeReq, 'string', Rule::in(EventMode::values())],
            'online_url' => ['nullable', 'string', 'max:500', 'url'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'banner_path' => ['nullable', 'string', 'max:500'],
            'capacity' => ['nullable', 'integer', 'min:0'],
            'registration_deadline' => ['nullable', 'date'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ];
    }

    /**
     * @param  array<string, mixed>  $rules
     * @return array<string, mixed>
     */
    public static function validateRequest(Request $request, array $rules, ?Event $existing = null): array
    {
        $validator = Validator::make($request->all(), $rules);
        $validator->after(fn (ValidatorInstance $v) => self::afterValidation($v, $request->all(), $existing));
        $validated = $validator->validate();

        if (array_key_exists('why_attend', $validated)) {
            $validated['why_attend'] = self::sanitizeWhyAttend($validated['why_attend']);
        }

        if (array_key_exists('category_id', $validated) && ! array_key_exists('event_category_id', $validated)) {
            $validated['event_category_id'] = $validated['category_id'];
        }
        unset($validated['category_id']);

        return $validated;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public static function afterValidation(ValidatorInstance $validator, array $data, ?Event $existing = null): void
    {
        $modeRaw = $data['event_mode'] ?? ($existing?->event_mode instanceof EventMode
            ? $existing->event_mode->value
            : $existing?->event_mode);
        $mode = is_string($modeRaw) ? EventMode::tryFrom($modeRaw) : ($modeRaw instanceof EventMode ? $modeRaw : null);

        $url = array_key_exists('online_url', $data)
            ? $data['online_url']
            : $existing?->online_url;

        if ($mode?->requiresOnlineUrl()) {
            if ($url === null || $url === '') {
                $validator->errors()->add('online_url', 'online_url is required when event_mode is online or hybrid.');
            }
        }
    }

    /**
     * @param  array<int, mixed>|null  $items
     * @return list<string>|null
     */
    public static function sanitizeWhyAttend(?array $items): ?array
    {
        if ($items === null) {
            return null;
        }

        $out = [];
        foreach ($items as $item) {
            if (! is_string($item) && $item !== null) {
                continue;
            }
            $trimmed = trim((string) $item);
            if ($trimmed === '') {
                continue;
            }
            $out[] = mb_substr($trimmed, 0, 200);
            if (count($out) >= 6) {
                break;
            }
        }

        return $out === [] ? null : array_values($out);
    }
}
