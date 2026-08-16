<?php

namespace Tests\Unit;

use App\Enums\FormFieldType;
use App\Models\Event;
use App\Models\EventFormField;
use App\Services\FormFieldValidationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * Standalone validation of custom_field_answers against event form schema.
 * Called at submission time only — not retroactive.
 */
class FormFieldValidationServiceTest extends TestCase
{
    use RefreshDatabase;

    private FormFieldValidationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(FormFieldValidationService::class);
    }

    public function test_required_field_missing_fails(): void
    {
        $event = Event::factory()->create();
        EventFormField::factory()->for($event)->required()->create([
            'key' => 'full_name',
            'label' => 'Full name',
            'type' => FormFieldType::TEXT,
        ]);

        $result = $this->service->validate($event, []);

        $this->assertFalse($result['valid']);
        $this->assertArrayHasKey('full_name', $result['errors']);
    }

    public function test_required_field_present_passes(): void
    {
        $event = Event::factory()->create();
        EventFormField::factory()->for($event)->required()->create([
            'key' => 'full_name',
            'type' => FormFieldType::TEXT,
        ]);

        $result = $this->service->validate($event, ['full_name' => 'Ada Lovelace']);

        $this->assertTrue($result['valid']);
        $this->assertSame([], $result['errors']);
    }

    public function test_optional_field_may_be_omitted(): void
    {
        $event = Event::factory()->create();
        EventFormField::factory()->for($event)->create([
            'key' => 'notes',
            'required' => false,
            'type' => FormFieldType::TEXT,
        ]);

        $this->assertTrue($this->service->validate($event, [])['valid']);
    }

    public function test_number_type_rejects_non_numeric(): void
    {
        $event = Event::factory()->create();
        EventFormField::factory()->for($event)->create([
            'key' => 'age',
            'type' => FormFieldType::NUMBER,
            'required' => false,
        ]);

        $result = $this->service->validate($event, ['age' => 'twelve']);

        $this->assertFalse($result['valid']);
        $this->assertArrayHasKey('age', $result['errors']);
    }

    public function test_number_type_accepts_numeric_string(): void
    {
        $event = Event::factory()->create();
        EventFormField::factory()->for($event)->create([
            'key' => 'age',
            'type' => FormFieldType::NUMBER,
        ]);

        $this->assertTrue($this->service->validate($event, ['age' => '42'])['valid']);
        $this->assertTrue($this->service->validate($event, ['age' => 42])['valid']);
    }

    public function test_select_rejects_value_outside_options(): void
    {
        $event = Event::factory()->create();
        EventFormField::factory()->for($event)->select(['S', 'M', 'L'])->create([
            'key' => 'size',
        ]);

        $result = $this->service->validate($event, ['size' => 'XL']);

        $this->assertFalse($result['valid']);
        $this->assertArrayHasKey('size', $result['errors']);
    }

    public function test_select_accepts_option(): void
    {
        $event = Event::factory()->create();
        EventFormField::factory()->for($event)->select(['S', 'M', 'L'])->create([
            'key' => 'size',
        ]);

        $this->assertTrue($this->service->validate($event, ['size' => 'M'])['valid']);
    }

    public function test_checkbox_boolean_accepts_bool(): void
    {
        $event = Event::factory()->create();
        EventFormField::factory()->for($event)->create([
            'key' => 'agree',
            'type' => FormFieldType::CHECKBOX,
            'options' => null,
            'required' => true,
        ]);

        $this->assertTrue($this->service->validate($event, ['agree' => true])['valid']);
        $this->assertTrue($this->service->validate($event, ['agree' => false])['valid']);
    }

    public function test_checkbox_multi_option_validates_list(): void
    {
        $event = Event::factory()->create();
        EventFormField::factory()->for($event)->create([
            'key' => 'interests',
            'type' => FormFieldType::CHECKBOX,
            'options' => ['music', 'food'],
        ]);

        $this->assertTrue($this->service->validate($event, ['interests' => ['music']])['valid']);
        $this->assertFalse($this->service->validate($event, ['interests' => ['sports']])['valid']);
        $this->assertFalse($this->service->validate($event, ['interests' => 'music'])['valid']);
    }

    public function test_date_type_rejects_invalid(): void
    {
        $event = Event::factory()->create();
        EventFormField::factory()->for($event)->create([
            'key' => 'dob',
            'type' => FormFieldType::DATE,
        ]);

        $this->assertFalse($this->service->validate($event, ['dob' => 'not-a-date'])['valid']);
        $this->assertTrue($this->service->validate($event, ['dob' => '1990-05-01'])['valid']);
    }

    public function test_inactive_fields_are_not_required(): void
    {
        $event = Event::factory()->create();
        EventFormField::factory()->for($event)->required()->inactive()->create([
            'key' => 'old_field',
            'type' => FormFieldType::TEXT,
        ]);
        EventFormField::factory()->for($event)->required()->create([
            'key' => 'new_field',
            'type' => FormFieldType::TEXT,
        ]);

        $result = $this->service->validate($event, ['new_field' => 'ok']);

        $this->assertTrue($result['valid']);
    }

    public function test_schema_change_does_not_invalidate_historical_answers_shape(): void
    {
        // Historical answers may include keys for inactive/removed fields.
        // Validation only checks current active schema — extra keys are ignored.
        $event = Event::factory()->create();
        EventFormField::factory()->for($event)->create([
            'key' => 'phone',
            'type' => FormFieldType::TEXT,
            'required' => false,
        ]);

        $historical = [
            'phone' => '555-0100',
            'removed_field' => 'still stored on participation',
        ];

        $this->assertTrue($this->service->validate($event, $historical)['valid']);
    }

    public function test_validate_or_fail_throws(): void
    {
        $event = Event::factory()->create();
        EventFormField::factory()->for($event)->required()->create([
            'key' => 'email_pref',
            'type' => FormFieldType::TEXT,
        ]);

        $this->expectException(ValidationException::class);
        $this->service->validateOrFail($event, []);
    }

    public function test_can_validate_against_injected_field_collection(): void
    {
        $event = Event::factory()->create();
        $fields = collect([
            EventFormField::factory()->make([
                'event_id' => $event->id,
                'key' => 'x',
                'label' => 'X',
                'type' => FormFieldType::TEXT,
                'required' => true,
                'active' => true,
            ]),
        ]);

        $this->assertFalse($this->service->validate($event, [], $fields)['valid']);
        $this->assertTrue($this->service->validate($event, ['x' => 'y'], $fields)['valid']);
    }
}
