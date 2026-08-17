<?php

namespace Database\Factories;

use App\Enums\EventStatus;
use App\Models\Event;
use App\Models\EventCategory;
use App\Models\Organizer;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Event>
 */
class EventFactory extends Factory
{
    protected $model = Event::class;

    public function definition(): array
    {
        return [
            'organizer_id' => Organizer::factory(),
            'event_category_id' => EventCategory::factory(),
            'title' => fake()->sentence(3),
            'description' => fake()->paragraph(),
            'city' => fake()->city(),
            'address' => fake()->streetAddress(),
            'latitude' => fake()->latitude(),
            'longitude' => fake()->longitude(),
            'banner_path' => null,
            'featured' => false,
            'monetized' => false,
            'status' => EventStatus::DRAFT,
            'capacity' => 100,
            'registrations_count' => 0,
            'registration_deadline' => now()->addDays(7),
            'starts_at' => now()->addDays(14),
            'ends_at' => now()->addDays(14)->addHours(4),
        ];
    }

    public function published(): static
    {
        return $this->state(fn () => ['status' => EventStatus::PUBLISHED]);
    }

    public function registrationOpen(): static
    {
        return $this->state(fn () => ['status' => EventStatus::REGISTRATION_OPEN]);
    }

    public function cancelled(): static
    {
        return $this->state(fn () => ['status' => EventStatus::CANCELLED]);
    }

    public function unlimitedCapacity(): static
    {
        return $this->state(fn () => ['capacity' => null]);
    }

    public function zeroCapacity(): static
    {
        return $this->state(fn () => ['capacity' => 0]);
    }
}
