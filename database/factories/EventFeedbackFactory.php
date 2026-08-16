<?php

namespace Database\Factories;

use App\Models\EventFeedback;
use App\Models\Participation;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<EventFeedback> */
class EventFeedbackFactory extends Factory
{
    protected $model = EventFeedback::class;

    public function definition(): array
    {
        return [
            'participation_id' => Participation::factory(),
            'rating' => fake()->numberBetween(1, 5),
            'comment' => fake()->optional()->sentence(),
            'hidden' => false,
            'submitted_at' => now(),
        ];
    }
}
