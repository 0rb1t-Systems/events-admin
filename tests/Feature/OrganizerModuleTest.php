<?php

namespace Tests\Feature;

use App\Enums\OrganizerStatus;
use App\Enums\SanctumAbility;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\Organizer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\PersonalAccessToken;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class OrganizerModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'view organizers',
            'suspend organizers',
            'delete organizers',
            'view trash items',
            'view dashboard',
        ] as $name) {
            Permission::create(['name' => $name]);
        }

        $role = Role::create(['name' => 'admin']);
        $role->givePermissionTo(Permission::all());

        $this->admin = User::factory()->admin()->create([
            'email' => 'admin-org@example.com',
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

    public function test_organizers_email_unique_at_db_independent_from_users(): void
    {
        User::factory()->create(['email' => 'shared@example.com']);

        // Same email allowed on organizers table (unrelated identity)
        $organizer = Organizer::factory()->create(['email' => 'shared@example.com']);
        $this->assertSame('shared@example.com', $organizer->email);

        Organizer::factory()->create(['email' => 'other@example.com']);

        $this->expectException(\Illuminate\Database\QueryException::class);
        Organizer::factory()->create(['email' => 'shared@example.com']);
    }

    public function test_organizers_table_has_unique_index_on_email(): void
    {
        $indexes = Schema::getConnection()
            ->getSchemaBuilder()
            ->getIndexes('organizers');

        $emailUnique = collect($indexes)->contains(function (array $index) {
            return ($index['unique'] ?? false)
                && in_array('email', $index['columns'] ?? [], true);
        });

        $this->assertTrue($emailUnique, 'organizers.email must have a unique index');
    }

    public function test_organizer_register_and_login_issues_organizer_web_token(): void
    {
        $register = $this->postJson('/api/v1/organizer-auth/register', [
            'business_name' => 'Acme Events',
            'contact_name' => 'Jane Doe',
            'email' => 'org@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $register->assertCreated()
            ->assertJsonPath('data.token_ability', SanctumAbility::OrganizerWeb->value);

        $login = $this->postJson('/api/v1/organizer-auth/login', [
            'email' => 'org@example.com',
            'password' => 'password',
        ]);

        $login->assertOk()
            ->assertJsonPath('data.token_ability', SanctumAbility::OrganizerWeb->value);

        $token = PersonalAccessToken::findToken($login->json('data.token'));
        $this->assertTrue($token->can(SanctumAbility::OrganizerWeb->value));
        $this->assertFalse($token->can(SanctumAbility::AdminPanel->value));
    }

    public function test_suspended_organizer_cannot_login_or_use_me(): void
    {
        $organizer = Organizer::factory()->create([
            'email' => 'suspended@example.com',
            'password' => 'password',
            'status' => OrganizerStatus::ACTIVE,
        ]);

        $plain = $organizer->createToken(
            'organizer_web_token',
            [SanctumAbility::OrganizerWeb->value]
        )->plainTextToken;

        $this->withToken($this->adminToken())
            ->postJson("/api/v1/organizers/{$organizer->id}/suspend")
            ->assertOk();

        $this->assertSame(OrganizerStatus::SUSPENDED, $organizer->fresh()->status);
        $this->assertSame(0, $organizer->tokens()->count());

        $this->postJson('/api/v1/organizer-auth/login', [
            'email' => 'suspended@example.com',
            'password' => 'password',
        ])->assertForbidden()
            ->assertJsonPath('errors.error_code.0', 'organizer_suspended');

        // Stale token from before suspend should not work (tokens revoked)
        $this->withToken($plain)
            ->getJson('/api/v1/organizer-auth/me')
            ->assertUnauthorized();
    }

    public function test_organizer_token_cannot_access_admin_organizers_api(): void
    {
        $organizer = Organizer::factory()->create(['password' => 'password']);
        $plain = $organizer->createToken(
            'organizer_web_token',
            [SanctumAbility::OrganizerWeb->value]
        )->plainTextToken;

        $this->withToken($plain)
            ->getJson('/api/v1/organizers')
            ->assertForbidden();
    }

    public function test_admin_can_list_suspend_reactivate_and_soft_delete(): void
    {
        $organizer = Organizer::factory()->create([
            'business_name' => 'List Me LLC',
            'status' => OrganizerStatus::ACTIVE,
        ]);

        $token = $this->adminToken();

        $this->withToken($token)
            ->getJson('/api/v1/organizers')
            ->assertOk()
            ->assertJsonFragment(['business_name' => 'List Me LLC']);

        $this->withToken($token)
            ->postJson("/api/v1/organizers/{$organizer->id}/suspend")
            ->assertOk()
            ->assertJsonPath('data.status', OrganizerStatus::SUSPENDED->value);

        $this->withToken($token)
            ->postJson("/api/v1/organizers/{$organizer->id}/reactivate")
            ->assertOk()
            ->assertJsonPath('data.status', OrganizerStatus::ACTIVE->value);

        $this->withToken($token)
            ->deleteJson("/api/v1/organizers/{$organizer->id}")
            ->assertNoContent();

        $this->assertSoftDeleted('organizers', ['id' => $organizer->id]);

        $this->withToken($token)
            ->getJson('/api/v1/organizers/trashed/list')
            ->assertOk()
            ->assertJsonFragment(['id' => $organizer->id]);

        $this->withToken($token)
            ->postJson("/api/v1/organizers/{$organizer->id}/restore")
            ->assertOk();

        $this->assertDatabaseHas('organizers', [
            'id' => $organizer->id,
            'deleted_at' => null,
        ]);
    }

    public function test_admin_cannot_patch_organizer_identity_via_missing_update_route(): void
    {
        $organizer = Organizer::factory()->create();

        $this->withToken($this->adminToken())
            ->patchJson("/api/v1/organizers/{$organizer->id}", [
                'business_name' => 'Hacked Name',
            ])
            ->assertStatus(405);
    }

    public function test_soft_delete_keeps_row_for_future_fk_integrity(): void
    {
        $organizer = Organizer::factory()->create();
        $id = $organizer->id;

        $organizer->delete();

        $row = DB::table('organizers')->where('id', $id)->first();
        $this->assertNotNull($row);
        $this->assertNotNull($row->deleted_at);
    }

    public function test_suspend_reactivate_trash_and_restore_write_activity_logs(): void
    {
        $organizer = Organizer::factory()->create([
            'status' => OrganizerStatus::ACTIVE,
        ]);
        $token = $this->adminToken();

        $this->withToken($token)
            ->postJson("/api/v1/organizers/{$organizer->id}/suspend")
            ->assertOk();

        $this->assertDatabaseHas('activity_log', [
            'description' => 'Organizer was suspended',
            'event' => 'suspended',
            'subject_type' => Organizer::class,
            'subject_id' => $organizer->id,
        ]);

        $this->withToken($token)
            ->postJson("/api/v1/organizers/{$organizer->id}/reactivate")
            ->assertOk();

        $this->assertDatabaseHas('activity_log', [
            'description' => 'Organizer was reactivated',
            'event' => 'reactivated',
            'subject_id' => $organizer->id,
        ]);

        $this->withToken($token)
            ->deleteJson("/api/v1/organizers/{$organizer->id}")
            ->assertNoContent();

        $this->assertDatabaseHas('activity_log', [
            'description' => 'Organizer was soft-deleted',
            'event' => 'deleted',
            'subject_id' => $organizer->id,
        ]);

        $this->withToken($token)
            ->postJson("/api/v1/organizers/{$organizer->id}/restore")
            ->assertOk();

        $this->assertDatabaseHas('activity_log', [
            'description' => 'Organizer was restored',
            'event' => 'restored',
            'subject_id' => $organizer->id,
        ]);
    }
}
