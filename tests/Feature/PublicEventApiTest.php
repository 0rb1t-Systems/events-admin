<?php

namespace Tests\Feature;

use App\Enums\EventStatus;
use App\Enums\SanctumAbility;
use App\Enums\UserStatus;
use App\Models\Event;
use App\Models\EventCategory;
use App\Models\EventSession;
use App\Models\EventSpeaker;
use App\Models\EventSponsor;
use App\Models\Organizer;
use App\Models\TicketType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PublicEventApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::create(['name' => 'view events']);
        $role = Role::create(['name' => 'admin']);
        $role->givePermissionTo('view events');

        $this->admin = User::factory()->admin()->create([
            'email' => 'admin-public-events@example.com',
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

    public function test_hmac_only_index_returns_public_statuses_and_hides_draft_and_cancelled(): void
    {
        $published = Event::factory()->published()->create(['title' => 'Public Published']);
        $open = Event::factory()->registrationOpen()->create(['title' => 'Public Open']);
        $soldOut = Event::factory()->create([
            'title' => 'Public Sold Out',
            'status' => EventStatus::SOLD_OUT,
        ]);
        $closed = Event::factory()->create([
            'title' => 'Public Closed',
            'status' => EventStatus::REGISTRATION_CLOSED,
        ]);
        $ongoing = Event::factory()->create([
            'title' => 'Public Ongoing',
            'status' => EventStatus::ONGOING,
        ]);
        $draft = Event::factory()->create(['title' => 'Secret Draft']);
        $cancelled = Event::factory()->cancelled()->create(['title' => 'Cancelled Gala']);
        Event::factory()->create([
            'title' => 'Already Done',
            'status' => EventStatus::COMPLETED,
        ]);

        $response = $this->getJson('/api/v1/events?per_page=50')
            ->assertOk();

        $ids = collect($response->json('data'))->pluck('id');

        $this->assertTrue($ids->contains($published->id));
        $this->assertTrue($ids->contains($open->id));
        $this->assertTrue($ids->contains($soldOut->id));
        $this->assertTrue($ids->contains($closed->id));
        $this->assertTrue($ids->contains($ongoing->id));
        $this->assertFalse($ids->contains($draft->id));
        $this->assertFalse($ids->contains($cancelled->id));
        $this->assertNotContains(
            EventStatus::DRAFT->value,
            collect($response->json('data'))->pluck('status')->all()
        );
        $this->assertNotContains(
            EventStatus::CANCELLED->value,
            collect($response->json('data'))->pluck('status')->all()
        );
        $this->assertNotContains(
            EventStatus::COMPLETED->value,
            collect($response->json('data'))->pluck('status')->all()
        );
    }

    public function test_hmac_only_show_returns_404_for_draft_and_cancelled(): void
    {
        $draft = Event::factory()->create();
        $cancelled = Event::factory()->cancelled()->create();
        $published = Event::factory()->published()->create();

        $this->getJson("/api/v1/events/{$draft->id}")->assertNotFound();
        $this->getJson("/api/v1/events/{$cancelled->id}")->assertNotFound();
        $this->getJson("/api/v1/events/{$published->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $published->id)
            ->assertJsonPath('data.status', EventStatus::PUBLISHED->value);
    }

    public function test_hmac_only_show_includes_public_relations_and_hides_organizer_contact(): void
    {
        $organizer = Organizer::factory()->create([
            'business_name' => 'Visible Org',
            'contact_name' => 'Secret Person',
            'email' => 'secret-org@example.com',
            'phone' => '+252611111111',
        ]);
        $category = EventCategory::factory()->create(['name' => 'Music']);
        $event = Event::factory()->published()->create([
            'organizer_id' => $organizer->id,
            'event_category_id' => $category->id,
        ]);
        TicketType::factory()->create(['event_id' => $event->id, 'name' => 'GA']);
        EventSponsor::create(['event_id' => $event->id, 'name' => 'Acme', 'tier' => 'gold']);
        $speaker = EventSpeaker::create(['event_id' => $event->id, 'name' => 'Ada']);
        EventSession::create([
            'event_id' => $event->id,
            'speaker_id' => $speaker->id,
            'title' => 'Keynote',
        ]);

        $payload = $this->getJson("/api/v1/events/{$event->id}")
            ->assertOk()
            ->json('data');

        $this->assertSame('Music', $payload['category']['name']);
        $this->assertNotEmpty($payload['ticket_types']);
        $this->assertSame('Acme', $payload['sponsors'][0]['name']);
        $this->assertSame('Ada', $payload['speakers'][0]['name']);
        $this->assertSame('Keynote', $payload['sessions'][0]['title']);
        $this->assertSame('Visible Org', $payload['organizer']['business_name']);
        $this->assertArrayNotHasKey('email', $payload['organizer']);
        $this->assertArrayNotHasKey('phone', $payload['organizer']);
        $this->assertArrayNotHasKey('contact_name', $payload['organizer']);
        $this->assertArrayNotHasKey('discount_codes', $payload);
    }

    public function test_hmac_only_event_categories_index_does_not_require_bearer(): void
    {
        $category = EventCategory::factory()->create(['name' => 'Workshops']);

        $ids = collect(
            $this->getJson('/api/v1/event-categories')->assertOk()->json('data')
        )->pluck('id');

        $this->assertTrue($ids->contains($category->id));
    }

    public function test_admin_bearer_index_and_show_still_return_draft_and_cancelled(): void
    {
        $draft = Event::factory()->create(['title' => 'Admin Draft']);
        $cancelled = Event::factory()->cancelled()->create(['title' => 'Admin Cancelled']);

        $ids = collect(
            $this->withToken($this->adminToken())
                ->getJson('/api/v1/events?per_page=50')
                ->assertOk()
                ->json('data')
        )->pluck('id');

        $this->assertTrue($ids->contains($draft->id));
        $this->assertTrue($ids->contains($cancelled->id));

        $this->withToken($this->adminToken())
            ->getJson("/api/v1/events/{$draft->id}")
            ->assertOk()
            ->assertJsonPath('data.status', EventStatus::DRAFT->value)
            ->assertJsonPath('data.organizer.email', $draft->organizer->email);
    }

    public function test_participant_bearer_is_treated_as_public_catalog(): void
    {
        $draft = Event::factory()->create();
        $published = Event::factory()->published()->create();
        $participant = User::factory()->participant()->create();
        $token = $participant->createToken(
            'web_participant_token',
            [SanctumAbility::WebParticipant->value]
        )->plainTextToken;

        $ids = collect(
            $this->withToken($token)
                ->getJson('/api/v1/events?per_page=50')
                ->assertOk()
                ->json('data')
        )->pluck('id');

        $this->assertTrue($ids->contains($published->id));
        $this->assertFalse($ids->contains($draft->id));
    }

    public function test_public_event_routes_still_require_api_key(): void
    {
        Event::factory()->published()->create();
        EventCategory::factory()->create();

        $this->withoutApiClientSigning()
            ->getJson('/api/v1/events')
            ->assertUnauthorized()
            ->assertJsonPath('errors.error_code.0', 'missing_api_key');

        $this->withoutApiClientSigning()
            ->getJson('/api/v1/event-categories')
            ->assertUnauthorized()
            ->assertJsonPath('errors.error_code.0', 'missing_api_key');
    }
}
