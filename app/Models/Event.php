<?php

namespace App\Models;

use App\Enums\EventStatus;
use App\Services\EventRegistrationGate;
use App\Services\ParticipationService;
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
        'views_count',
        'registration_deadline',
        'starts_at',
        'ends_at',
    ];

    protected $appends = [
        'registration_gates',
        'registered_count',
        'waitlisted_count',
        'seats_remaining',
    ];

    protected function casts(): array
    {
        return [
            'status' => EventStatus::class,
            'featured' => 'boolean',
            'monetized' => 'boolean',
            'capacity' => 'integer',
            'registrations_count' => 'integer',
            'views_count' => 'integer',
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

    public function participations(): HasMany
    {
        return $this->hasMany(Participation::class);
    }

    public function formFields(): HasMany
    {
        return $this->hasMany(EventFormField::class)->orderBy('sort_order')->orderBy('id');
    }

    public function invitationTemplate(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(EventInvitationTemplate::class);
    }

    public function qrScanLogs(): HasMany
    {
        return $this->hasMany(QrScanLog::class);
    }

    public function payoutRequests(): HasMany
    {
        return $this->hasMany(PayoutRequest::class);
    }

    public function announcements(): HasMany
    {
        return $this->hasMany(EventAnnouncement::class);
    }

    public function sponsors(): HasMany
    {
        return $this->hasMany(EventSponsor::class)->orderBy('sort_order');
    }

    public function speakers(): HasMany
    {
        return $this->hasMany(EventSpeaker::class)->orderBy('sort_order');
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(EventSession::class)->orderBy('starts_at');
    }

    public function getRegistrationGatesAttribute(): array
    {
        return EventRegistrationGate::evaluate($this);
    }

    /** Live registered count (synced column preferred). */
    public function getRegisteredCountAttribute(): int
    {
        if (array_key_exists('registrations_count', $this->attributes)) {
            return (int) $this->attributes['registrations_count'];
        }

        return app(ParticipationService::class)->countSeatOccupying((int) $this->id);
    }

    public function getWaitlistedCountAttribute(): int
    {
        if (! $this->id) {
            return 0;
        }

        return app(ParticipationService::class)->countWaitlisted((int) $this->id);
    }

    public function getSeatsRemainingAttribute(): ?int
    {
        if ($this->capacity === null) {
            return null;
        }

        return max(0, (int) $this->capacity - $this->registered_count);
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
