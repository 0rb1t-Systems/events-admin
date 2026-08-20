<?php

namespace Database\Factories;

use App\Enums\SubscriptionOrderAction;
use App\Enums\SubscriptionOrderStatus;
use App\Models\Organizer;
use App\Models\OrganizerSubscriptionOrder;
use App\Models\Package;
use App\Support\PackageDuration;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<OrganizerSubscriptionOrder>
 */
class OrganizerSubscriptionOrderFactory extends Factory
{
    protected $model = OrganizerSubscriptionOrder::class;

    public function definition(): array
    {
        $package = Package::factory()->create();

        return [
            'organizer_id' => Organizer::factory(),
            'package_id' => $package->id,
            'action' => SubscriptionOrderAction::SUBSCRIBE,
            'amount' => $package->price,
            'currency' => 'USD',
            'status' => SubscriptionOrderStatus::PENDING,
            'reference_id' => 'SUB-'.Str::uuid()->toString(),
            'payer_phone' => '25261'.fake()->numerify('#######'),
            'package_snapshot' => PackageDuration::snapshot($package),
            'expires_at' => now()->addMinutes(15),
        ];
    }
}
