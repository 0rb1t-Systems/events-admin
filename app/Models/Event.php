<?php

namespace App\Models;

use App\Enums\EventStatus;
use App\Services\EventRegistrationGate;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Event extends Model
{
    /** @use HasFactory<\Database\Factories\EventFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'organizer_id',
        'event_category_id',
        'title',
        'description',
        'city',
        'address',
        'latitude',
        'longitude',
        'banner_path',
        'featured',
        'monetized',
        'status',
        'capacity',
        'registrations_count',
        'registration_deadline',
        'starts_at',
        'ends_at',
    ];

    protected $appends = [
        'registration_gates',
    ];

    protected function casts(): array
    {
        return [
            'status' => EventStatus::class,
            'featured' => 'boolean',
            'monetized' => 'boolean',
            'capacity' => 'integer',
            'registrations_count' => 'integer',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'registration_deadline' => 'datetime',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function organizer(): BelongsTo
    {
        return $this->belongsTo(Organizer::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(EventCategory::class, 'event_category_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(EventImage::class)->orderBy('sort_order');
    }

    public function ticketTypes(): HasMany
    {
        return $this->hasMany(TicketType::class)->orderBy('sort_order');
    }

    public function discountCodes(): HasMany
    {
        return $this->hasMany(DiscountCode::class);
    }

    public function getRegistrationGatesAttribute(): array
    {
        return EventRegistrationGate::evaluate($this);
    }

    public function isCapacityUnlimited(): bool
    {
        return $this->capacity === null;
    }

    public function isZeroCapacity(): bool
    {
        return $this->capacity === 0;
    }
}
