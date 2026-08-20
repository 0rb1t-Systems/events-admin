<?php

namespace App\Models;

use App\Enums\PackageDurationUnit;
use App\Enums\PackageStatus;
use App\Support\EventQuota;
use App\Support\PackageDuration;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Package extends Model
{
    /** @use HasFactory<\Database\Factories\PackageFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'price',
        'event_quota',
        'duration_value',
        'duration_unit',
        'tier_rank',
        'status',
    ];

    protected $appends = [
        'duration_label',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'event_quota' => 'integer',
            'duration_value' => 'integer',
            'duration_unit' => PackageDurationUnit::class,
            'tier_rank' => 'integer',
            'status' => PackageStatus::class,
        ];
    }

    public function getDurationLabelAttribute(): ?string
    {
        return PackageDuration::labelForPackage($this);
    }

    public function isNonExpiring(): bool
    {
        return PackageDuration::isNonExpiring($this->duration_value, $this->duration_unit);
    }

    public function isFree(): bool
    {
        return (float) $this->price <= 0;
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(OrganizerSubscription::class);
    }

    public function activeSubscriptions(): HasMany
    {
        return $this->subscriptions()->where('status', \App\Enums\SubscriptionStatus::ACTIVE);
    }

    public function isUnlimitedQuota(): bool
    {
        return EventQuota::isUnlimited($this->event_quota);
    }

    public function isZeroQuota(): bool
    {
        return EventQuota::isZeroQuota($this->event_quota);
    }

    public function hasActiveSubscribers(): bool
    {
        return $this->activeSubscriptions()->exists();
    }

    public function hasAnySubscribers(): bool
    {
        return $this->subscriptions()->exists();
    }
}
