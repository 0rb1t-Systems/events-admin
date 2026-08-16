<?php

namespace Database\Factories;

use App\Enums\PayoutRequestStatus;
use App\Models\Event;
use App\Models\Organizer;
use App\Models\PayoutRequest;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PayoutRequest>
 */
class PayoutRequestFactory extends Factory
{
    protected $model = PayoutRequest::class;

    public function definition(): array
    {
        return [
            'organizer_id' => Organizer::factory(),
            'event_id' => Event::factory(),
            'requested_amount' => 50.00,
            'status' => PayoutRequestStatus::REQUESTED,
            'commission_rate' => 10.00,
            'commission_amount' => null,
            'net_amount' => null,
            'admin_notes' => null,
        ];
    }
}
