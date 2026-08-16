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
            'mode' => null,
            'system_template_id' => null,
            'background_image_path' => null,
            'config' => [
                'title' => fake()->sentence(3),
                'primary_color' => '#0ea5e9',
                'show_qr' => true,
            ],
            'overlay_positions' => null,
            'customizations' => null,
        ];
    }
}
