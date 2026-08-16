<?php

namespace App\Models;

use App\Enums\OrganizerStatus;
use App\Enums\SubscriptionStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Organizer extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\OrganizerFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'business_name',
        'contact_name',
        'email',
        'phone',
        'password',
        'status',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'status' => OrganizerStatus::class,
        ];
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(OrganizerSubscription::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }

    /**
     * Current active subscription (history row), not a column on organizers.
     * expires_at null = not time-boxed; past expires_at excluded.
     */
    public function activeSubscription(): HasOne
    {
        return $this->hasOne(OrganizerSubscription::class)->ofMany(
            ['started_at' => 'max', 'id' => 'max'],
            function ($query) {
                $query->where('status', SubscriptionStatus::ACTIVE)
                    ->where(function ($q) {
                        $q->whereNull('expires_at')
                            ->orWhere('expires_at', '>', now());
                    });
            }
        );
    }

    public function isActive(): bool
    {
        return $this->status === OrganizerStatus::ACTIVE;
    }

    public function isSuspended(): bool
    {
        return $this->status === OrganizerStatus::SUSPENDED;
    }
}
