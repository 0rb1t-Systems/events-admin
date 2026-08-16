<?php

namespace Tests\Feature;

use App\Enums\SanctumAbility;
use App\Enums\UserStatus;
use App\Models\Event;
use App\Models\EventInvitationTemplate;
use App\Models\InvitationSystemTemplate;
use App\Models\User;
use App\Support\InvitationCanvas;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class InvitationSystemTemplateTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'view invitation templates',
            'manage invitation templates',
            'view trash items',
        ] as $name) {
            Permission::findOrCreate($name, 'web');
        }

        $role = Role::findOrCreate('admin', 'web');
        $role->syncPermissions(Permission::all());

        $this->admin = User::factory()->admin()->create([
            'status' => UserStatus::ACTIVE,
        ]);
        $this->admin->assignRole($role);
    }

    private function auth()
    {
        $token = $this->admin->createToken('t', [SanctumAbility::AdminPanel->value])->plainTextToken;

        return $this->withHeader('Authorization', 'Bearer '.$token);
    }

    public function test_crud_create_list_update(): void
    {
        $create = $this->auth()->postJson('/api/v1/invitation-system-templates', [
            'name' => 'Modern Blue',
            'slug' => 'modern-blue',
            'background_image_path' => 'system/templates/modern-blue-bg.png',
            'default_overlay_positions' => InvitationCanvas::defaultOverlayPositions(),
            'default_customizations' => InvitationCanvas::defaultCustomizations(),
            'active' => true,
        ]);

        $create->assertCreated();
        $id = $create->json('data.id');

        $list = $this->auth()->getJson('/api/v1/invitation-system-templates');
        $list->assertOk();
        $this->assertGreaterThanOrEqual(1, count($list->json('data')));

        $update = $this->auth()->patchJson("/api/v1/invitation-system-templates/{$id}", [
            'active' => false,
            'name' => 'Modern Blue Off',
        ]);
        $update->assertOk();
        $update->assertJsonPath('data.active', false);
        $update->assertJsonPath('data.name', 'Modern Blue Off');
    }

    public function test_soft_delete_and_force_delete_blocked_when_in_use(): void
    {
        $system = InvitationSystemTemplate::factory()->create([
            'slug' => 'in-use-template',
        ]);

        $event = Event::factory()->create();
        EventInvitationTemplate::factory()->create([
            'event_id' => $event->id,
            'mode' => 'template',
            'system_template_id' => $system->id,
        ]);

        $soft = $this->auth()->deleteJson("/api/v1/invitation-system-templates/{$system->id}");
        $soft->assertNoContent();
        $this->assertSoftDeleted('invitation_system_templates', ['id' => $system->id]);

        $force = $this->auth()->deleteJson("/api/v1/invitation-system-templates/{$system->id}/force");
        $force->assertForbidden();
        $this->assertDatabaseHas('invitation_system_templates', ['id' => $system->id]);
    }

    public function test_force_delete_allowed_when_unused(): void
    {
        $system = InvitationSystemTemplate::factory()->create([
            'slug' => 'unused-template',
        ]);

        $this->auth()->deleteJson("/api/v1/invitation-system-templates/{$system->id}");
        $force = $this->auth()->deleteJson("/api/v1/invitation-system-templates/{$system->id}/force");
        $force->assertNoContent();
        $this->assertDatabaseMissing('invitation_system_templates', ['id' => $system->id]);
    }

    public function test_event_invitation_preview_null_and_template_mode(): void
    {
        $event = Event::factory()->create();

        $empty = $this->auth()->getJson("/api/v1/events/{$event->id}/invitation-template");
        $empty->assertOk();
        $empty->assertJsonPath('data.template', null);

        $system = InvitationSystemTemplate::factory()->create(['slug' => 'preview-blue']);
        EventInvitationTemplate::factory()->create([
            'event_id' => $event->id,
            'mode' => 'template',
            'system_template_id' => $system->id,
            'customizations' => ['header_text' => 'Hello'],
            'overlay_positions' => InvitationCanvas::defaultOverlayPositions(),
        ]);

        $with = $this->auth()->getJson("/api/v1/events/{$event->id}/invitation-template");
        $with->assertOk();
        $with->assertJsonPath('data.template.mode', 'template');
        $with->assertJsonPath('data.template.system_template.slug', 'preview-blue');
        $with->assertJsonPath('data.template.customizations.header_text', 'Hello');
    }

    public function test_seeder_creates_four_templates(): void
    {
        $this->seed(\Database\Seeders\InvitationSystemTemplateSeeder::class);

        $this->assertSame(4, InvitationSystemTemplate::query()->count());
        $this->assertDatabaseHas('invitation_system_templates', ['slug' => 'modern-blue']);
        $this->assertDatabaseHas('invitation_system_templates', ['slug' => 'festive-gold']);
        $this->assertDatabaseHas('invitation_system_templates', ['slug' => 'minimal-dark']);
        $this->assertDatabaseHas('invitation_system_templates', ['slug' => 'classic-cream']);
    }
}
