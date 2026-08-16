<?php

namespace Database\Factories;

use App\Enums\PaymentStatus;
use App\Models\Participation;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    protected $model = Payment::class;

    public function definition(): array
    {
        return [
            'participation_id' => Participation::factory(),
            'ticket_type_id' => null,
            'amount' => 10.00,
            'currency' => 'USD',
            'status' => PaymentStatus::PENDING,
            'reference_id' => 'INV-'.Str::uuid()->toString(),
            'waafi_transaction_id' => null,
            'waafi_issuer_transaction_id' => null,
            'payer_phone' => '25261'.fake()->numerify('#######'),
            'failure_reason' => null,
            'failure_code' => null,
            'expires_at' => now()->addMinutes(15),
        ];
    }

    public function completed(): static
    {
        return $this->state(fn () => [
            'status' => PaymentStatus::COMPLETED,
            'waafi_transaction_id' => 'TX-'.Str::random(8),
        ]);
    }
}
