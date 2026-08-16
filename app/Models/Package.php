<?php

namespace App\Models;

use App\Enums\PackageStatus;
use App\Support\EventQuota;
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
        'status',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'event_quota' => 'integer',
            'status' => PackageStatus::class,
        ];
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
