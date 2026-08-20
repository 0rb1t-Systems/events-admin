<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\TicketType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TicketType>
 */
class TicketTypeFactory extends Factory
{
    protected $model = TicketType::class;

    public function definition(): array
    {
        return [
            'event_id' => Event::factory(),
            'name' => fake()->randomElement(['VIP', 'Standard', 'Early Bird', 'General']),
            // Name alone does not imply VIP — default false; use vip() state when needed.
            'is_vip' => false,
            'price' => fake()->randomFloat(2, 0, 200),
            'quantity_limit' => 100,
            'quantity_sold' => 0,
            'sort_order' => 0,
            'sales_enabled' => true,
        ];
    }

    public function vip(bool $isVip = true): static
    {
        return $this->state(fn () => ['is_vip' => $isVip]);
    }

    public function free(): static
    {
        return $this->state(fn () => ['price' => 0]);
    }

    public function paid(float $price = 49.99): static
    {
        return $this->state(fn () => ['price' => $price]);
    }

    public function unlimited(): static
    {
        return $this->state(fn () => ['quantity_limit' => null]);
    }

    public function withSales(int $sold = 5): static
    {
        return $this->state(fn () => ['quantity_sold' => $sold]);
    }
}
