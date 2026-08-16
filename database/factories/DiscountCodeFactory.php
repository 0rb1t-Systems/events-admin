<?php

namespace Database\Factories;

use App\Enums\DiscountCodeType;
use App\Models\DiscountCode;
use App\Models\Event;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DiscountCode>
 */
class DiscountCodeFactory extends Factory
{
    protected $model = DiscountCode::class;

    public function definition(): array
    {
        return [
            'code' => strtoupper(fake()->unique()->bothify('SAVE##??')),
            'event_id' => Event::factory(),
            'organizer_id' => null,
            'type' => DiscountCodeType::PERCENT,
            'value' => 10,
            'usage_limit' => 100,
            'usage_count' => 0,
            'expires_at' => now()->addMonth(),
            'active' => true,
        ];
    }

    public function forEvent(Event $event): static
    {
        return $this->state(fn () => [
            'event_id' => $event->id,
            'organizer_id' => $event->organizer_id,
        ]);
    }

    public function organizerWide(int $organizerId): static
    {
        return $this->state(fn () => [
            'event_id' => null,
            'organizer_id' => $organizerId,
        ]);
    }

    public function fixed(float $amount = 5): static
    {
        return $this->state(fn () => [
            'type' => DiscountCodeType::FIXED,
            'value' => $amount,
        ]);
    }
}
