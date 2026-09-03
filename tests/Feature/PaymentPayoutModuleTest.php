<?php

namespace Tests\Feature;

use App\Enums\EventStatus;
use App\Enums\ParticipationPaymentStatus;
use App\Enums\ParticipationStatus;
use App\Enums\PaymentStatus;
use App\Enums\PayoutRequestStatus;
use App\Enums\SanctumAbility;
use App\Enums\UserStatus;
use App\Models\Event;
use App\Models\Participation;
use App\Models\Payment;
use App\Models\TicketType;
use App\Models\User;
use App\Services\CommissionSettings;
use App\Services\EventFinanceService;
use App\Services\PaymentService;
use App\Services\PayoutService;
use App\Services\WaafiPayService;
use App\Support\SomaliPhoneNormalizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PaymentPayoutModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            'view events',
            'view payments',
            'manage payments',
            'refund payments',
            'view payouts',
            'manage payouts',
            'manage settings',
            'view dashboard',
        ] as $name) {
            Permission::create(['name' => $name]);
        }

        $role = Role::create(['name' => 'admin']);
        $role->givePermissionTo(Permission::all());

        $this->admin = User::factory()->admin()->create([
            'email' => 'admin-pay@example.com',
            'password' => 'password',
            'status' => UserStatus::ACTIVE,
        ]);
        $this->admin->assignRole('admin');

        config([
            'waafipay.base_url' => 'https://waafi.test/asm',
            'waafipay.merchant_uid' => 'm-uid',
            'waafipay.api_user_id' => 'u-id',
            'waafipay.api_key' => 'secret-key-never-log',
            'waafipay.currency' => 'USD',
            'waafipay.http_timeout' => 180,
            'waafipay.pending_timeout_minutes' => 15,
        ]);

        CommissionSettings::setRate(10.0);
    }

    private function paidParticipation(float $price = 100): Participation
    {
        $event = Event::factory()->create([
            'status' => EventStatus::REGISTRATION_OPEN,
            'monetized' => true,
            'capacity' => 50,
        ]);
        $ticket = TicketType::factory()->create([
            'event_id' => $event->id,
            'price' => $price,
            'quantity_limit' => null,
            'quantity_sold' => 1,
            'sales_enabled' => true,
        ]);
        $user = User::factory()->create();

        return Participation::factory()->create([
            'user_id' => $user->id,
            'event_id' => $event->id,
            'ticket_type_id' => $ticket->id,
            'status' => ParticipationStatus::JOINED,
            'payment_status' => ParticipationPaymentStatus::PENDING,
        ]);
    }

    public function test_phone_normalizer(): void
    {
        $this->assertSame('252612345678', SomaliPhoneNormalizer::normalize('0612345678'));
        $this->assertSame('252612345678', SomaliPhoneNormalizer::normalize('612345678'));
        $this->assertSame('252612345678', SomaliPhoneNormalizer::normalize('252612345678'));
        $this->expectException(\InvalidArgumentException::class);
        SomaliPhoneNormalizer::normalize('12345');
    }

    public function test_waafi_success_requires_both_2001_and_approved(): void
    {
        $svc = app(WaafiPayService::class);

        $this->assertTrue($svc->isApprovedPayload([
            'responseCode' => '2001',
            'params' => ['state' => 'Approved'],
        ]));

        $this->assertFalse($svc->isApprovedPayload([
            'responseCode' => '2001',
            'params' => ['state' => 'declined'],
        ]));

        $this->assertFalse($svc->isApprovedPayload([
            'responseCode' => '5001',
            'params' => ['state' => 'approved'],
        ]));
    }

    public function test_charge_success_via_mocked_http(): void
    {
        Http::fake([
            'https://waafi.test/asm' => Http::response([
                'responseCode' => '2001',
                'responseMsg' => 'success',
                'params' => [
                    'state' => 'approved',
                    'transactionId' => 'W-TX-1',
                    'issuerTransactionId' => 'I-TX-1',
                ],
            ], 200),
        ]);

        $p = $this->paidParticipation(25);
        $payment = app(PaymentService::class)->charge($p, '0612345678');

        $this->assertSame(PaymentStatus::COMPLETED, $payment->status);
        $this->assertSame('W-TX-1', $payment->waafi_transaction_id);
        $this->assertSame(ParticipationPaymentStatus::PAID, $p->fresh()->payment_status);
        $this->assertSame(ParticipationStatus::PAID, $p->fresh()->status);
        $this->assertNotNull($p->fresh()->qr_token);
        $this->assertTrue(str_starts_with($payment->reference_id, 'INV-'));
    }

    public function test_charge_failure_maps_error_and_does_not_mark_paid(): void
    {
        Http::fake([
            'https://waafi.test/asm' => Http::response([
                'responseCode' => '5001',
                'responseMsg' => 'RCS_USER_REJECTED',
                'params' => ['state' => 'failed'],
            ], 200),
        ]);

        $p = $this->paidParticipation(25);
        $payment = app(PaymentService::class)->charge($p, '612345678');

        $this->assertSame(PaymentStatus::FAILED, $payment->status);
        $this->assertSame('user_rejected', $payment->failure_code);
        $fresh = $p->fresh();
        $this->assertSame(ParticipationPaymentStatus::FAILED, $fresh->payment_status);
        $this->assertSame(ParticipationStatus::CANCELLED, $fresh->status);
        $this->assertSame(0, $fresh->ticketType->quantity_sold);
        $this->assertSame(0, $fresh->event->registrations_count);
    }

    public function test_http_200_with_non_approved_is_not_success(): void
    {
        Http::fake([
            'https://waafi.test/asm' => Http::response([
                'responseCode' => '2001',
                'responseMsg' => 'ok',
                'params' => ['state' => 'pending'],
            ], 200),
        ]);

        $p = $this->paidParticipation(10);
        $payment = app(PaymentService::class)->charge($p, '252612345678');

        $this->assertSame(PaymentStatus::FAILED, $payment->status);
    }

    public function test_expire_pending_cancels_participation(): void
    {
        $p = $this->paidParticipation(10);
        $payment = Payment::factory()->create([
            'participation_id' => $p->id,
            'ticket_type_id' => $p->ticket_type_id,
            'amount' => 10,
            'status' => PaymentStatus::PENDING,
            'expires_at' => now()->subMinute(),
        ]);

        app(PaymentService::class)->expirePending($payment);

        $this->assertSame(PaymentStatus::FAILED, $payment->fresh()->status);
        $this->assertSame(ParticipationStatus::CANCELLED, $p->fresh()->status);
        $this->assertSame(ParticipationPaymentStatus::FAILED, $p->fresh()->payment_status);
    }

    public function test_commission_snapshot_not_live_rate(): void
    {
        $p = $this->paidParticipation(100);
        Payment::factory()->completed()->create([
            'participation_id' => $p->id,
            'ticket_type_id' => $p->ticket_type_id,
            'amount' => 100,
        ]);

        CommissionSettings::setRate(10);
        $payout = app(PayoutService::class)->request($p->event, 50);
        $this->assertEquals(10.0, (float) $payout->commission_rate);

        CommissionSettings::setRate(25); // live rate changes
        $amounts = $payout->fresh()->computeAmountsFromSnapshot();
        // Still 10% of 50 = 5, not 25%
        $this->assertSame('5.00', $amounts['commission_amount']);
        $this->assertSame('45.00', $amounts['net_amount']);
    }

    public function test_double_payout_guard_on_approve(): void
    {
        $p = $this->paidParticipation(100);
        Payment::factory()->completed()->create([
            'participation_id' => $p->id,
            'amount' => 100,
            'ticket_type_id' => $p->ticket_type_id,
        ]);

        $svc = app(PayoutService::class);
        $a = $svc->request($p->event, 80);

        // Overlapping request (e.g. race) — both cannot be approved while outstanding is 100
        $b = \App\Models\PayoutRequest::create([
            'organizer_id' => $p->event->organizer_id,
            'event_id' => $p->event_id,
            'requested_amount' => 80,
            'status' => PayoutRequestStatus::REQUESTED,
            'commission_rate' => 10,
        ]);

        try {
            $svc->approve($a, $this->admin);
            $this->fail('Expected approve to fail while overlapping request reserves funds');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('double-payout', $e->getMessage());
        }

        $svc->reject($b, $this->admin);
        $approved = $svc->approve($a->fresh(), $this->admin);
        $this->assertSame(PayoutRequestStatus::APPROVED, $approved->status);

        $c = \App\Models\PayoutRequest::create([
            'organizer_id' => $p->event->organizer_id,
            'event_id' => $p->event_id,
            'requested_amount' => 80,
            'status' => PayoutRequestStatus::REQUESTED,
            'commission_rate' => 10,
        ]);

        $this->expectException(\RuntimeException::class);
        $svc->approve($c, $this->admin);
    }

    public function test_cannot_request_more_than_outstanding(): void
    {
        $p = $this->paidParticipation(40);
        Payment::factory()->completed()->create([
            'participation_id' => $p->id,
            'amount' => 40,
            'ticket_type_id' => $p->ticket_type_id,
        ]);

        $this->expectException(\InvalidArgumentException::class);
        app(PayoutService::class)->request($p->event, 50);
    }

    public function test_refund_blocked_after_payout_paid(): void
    {
        $p = $this->paidParticipation(100);
        $payment = Payment::factory()->completed()->create([
            'participation_id' => $p->id,
            'amount' => 100,
            'ticket_type_id' => $p->ticket_type_id,
        ]);

        $svc = app(PayoutService::class);
        $payout = $svc->request($p->event, 100);
        $svc->approve($payout, $this->admin);
        $svc->recordPayment($payout->fresh(), $this->admin);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Refund blocked');
        app(PaymentService::class)->refund($payment);
    }

    public function test_refund_blocked_api_returns_error_code(): void
    {
        $p = $this->paidParticipation(100);
        $payment = Payment::factory()->completed()->create([
            'participation_id' => $p->id,
            'amount' => 100,
            'ticket_type_id' => $p->ticket_type_id,
        ]);

        $svc = app(PayoutService::class);
        $payout = $svc->request($p->event, 100);
        $svc->approve($payout, $this->admin);
        $svc->recordPayment($payout->fresh(), $this->admin);

        $token = $this->admin->createToken('t', [SanctumAbility::AdminPanel->value])->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/payments/'.$payment->id.'/refund');

        $response->assertStatus(400)
            ->assertJsonPath('errors.error_code.0', 'refund_blocked_payout_recorded')
            ->assertJsonFragment(['message' => $response->json('message')]);

        $this->assertStringContainsString('Refund blocked', (string) $response->json('message'));
    }

    public function test_event_finance_summary(): void
    {
        $p = $this->paidParticipation(80);
        Payment::factory()->completed()->create([
            'participation_id' => $p->id,
            'amount' => 80,
            'ticket_type_id' => $p->ticket_type_id,
        ]);

        $summary = app(EventFinanceService::class)->summary($p->event_id);
        $this->assertSame(80.0, $summary['total_collected']);
        $this->assertSame(80.0, $summary['outstanding_balance']);
    }

    public function test_payout_api_workflow(): void
    {
        $p = $this->paidParticipation(60);
        Payment::factory()->completed()->create([
            'participation_id' => $p->id,
            'amount' => 60,
            'ticket_type_id' => $p->ticket_type_id,
        ]);

        $token = $this->admin->createToken('t', [SanctumAbility::AdminPanel->value])->plainTextToken;

        $create = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/v1/payout-requests', [
                'event_id' => $p->event_id,
                'requested_amount' => 60,
            ]);
        $create->assertCreated();
        $id = $create->json('data.id');
        $this->assertEquals(10, (float) $create->json('data.commission_rate'));

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/payout-requests/{$id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.commission_amount', '6.00')
            ->assertJsonPath('data.net_amount', '54.00');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson("/api/v1/payout-requests/{$id}/record-payment", [
                'confirmed_amount' => 54,
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'paid');
    }

    public function test_reference_id_unique_constraint(): void
    {
        $p = $this->paidParticipation(5);
        Payment::factory()->create([
            'participation_id' => $p->id,
            'reference_id' => 'INV-SAME',
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);
        Payment::factory()->create([
            'participation_id' => $p->id,
            'reference_id' => 'INV-SAME',
        ]);
    }
}
