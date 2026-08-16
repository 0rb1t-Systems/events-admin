<?php

namespace Database\Factories;

use App\Enums\OrganizerStatus;
use App\Models\Organizer;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<Organizer>
 */
class OrganizerFactory extends Factory
{
    protected $model = Organizer::class;

    protected static ?string $password;

    public function definition(): array
    {
        return [
            'business_name' => fake()->company(),
            'contact_name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->optional()->numerify('+1##########'),
            'password' => static::$password ??= Hash::make('password'),
            'status' => OrganizerStatus::ACTIVE,
        ];
    }

    public function suspended(): static
    {
        return $this->state(fn () => [
            'status' => OrganizerStatus::SUSPENDED,
        ]);
    }

    public function active(): static
    {
        return $this->state(fn () => [
            'status' => OrganizerStatus::ACTIVE,
        ]);
    }
}
