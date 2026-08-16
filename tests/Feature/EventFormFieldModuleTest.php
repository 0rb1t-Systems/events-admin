<?php

namespace Tests\Feature;

use App\Enums\EventStatus;
use App\Enums\FormFieldType;
use App\Enums\ParticipationStatus;
use App\Enums\SanctumAbility;
use App\Enums\UserStatus;
use App\Models\Event;
use App\Models\EventFormField;
use App\Models\Participation;
use App\Models\User;
use App\Services\EventFormFieldService;
use App\Services\ParticipationService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class EventFormFieldModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'view events',
            'view event form fields',
            'manage event form fields',
            'view participations',
            'manage participations',
            'view dashboard',
        ] as $name) {
            Permission::create(['name' => $name]);
        }

        $role = Role::create(['name' => 'admin']);
        $role->givePermissionTo(Permission::all());

        $this->admin = User::factory()->admin()->create([
            'email' => 'admin-form@example.com',
            'password' => 'password',
            'status' => UserStatus::ACTIVE,
        ]);
        $this->admin->assignRole('admin');
    }

    private function adminToken(): string
    {
        return $this->admin->createToken(
            'admin_auth_token',
            [SanctumAbility::AdminPanel->value]
        )->plainTextToken;
    }

    public function test_compound_unique_event_id_and_key(): void
    {
        $eventA = Event::factory()->create();
        $eventB = Event::factory()->create();

        EventFormField::factory()->for($eventA)->create(['key' => 'shirt_size']);
        // Same key on another event is fine
        EventFormField::factory()->for($eventB)->create(['key' => 'shirt_size']);

        $this->expectException(QueryException::class);
        EventFormField::factory()->for($eventA)->create(['key' => 'shirt_size']);
    }

    public function test_remove_with_answers_deactivates_instead_of_delete(): void
    {
        $event = Event::factory()->create();
        $field = EventFormField::factory()->for($event)->create([
            'key' => 'allergy',
            'type' => FormFieldType::TEXT,
            'active' => true,
        ]);

        $user = User::factory()->create();
        Participation::factory()->create([
            'user_id' => $user->id,
            'event_id' => $event->id,
            'status' => ParticipationStatus::JOINED,
            'custom_field_answers' => ['allergy' => 'peanuts'],
        ]);

        $result = app(EventFormFieldService::class)->remove($field);

        $this->assertSame('deactivated', $result['action']);
        $this->assertDatabaseHas('event_form_fields', [
            'id' => $field->id,
            'active' => false,
        ]);
    }

    public function test_remove_without_answers_hard_deletes(): void
    {
        $event = Event::factory()->create();
        $field = EventFormField::factory()->for($event)->create(['key' => 'unused']);

        $result = app(EventFormFieldService::class)->remove($field);

        $this->assertSame('deleted', $result['action']);
        $this->assertDatabaseMissing('event_form_fields', ['id' => $field->id]);
    }

    public function test_join_validates_custom_field_answers(): void
    {
        $event = Event::factory()->create([
            'status' => EventStatus::REGISTRATION_OPEN,
            'capacity' => 10,
            'registration_deadline' => now()->addDays(3),
        ]);
        EventFormField::factory()->for($event)->required()->create([
            'key' => 'company',
            'type' => FormFieldType::TEXT,
        ]);
        $user = User::factory()->create();

        $this->expectException(ValidationException::class);
        app(ParticipationService::class)->join($event, $user, null, []);
    }

    public function test_join_succeeds_with_valid_answers(): void
    {
        $event = Event::factory()->create([
            'status' => EventStatus::REGISTRATION_OPEN,
            'capacity' => 10,
            'registration_deadline' => now()->addDays(3),
        ]);
        EventFormField::factory()->for($event)->required()->create([
            'key' => 'company',
            'type' => FormFieldType::TEXT,
        ]);
        $user = User::factory()->create();

        $p = app(ParticipationService::class)->join(
            $event,
            $user,
            null,
            ['company' => 'Acme']
        );

        $this->assertSame(['company' => 'Acme'], $p->custom_field_answers);
    }

    public function test_admin_can_list_form_fields_read_only(): void
    {
        $event = Event::factory()->create();
        EventFormField::factory()->for($event)->create([
            'key' => 'diet',
            'label' => 'Dietary needs',
            'type' => FormFieldType::TEXT,
        ]);
        EventFormField::factory()->for($event)->inactive()->create([
            'key' => 'old_diet',
            'label' => 'Old diet',
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken())
            ->getJson("/api/v1/events/{$event->id}/form-fields");

        $response->assertOk();
        $response->assertJsonPath('data.event_id', $event->id);
        $this->assertCount(2, $response->json('data.form_fields'));
    }

    public function test_admin_store_enforces_unique_key_per_event(): void
    {
        $event = Event::factory()->create();
        EventFormField::factory()->for($event)->create(['key' => 'city']);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken())
            ->postJson('/api/v1/event-form-fields', [
                'event_id' => $event->id,
                'key' => 'city',
                'label' => 'City',
                'type' => 'text',
            ]);

        $response->assertStatus(422);
    }

    public function test_destroy_api_soft_handles_answered_fields(): void
    {
        $event = Event::factory()->create();
        $field = EventFormField::factory()->for($event)->create(['key' => 'phone']);
        $user = User::factory()->create();
        Participation::factory()->create([
            'user_id' => $user->id,
            'event_id' => $event->id,
            'custom_field_answers' => ['phone' => '1'],
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->adminToken())
            ->deleteJson("/api/v1/event-form-fields/{$field->id}");

        $response->assertOk();
        $response->assertJsonPath('data.action', 'deactivated');
        $this->assertDatabaseHas('event_form_fields', ['id' => $field->id, 'active' => 0]);
    }
}
