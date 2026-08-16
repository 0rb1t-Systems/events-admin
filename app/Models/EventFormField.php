<?php

namespace App\Models;

use App\Enums\FormFieldType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventFormField extends Model
{
    /** @use HasFactory<\Database\Factories\EventFormFieldFactory> */
    use HasFactory;

    protected $fillable = [
        'event_id',
        'key',
        'label',
        'type',
        'options',
        'required',
        'sort_order',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'type' => FormFieldType::class,
            'options' => 'array',
            'required' => 'boolean',
            'sort_order' => 'integer',
            'active' => 'boolean',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('active', true);
    }

    public function scopeForEvent(Builder $query, int $eventId): Builder
    {
        return $query->where('event_id', $eventId)->orderBy('sort_order')->orderBy('id');
    }
}
