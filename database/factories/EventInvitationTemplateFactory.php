<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\EventInvitationTemplate;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EventInvitationTemplate>
 */
class EventInvitationTemplateFactory extends Factory
{
    protected $model = EventInvitationTemplate::class;

    public function definition(): array
    {
        return [
            'event_id' => Event::factory(),
            'config' => [
                'title' => fake()->sentence(3),
                'primary_color' => '#0ea5e9',
                'show_qr' => true,
            ],
        ];
    }
}
