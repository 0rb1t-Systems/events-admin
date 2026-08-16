<?php

namespace App\Models;

use App\Enums\DiscountCodeType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class DiscountCode extends Model
{
    /** @use HasFactory<\Database\Factories\DiscountCodeFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'code',
        'event_id',
        'organizer_id',
        'type',
        'value',
        'usage_limit',
        'usage_count',
        'expires_at',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'type' => DiscountCodeType::class,
            'value' => 'decimal:2',
            'usage_limit' => 'integer',
            'usage_count' => 'integer',
            'expires_at' => 'datetime',
            'active' => 'boolean',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function organizer(): BelongsTo
    {
        return $this->belongsTo(Organizer::class);
    }

    public function isEventScoped(): bool
    {
        return $this->event_id !== null;
    }

    public function isOrganizerScoped(): bool
    {
        return $this->event_id === null && $this->organizer_id !== null;
    }

    /**
     * Resolve a code usable for a given event — DB/query scope enforcement.
     * Event-scoped codes from another event NEVER match (event_id must equal).
     * Organizer-wide codes match only when organizer_id equals the event's organizer.
     */
    public function scopeUsableForEvent(Builder $query, Event $event): Builder
    {
        return $query
            ->where('active', true)
            ->whereNull('deleted_at')
            ->where(function (Builder $q) use ($event) {
                $q->where('event_id', $event->id)
                    ->orWhere(function (Builder $q2) use ($event) {
                        $q2->whereNull('event_id')
                            ->where('organizer_id', $event->organizer_id);
                    });
            });
    }

    public function scopeByCode(Builder $query, string $code): Builder
    {
        return $query->where('code', $code);
    }

    public function isExpired($now = null): bool
    {
        if ($this->expires_at === null) {
            return false;
        }

        $now = $now ?? now();

        return $this->expires_at->lte($now);
    }

    public function hasRemainingUses(): bool
    {
        if ($this->usage_limit === null) {
            return true;
        }

        return $this->usage_count < $this->usage_limit;
    }
}
