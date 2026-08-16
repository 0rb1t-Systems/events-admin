<?php

namespace Database\Factories;

use App\Enums\ParticipationPaymentStatus;
use App\Enums\ParticipationStatus;
use App\Models\Event;
use App\Models\Participation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Participation>
 */
class ParticipationFactory extends Factory
{
    protected $model = Participation::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'event_id' => Event::factory(),
            'ticket_type_id' => null,
            'status' => ParticipationStatus::JOINED,
            'payment_status' => ParticipationPaymentStatus::NOT_REQUIRED,
            'custom_field_answers' => null,
            'qr_token' => null,
        ];
    }

    public function waitlisted(): static
    {
        return $this->state(fn () => ['status' => ParticipationStatus::WAITLISTED]);
    }

    public function cancelled(): static
    {
        return $this->state(fn () => ['status' => ParticipationStatus::CANCELLED]);
    }
}
