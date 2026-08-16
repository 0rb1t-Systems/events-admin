<?php

namespace Tests\Feature;

use App\Enums\EventStatus;
use App\Enums\ParticipationPaymentStatus;
use App\Enums\ParticipationStatus;
use App\Enums\PaymentStatus;
use App\Enums\SanctumAbility;
use App\Enums\UserStatus;
use App\Events\ParticipationCheckedIn;
use App\Models\Certificate;
use App\Models\Event;
use App\Models\EventAnnouncement;
use App\Models\EventFeedback;
use App\Models\EventSponsor;
use App\Models\Participation;
use App\Models\Payment;
use App\Models\User;
use App\Services\CertificateIssuanceService;
use App\Services\EventAnalyticsService;
use App\Services\EventFeedbackService;
use App\Services\QrTokenService;
use App\Services\QrValidationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event as EventFacade;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class EventAddOnModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'view events',
            'view event analytics',
            'view event announcements',
            'view certificates',
            'view event feedback',
            'manage event feedback',
            'view event sponsors',
            'view event speakers',
            'view event sessions',
            'view dashboard',
        ] as $name) {
            Permission::create(['name' => $name]);
        }

        $role = Role::create(['name' => 'admin']);
        $role->givePermissionTo(Permission::all());

        $this->admin = User::factory()->admin()->create([
            'email' => 'admin-addon@example.com',
            'password' => 'password',
            'status' => UserStatus::ACTIVE,
        ]);
        $this->admin->assignRole('admin');
    }

    private function token(): string
    {
        return $this->admin->createToken('t', [SanctumAbility::AdminPanel->value])->plainTextToken;
    }

    private function checkedInParticipation(): Participation
    {
        $event = Event::factory()->create([
            'status' => EventStatus::REGISTRATION_OPEN,
            'views_count' => 0,
        ]);
        $user = User::factory()->create();
        $p = Participation::factory()->create([
            'user_id' => $user->id,
            'event_id' => $event->id,
            'status' => ParticipationStatus::JOINED,
            'payment_status' => ParticipationPaymentStatus::NOT_REQUIRED,
            'qr_token' => null,
        ]);

        return app(QrTokenService::class)->ensureForConfirmed($p->fresh());
    }

    public function test_certificate_unique_on_participation_id(): void
    {
        $p = $this->checkedInParticipation();
        Certificate::factory()->create(['participation_id' => $p->id]);

        $this->expectException(\Illuminate\Database\QueryException::class);
        Certificate::factory()->create(['participation_id' => $p->id]);
    }

    public function test_certificate_issuance_is_idempotent(): void
    {
        $p = $this->checkedInParticipation();
        $svc = app(CertificateIssuanceService::class);

        $a = $svc->issueForParticipation($p);
        $b = $svc->issueForParticipation($p);

        $this->assertSame($a->id, $b->id);
        $this->assertSame(1, Certificate::where('participation_id', $p->id)->count());
    }

    public function test_check_in_dispatches_event_and_issues_certificate(): void
    {
        EventFacade::fake([ParticipationCheckedIn::class]);

        $p = $this->checkedInParticipation();
        app(QrValidationService::class)->validate($p->qr_token);

        EventFacade::assertDispatched(ParticipationCheckedIn::class);

        // Run real issuance (listener not auto with fake)
        EventFacade::assertDispatched(ParticipationCheckedIn::class, function ($e) use ($p) {
            app(CertificateIssuanceService::class)->issueForParticipation($e->participation);

            return $e->participation->id === $p->id;
        });

        $this->assertDatabaseHas('certificates', ['participation_id' => $p->id]);
    }

    public function test_check_in_issues_certificate_via_listener(): void
    {
        $p = $this->checkedInParticipation();
        app(QrValidationService::class)->validate($p->qr_token);

        $this->assertDatabaseHas('certificates', ['participation_id' => $p->id]);
        $this->assertSame(1, Certificate::where('participation_id', $p->id)->count());

        // Re-scan must not create another
        app(QrValidationService::class)->validate($p->qr_token);
        $this->assertSame(1, Certificate::where('participation_id', $p->id)->count());
    }

    public function test_feedback_rejected_for_joined_participation(): void
    {
        $event = Event::factory()->create();
        $p = Participation::factory()->create([
            'event_id' => $event->id,
            'status' => ParticipationStatus::JOINED,
            'payment_status' => ParticipationPaymentStatus::NOT_REQUIRED,
        ]);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('checked-in');
        app(EventFeedbackService::class)->submit($p, 5, 'Great');
    }

    public function test_feedback_rejected_for_waitlisted(): void
    {
        $p = Participation::factory()->create([
            'status' => ParticipationStatus::WAITLISTED,
        ]);

        $this->expectException(\InvalidArgumentException::class);
        app(EventFeedbackService::class)->submit($p, 4);
    }

    public function test_feedback_allowed_for_checked_in(): void
    {
        $p = Participation::factory()->create([
            'status' => ParticipationStatus::CHECKED_IN,
        ]);

        $row = app(EventFeedbackService::class)->submit($p, 5, 'Nice');
        $this->assertSame(5, $row->rating);
    }

    public function test_feedback_api_rejects_joined(): void
    {
        $p = Participation::factory()->create([
            'status' => ParticipationStatus::JOINED,
        ]);

        $response = $this->withHeader('Authorization', 'Bearer '.$this->token())
            ->postJson('/api/v1/event-feedback', [
                'participation_id' => $p->id,
                'rating' => 3,
            ]);

        $response->assertStatus(400)
            ->assertJsonPath('errors.error_code.0', 'feedback_not_allowed');
    }

    public function test_analytics_uses_efficient_aggregates(): void
    {
        $event = Event::factory()->create(['views_count' => 100]);
        $p1 = Participation::factory()->create([
            'event_id' => $event->id,
            'status' => ParticipationStatus::JOINED,
            'payment_status' => ParticipationPaymentStatus::NOT_REQUIRED,
        ]);
        Participation::factory()->create([
            'event_id' => $event->id,
            'status' => ParticipationStatus::CHECKED_IN,
            'payment_status' => ParticipationPaymentStatus::NOT_REQUIRED,
        ]);
        Payment::factory()->completed()->create([
            'participation_id' => $p1->id,
            'amount' => 40,
        ]);

        $stats = app(EventAnalyticsService::class)->forEvent($event);

        $this->assertSame(100, $stats['views']);
        $this->assertSame(2, $stats['registrations']);
        $this->assertSame(1, $stats['check_ins']);
        $this->assertSame(40.0, $stats['revenue']);
        $this->assertSame(2.0, $stats['conversion_rate']); // 2/100 * 100
        $this->assertSame(50.0, $stats['attendance_rate']); // 1/2 * 100
    }

    public function test_admin_analytics_and_oversight_endpoints(): void
    {
        $event = Event::factory()->create(['views_count' => 5]);
        EventAnnouncement::create([
            'event_id' => $event->id,
            'subject' => 'Hello',
            'body' => 'World',
            'sent_at' => now(),
        ]);
        EventSponsor::create([
            'event_id' => $event->id,
            'name' => 'Acme',
            'tier' => 'gold',
        ]);

        $auth = $this->withHeader('Authorization', 'Bearer '.$this->token());

        $auth->getJson("/api/v1/events/{$event->id}/analytics")->assertOk()
            ->assertJsonPath('data.views', 5);
        $auth->getJson("/api/v1/events/{$event->id}/announcements")->assertOk()
            ->assertJsonCount(1, 'data.announcements');
        $auth->getJson("/api/v1/events/{$event->id}/sponsors")->assertOk()
            ->assertJsonCount(1, 'data.sponsors');
        $auth->getJson("/api/v1/events/{$event->id}/speakers")->assertOk();
        $auth->getJson("/api/v1/events/{$event->id}/sessions")->assertOk();
        $auth->getJson("/api/v1/events/{$event->id}/certificates")->assertOk();
        $auth->getJson("/api/v1/events/{$event->id}/feedback")->assertOk();
    }
}
