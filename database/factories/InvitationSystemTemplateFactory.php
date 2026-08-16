<?php

namespace Database\Factories;

use App\Models\InvitationSystemTemplate;
use App\Support\InvitationCanvas;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<InvitationSystemTemplate>
 */
class InvitationSystemTemplateFactory extends Factory
{
    protected $model = InvitationSystemTemplate::class;

    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);

        return [
            'name' => Str::title($name),
            'slug' => Str::slug($name).'-'.fake()->unique()->numerify('###'),
            'thumbnail_path' => null,
            'background_image_path' => 'system/templates/placeholder-bg.png',
            'default_overlay_positions' => InvitationCanvas::defaultOverlayPositions(),
            'default_customizations' => InvitationCanvas::defaultCustomizations(),
            'active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['active' => false]);
    }
}
