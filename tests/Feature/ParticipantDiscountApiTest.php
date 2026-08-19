<?php

namespace Tests\Feature;

use App\Enums\DiscountCodeType;
use App\Enums\EventStatus;
use App\Enums\ParticipationPaymentStatus;
use App\Enums\PaymentStatus;
use App\Enums\SanctumAbility;
use App\Enums\UserStatus;
use App\Models\DiscountCode;
use App\Models\Event;
use App\Models\Participation;
use App\Models\Payment;
use App\Models\TicketType;
use App\Models\User;
use App\Services\DiscountPricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ParticipantDiscountApiTest extends TestCase
{
    use RefreshDatabase;

    private User $participant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->participant = User::factory()->participant()->create([
            'email' => 'discount-participant@example.com',
            'status' => UserStatus::ACTIVE,
        ]);

        config([
            'waafipay.base_url' => 'https://waafi.test/asm',
            'waafipay.merchant_uid' => 'm-uid',
            'waafipay.api_user_id' => 'u-id',
            'waafipay.api_key' => 'secret-key-never-log',
            'waafipay.currency' => 'USD',
            'waafipay.http_timeout' => 180,
            'waafipay.pending_timeout_minutes' => 15,
        ]);
    }

    private function asParticipant(): static
    {
        $token = $this->participant->createToken(
            'web_participant_token',
            [SanctumAbility::WebParticipant->value]
        )->plainTextToken;

        return $this->withToken($token);
    }

    private function openEvent(): Event
    {
        return Event::factory()->create([
            'status' => EventStatus::REGISTRATION_OPEN,
            'capacity' => 50,
            'registrations_count' => 0,
            'monetized' => true,
        ]);
    }

    private function paidTicket(Event $event, float $price = 50): TicketType
    {
        return TicketType::factory()->paid($price)->create([
            'event_id' => $event->id,
            'quantity_limit' => null,
            'quantity_sold' => 0,
            'sales_enabled' => true,
        ]);
    }

    public function test_validate_event_scoped_percent_code(): void
    {
        $event = $this->openEvent();
        $ticket = $this->paidTicket($event, 50);
        DiscountCode::factory()->forEvent($event)->create([
            'code' => 'SAVE10',
            'type' => DiscountCodeType::PERCENT,
            'value' => 10,
        ]);

        $this->asParticipant()
            ->postJson("/api/v1/participant/events/{$event->id}/discount-codes/validate", [
                'code' => 'save10',
                'ticket_type_id' => $ticket->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.code', 'SAVE10')
            ->assertJsonPath('data.type', 'percent')
            ->assertJsonPath('data.original_amount', '50.00')
            ->assertJsonPath('data.discount_amount', '5.00')
            ->assertJsonPath('data.final_amount', '45.00');
    }

    public function test_validate_organizer_wide_fixed_code(): void
    {
        $event = $this->openEvent();
        $ticket = $this->paidTicket($event, 25);
        DiscountCode::factory()->organizerWide($event->organizer_id)->create([
            'code' => 'FLAT5',
            'type' => DiscountCodeType::FIXED,
            'value' => 5,
        ]);

        $this->asParticipant()
            ->postJson("/api/v1/participant/events/{$event->id}/discount-codes/validate", [
                'code' => 'FLAT5',
                'ticket_type_id' => $ticket->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.type', 'fixed')
            ->assertJsonPath('data.original_amount', '25.00')
            ->assertJsonPath('data.discount_amount', '5.00')
            ->assertJsonPath('data.final_amount', '20.00');
    }

    public function test_wrong_event_code_is_not_found(): void
    {
        $eventA = $this->openEvent();
        $eventB = $this->openEvent();
        $ticket = $this->paidTicket($eventA, 40);
        DiscountCode::factory()->forEvent($eventB)->create(['code' => 'OTHER']);

        $this->asParticipant()
            ->postJson("/api/v1/participant/events/{$eventA->id}/discount-codes/validate", [
                'code' => 'OTHER',
                'ticket_type_id' => $ticket->id,
            ])
            ->assertNotFound()
            ->assertJsonPath('errors.error_code.0', DiscountPricingService::ERROR_NOT_FOUND);
    }

    public function test_inactive_expired_and_exhausted_codes(): void
    {
        $event = $this->openEvent();
        $ticket = $this->paidTicket($event, 40);

        DiscountCode::factory()->forEvent($event)->create([
            'code' => 'DEAD',
            'active' => false,
        ]);
        DiscountCode::factory()->forEvent($event)->create([
            'code' => 'OLD',
            'expires_at' => now()->subDay(),
        ]);
        DiscountCode::factory()->forEvent($event)->create([
            'code' => 'MAXED',
            'usage_limit' => 1,
            'usage_count' => 1,
        ]);

        $this->asParticipant()
            ->postJson("/api/v1/participant/events/{$event->id}/discount-codes/validate", [
                'code' => 'DEAD',
                'ticket_type_id' => $ticket->id,
            ])
            ->assertStatus(400)
            ->assertJsonPath('errors.error_code.0', DiscountPricingService::ERROR_INACTIVE);

        $this->asParticipant()
            ->postJson("/api/v1/participant/events/{$event->id}/discount-codes/validate", [
                'code' => 'OLD',
                'ticket_type_id' => $ticket->id,
            ])
            ->assertStatus(400)
            ->assertJsonPath('errors.error_code.0', DiscountPricingService::ERROR_EXPIRED);

        $this->asParticipant()
            ->postJson("/api/v1/participant/events/{$event->id}/discount-codes/validate", [
                'code' => 'MAXED',
                'ticket_type_id' => $ticket->id,
            ])
            ->assertStatus(400)
            ->assertJsonPath('errors.error_code.0', DiscountPricingService::ERROR_USAGE);
    }

    public function test_fixed_greater_than_price_quotes_zero_and_join_marks_paid(): void
    {
        $event = $this->openEvent();
        $ticket = $this->paidTicket($event, 10);
        $code = DiscountCode::factory()->forEvent($event)->fixed(100)->create(['code' => 'HUGE']);

        $this->asParticipant()
            ->postJson("/api/v1/participant/events/{$event->id}/discount-codes/validate", [
                'code' => 'HUGE',
                'ticket_type_id' => $ticket->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.final_amount', '0.00');

        $join = $this->asParticipant()
            ->postJson('/api/v1/participant/participations', [
                'event_id' => $event->id,
                'ticket_type_id' => $ticket->id,
                'discount_code' => 'HUGE',
            ])
            ->assertCreated();

        $this->assertSame(ParticipationPaymentStatus::PAID->value, $join->json('data.payment_status'));
        $this->assertSame('0.00', $join->json('data.final_amount'));
        $this->assertSame(1, $code->fresh()->usage_count);
        $this->assertTrue((bool) Participation::query()->find($join->json('data.id'))->discount_usage_consumed);
    }

    public function test_failed_waafi_does_not_consume_code_success_consumes_once_retry_does_not_double(): void
    {
        $event = $this->openEvent();
        $ticket = $this->paidTicket($event, 40);
        $code = DiscountCode::factory()->forEvent($event)->create([
            'code' => 'SAVE10',
            'type' => DiscountCodeType::PERCENT,
            'value' => 10,
        ]);

        $join = $this->asParticipant()
            ->postJson('/api/v1/participant/participations', [
                'event_id' => $event->id,
                'ticket_type_id' => $ticket->id,
                'discount_code' => 'SAVE10',
            ])
            ->assertCreated();

        $participationId = $join->json('data.id');
        $this->assertSame('36.00', $join->json('data.final_amount'));
        $this->assertSame(0, $code->fresh()->usage_count);

        Http::fake([
            'https://waafi.test/asm' => Http::sequence()
                ->push([
                    'responseCode' => '5001',
                    'responseMsg' => 'RCS_USER_REJECTED',
                    'params' => ['state' => 'failed'],
                ], 200)
                ->push([
                    'responseCode' => '2001',
                    'responseMsg' => 'success',
                    'params' => [
                        'state' => 'approved',
                        'transactionId' => 'W-TX-D-1',
                        'issuerTransactionId' => 'I-TX-D-1',
                    ],
                ], 200),
        ]);

        $this->asParticipant()
            ->postJson('/api/v1/participant/payments/charge', [
                'participation_id' => $participationId,
                'payer_phone' => '0612345678',
                'amount' => '1.00',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', PaymentStatus::FAILED->value);

        $this->assertSame(0, $code->fresh()->usage_count);
        $failed = Payment::query()->where('participation_id', $participationId)->latest('id')->first();
        $this->assertSame('36.00', number_format((float) $failed->amount, 2, '.', ''));

        $this->asParticipant()
            ->postJson('/api/v1/participant/payments/charge', [
                'participation_id' => $participationId,
                'payer_phone' => '0612345678',
                'amount' => '1.00',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', PaymentStatus::COMPLETED->value)
            ->assertJsonPath('data.amount', '36.00');

        $this->assertSame(1, $code->fresh()->usage_count);

        $this->asParticipant()
            ->postJson('/api/v1/participant/payments/charge', [
                'participation_id' => $participationId,
                'payer_phone' => '0612345678',
            ])
            ->assertStatus(400);

        $this->assertSame(1, $code->fresh()->usage_count);

        $participation = Participation::query()->findOrFail($participationId);
        app(DiscountPricingService::class)->consumeUsageIfNeeded($participation);
        $this->assertSame(1, $code->fresh()->usage_count);
    }

    public function test_snapshot_survives_later_code_value_change(): void
    {
        $event = $this->openEvent();
        $ticket = $this->paidTicket($event, 40);
        $code = DiscountCode::factory()->forEvent($event)->create([
            'code' => 'SAVE10',
            'type' => DiscountCodeType::PERCENT,
            'value' => 10,
        ]);

        $join = $this->asParticipant()
            ->postJson('/api/v1/participant/participations', [
                'event_id' => $event->id,
                'ticket_type_id' => $ticket->id,
                'discount_code' => 'SAVE10',
            ])
            ->assertCreated();

        $code->update(['value' => 90]);

        Http::fake([
            'https://waafi.test/asm' => Http::response([
                'responseCode' => '2001',
                'responseMsg' => 'success',
                'params' => [
                    'state' => 'approved',
                    'transactionId' => 'W-TX-SNAP',
                    'issuerTransactionId' => 'I-TX-SNAP',
                ],
            ], 200),
        ]);

        $this->asParticipant()
            ->postJson('/api/v1/participant/payments/charge', [
                'participation_id' => $join->json('data.id'),
                'payer_phone' => '0612345678',
            ])
            ->assertOk()
            ->assertJsonPath('data.amount', '36.00');
    }
}
