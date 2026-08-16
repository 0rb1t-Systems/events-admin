<?php

namespace Database\Factories;

use App\Enums\SubscriptionStatus;
use App\Models\Organizer;
use App\Models\OrganizerSubscription;
use App\Models\Package;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrganizerSubscription>
 */
class OrganizerSubscriptionFactory extends Factory
{
    protected $model = OrganizerSubscription::class;

    public function definition(): array
    {
        return [
            'organizer_id' => Organizer::factory(),
            'package_id' => Package::factory(),
            'status' => SubscriptionStatus::ACTIVE,
            'started_at' => now(),
            'expires_at' => null,
        ];
    }

    public function expired(): static
    {
        return $this->state(fn () => [
            'status' => SubscriptionStatus::EXPIRED,
            'started_at' => now()->subMonths(2),
            'expires_at' => now()->subMonth(),
        ]);
    }

    public function cancelled(): static
    {
        return $this->state(fn () => [
            'status' => SubscriptionStatus::CANCELLED,
            'expires_at' => now(),
        ]);
    }
}
