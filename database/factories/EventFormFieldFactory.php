<?php

namespace Database\Factories;

use App\Enums\FormFieldType;
use App\Models\Event;
use App\Models\EventFormField;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EventFormField>
 */
class EventFormFieldFactory extends Factory
{
    protected $model = EventFormField::class;

    public function definition(): array
    {
        return [
            'event_id' => Event::factory(),
            'key' => fake()->unique()->slug(2),
            'label' => fake()->words(2, true),
            'type' => FormFieldType::TEXT,
            'options' => null,
            'required' => false,
            'sort_order' => 0,
            'active' => true,
        ];
    }

    public function required(): static
    {
        return $this->state(fn () => ['required' => true]);
    }

    public function select(array $options = ['a', 'b']): static
    {
        return $this->state(fn () => [
            'type' => FormFieldType::SELECT,
            'options' => $options,
        ]);
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['active' => false]);
    }
}
