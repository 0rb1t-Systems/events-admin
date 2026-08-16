<?php

namespace Database\Factories;

use App\Enums\PackageStatus;
use App\Models\Package;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Package>
 */
class PackageFactory extends Factory
{
    protected $model = Package::class;

    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(2, true).' Plan',
            'description' => fake()->sentence(),
            'price' => fake()->randomFloat(2, 0, 500),
            'event_quota' => 10,
            'status' => PackageStatus::ACTIVE,
        ];
    }

    public function unlimited(): static
    {
        return $this->state(fn () => ['event_quota' => null]);
    }

    public function zeroQuota(): static
    {
        return $this->state(fn () => ['event_quota' => 0]);
    }

    public function archived(): static
    {
        return $this->state(fn () => ['status' => PackageStatus::ARCHIVED]);
    }
}
