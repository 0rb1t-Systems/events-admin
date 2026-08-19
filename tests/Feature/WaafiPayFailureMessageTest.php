<?php

namespace Tests\Feature;

use App\Enums\ParticipationPaymentStatus;
use App\Enums\ParticipationStatus;
use App\Enums\PaymentStatus;
use App\Models\Event;
use App\Models\Participation;
use App\Models\TicketType;
use App\Models\User;
use App\Services\WaafiPayService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Tests that Waafi failure messages are correctly extracted and preserved
 * through to the participant payment API response.
 *
 * Priority order for failure_reason:
 *   1. params.description  (Waafi human-readable field — may be Somali or English)
 *   2. responseMsg English fallback when responseMsg is a known technical code
 *   3. responseMsg itself when non-empty and not a known technical code
 *   4. stable fallback "Payment was not approved."
 */
class WaafiPayFailureMessageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

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

    // ─── Unit: WaafiPayService extraction helpers ────────────────────────────

    public function test_extract_failure_reason_prefers_params_description(): void
    {
        $svc = app(WaafiPayService::class);

        $body = [
            'responseCode' => '5001',
            'responseMsg' => 'RCS_USER_REJECTED',
            'params' => [
                'state' => 'DECLINED',
                'description' => 'Haraagaagu kuguma filna',
            ],
        ];

        $this->assertSame('Haraagaagu kuguma filna', $svc->extractFailureReason($body));
    }

    public function test_extract_failure_reason_falls_back_to_mapped_english_when_no_description(): void
    {
        $svc = app(WaafiPayService::class);

        $body = [
            'responseCode' => '5001',
            'responseMsg' => 'RCS_USER_REJECTED',
            'params' => ['state' => 'DECLINED'],
        ];

        $this->assertSame('Payment was rejected on the phone.', $svc->extractFailureReason($body));
    }

    public function test_extract_failure_reason_uses_response_msg_when_not_a_technical_code(): void
    {
        $svc = app(WaafiPayService::class);

        $body = [
            'responseCode' => '5001',
            'responseMsg' => 'Insufficient funds in your account',
            'params' => ['state' => 'DECLINED'],
        ];

        $this->assertSame('Insufficient funds in your account', $svc->extractFailureReason($body));
    }

    public function test_extract_failure_reason_uses_stable_fallback_when_both_missing(): void
    {
        $svc = app(WaafiPayService::class);

        $body = [
            'responseCode' => '5001',
            'params' => ['state' => 'DECLINED'],
        ];

        $this->assertSame('Payment was not approved.', $svc->extractFailureReason($body));
    }

    public function test_extract_failure_reason_uses_stable_fallback_for_all_null(): void
    {
        $svc = app(WaafiPayService::class);
        $this->assertSame('Payment was not approved.', $svc->extractFailureReason([]));
    }

    public function test_technical_code_only_response_msg_returns_fallback(): void
    {
        $svc = app(WaafiPayService::class);

        // RCS_USER_REJECTED is a technical code — sanitizer should strip it
        // and extractFailureReason should fall back to mapped English
        $body = [
            'responseCode' => '5001',
            'responseMsg' => 'RCS_USER_REJECTED',
            'params' => ['state' => 'DECLINED', 'description' => ''],
        ];

        // Empty description → fall through to responseMsg mapped fallback
        $this->assertSame('Payment was rejected on the phone.', $svc->extractFailureReason($body));
    }

    public function test_resolve_failure_code_returns_domain_code_for_known_msg(): void
    {
        $svc = app(WaafiPayService::class);
        $this->assertSame('insufficient_balance', $svc->resolveFailureCode('RCS_INSUFFICIENT_BALANCE'));
        $this->assertSame('user_rejected', $svc->resolveFailureCode('RCS_USER_REJECTED'));
        $this->assertSame('unknown', $svc->resolveFailureCode('SOMETHING_UNRECOGNIZED'));
        $this->assertSame('unknown', $svc->resolveFailureCode(null));
    }

    public function test_sanitize_customer_message_strips_technical_prefix(): void
    {
        $svc = app(WaafiPayService::class);
        $this->assertSame('Service is currently unavailable', $svc->sanitizeCustomerMessage('Error: Service is currently unavailable'));
        $this->assertSame('', $svc->sanitizeCustomerMessage('   '));
        $this->assertSame('Haraagaagu kuguma filna', $svc->sanitizeCustomerMessage('Haraagaagu kuguma filna'));
    }

    public function test_sanitize_returns_empty_for_uppercase_underscore_identifier(): void
    {
        $svc = app(WaafiPayService::class);
        // These are technical identifiers, not customer messages
        $this->assertSame('', $svc->sanitizeCustomerMessage('RCS_USER_REJECTED'));
        $this->assertSame('', $svc->sanitizeCustomerMessage('FAILED'));
        // Normal text should pass through
        $this->assertSame('Payment failed', $svc->sanitizeCustomerMessage('Payment failed'));
    }

    // ─── Integration: full charge → API response ────────────────────────────

    private function makeParticipantAndParticipation(float $price = 20): array
    {
        $participant = User::factory()->participant()->create(['status' => \App\Enums\UserStatus::ACTIVE]);
        $event = Event::factory()->create([
            'status' => \App\Enums\EventStatus::REGISTRATION_OPEN,
            'monetized' => true,
            'capacity' => 50,
        ]);
        $ticket = TicketType::factory()->create([
            'event_id' => $event->id,
            'price' => $price,
            'quantity_limit' => null,
            'quantity_sold' => 0,
            'sales_enabled' => true,
        ]);
        $participation = Participation::factory()->create([
            'user_id' => $participant->id,
            'event_id' => $event->id,
            'ticket_type_id' => $ticket->id,
            'status' => ParticipationStatus::JOINED,
            'payment_status' => ParticipationPaymentStatus::PENDING,
        ]);

        return [$participant, $participation];
    }

    private function participantToken(User $user): string
    {
        return $user->createToken('web', [\App\Enums\SanctumAbility::WebParticipant->value])->plainTextToken;
    }

    public function test_approved_payment_has_no_failure_fields(): void
    {
        Http::fake([
            'https://waafi.test/asm' => Http::response([
                'responseCode' => '2001',
                'responseMsg' => 'success',
                'params' => [
                    'state' => 'approved',
                    'transactionId' => 'W-TX-OK',
                    'issuerTransactionId' => 'I-TX-OK',
                ],
            ], 200),
        ]);

        [$participant, $participation] = $this->makeParticipantAndParticipation();
        $token = $this->participantToken($participant);

        $this->withToken($token)
            ->postJson('/api/v1/participant/payments/charge', [
                'participation_id' => $participation->id,
                'payer_phone' => '0612345678',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', PaymentStatus::COMPLETED->value)
            ->assertJsonPath('data.failure_code', null)
            ->assertJsonPath('data.failure_reason', null);
    }

    public function test_declined_with_params_description_preserves_customer_message(): void
    {
        Http::fake([
            'https://waafi.test/asm' => Http::response([
                'responseCode' => '5001',
                'responseMsg' => 'FAILED',
                'params' => [
                    'state' => 'DECLINED',
                    'description' => 'Haraagaagu kuguma filna',
                ],
            ], 200),
        ]);

        [$participant, $participation] = $this->makeParticipantAndParticipation();
        $token = $this->participantToken($participant);

        $response = $this->withToken($token)
            ->postJson('/api/v1/participant/payments/charge', [
                'participation_id' => $participation->id,
                'payer_phone' => '0612345678',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', PaymentStatus::FAILED->value)
            ->assertJsonPath('data.failure_reason', 'Haraagaagu kuguma filna');

        // failure_code should be 'unknown' since 'FAILED' is not in the code map
        $this->assertSame('unknown', $response->json('data.failure_code'));

        // Payment row should also have the message persisted
        $paymentId = $response->json('data.id');
        $dbPayment = \App\Models\Payment::find($paymentId);
        $this->assertSame('Haraagaagu kuguma filna', $dbPayment->failure_reason);
    }

    public function test_declined_with_known_code_but_no_description_uses_english_fallback(): void
    {
        Http::fake([
            'https://waafi.test/asm' => Http::response([
                'responseCode' => '5001',
                'responseMsg' => 'RCS_INSUFFICIENT_BALANCE',
                'params' => ['state' => 'DECLINED'],
            ], 200),
        ]);

        [$participant, $participation] = $this->makeParticipantAndParticipation();
        $token = $this->participantToken($participant);

        $this->withToken($token)
            ->postJson('/api/v1/participant/payments/charge', [
                'participation_id' => $participation->id,
                'payer_phone' => '0612345678',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', PaymentStatus::FAILED->value)
            ->assertJsonPath('data.failure_code', 'insufficient_balance')
            ->assertJsonPath('data.failure_reason', 'Insufficient mobile money balance.');
    }

    public function test_declined_with_human_readable_response_msg_and_no_description(): void
    {
        Http::fake([
            'https://waafi.test/asm' => Http::response([
                'responseCode' => '5001',
                'responseMsg' => 'Insufficient funds in your account',
                'params' => ['state' => 'DECLINED'],
            ], 200),
        ]);

        [$participant, $participation] = $this->makeParticipantAndParticipation();
        $token = $this->participantToken($participant);

        $this->withToken($token)
            ->postJson('/api/v1/participant/payments/charge', [
                'participation_id' => $participation->id,
                'payer_phone' => '0612345678',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', PaymentStatus::FAILED->value)
            ->assertJsonPath('data.failure_reason', 'Insufficient funds in your account');
    }

    public function test_declined_with_both_missing_uses_stable_fallback(): void
    {
        Http::fake([
            'https://waafi.test/asm' => Http::response([
                'responseCode' => '5001',
                'params' => ['state' => 'DECLINED'],
            ], 200),
        ]);

        [$participant, $participation] = $this->makeParticipantAndParticipation();
        $token = $this->participantToken($participant);

        $this->withToken($token)
            ->postJson('/api/v1/participant/payments/charge', [
                'participation_id' => $participation->id,
                'payer_phone' => '0612345678',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', PaymentStatus::FAILED->value)
            ->assertJsonPath('data.failure_reason', 'Payment was not approved.');
    }

    /**
     * Regression test for the REAL production failure observed on 2026-08-19:
     * Waafi returned HTTP 401 (authentication error) with null/empty body.
     * This should surface as gateway_auth_error, NOT the generic fallback.
     */
    public function test_http_401_from_waafi_produces_gateway_auth_error(): void
    {
        // Real Waafi 401 response: empty body, HTTP 401
        Http::fake([
            'https://waafi.test/asm' => Http::response(null, 401),
        ]);

        [$participant, $participation] = $this->makeParticipantAndParticipation();
        $token = $this->participantToken($participant);

        $response = $this->withToken($token)
            ->postJson('/api/v1/participant/payments/charge', [
                'participation_id' => $participation->id,
                'payer_phone' => '0612345678',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', PaymentStatus::FAILED->value)
            ->assertJsonPath('data.failure_code', 'gateway_auth_error')
            ->assertJsonPath('data.failure_reason', 'Payment service configuration error. Please contact support.');

        // Verify persisted on payment row
        $paymentId = $response->json('data.id');
        $dbPayment = \App\Models\Payment::find($paymentId);
        $this->assertSame('gateway_auth_error', $dbPayment->failure_code);
        $this->assertSame('Payment service configuration error. Please contact support.', $dbPayment->failure_reason);
    }

    public function test_declined_with_known_code_and_description_uses_description(): void
    {
        // When both are present, description wins over the mapped English fallback
        Http::fake([
            'https://waafi.test/asm' => Http::response([
                'responseCode' => '5001',
                'responseMsg' => 'RCS_USER_REJECTED',
                'params' => [
                    'state' => 'DECLINED',
                    'description' => 'Adiga ayaa diidey',
                ],
            ], 200),
        ]);

        [$participant, $participation] = $this->makeParticipantAndParticipation();
        $token = $this->participantToken($participant);

        $this->withToken($token)
            ->postJson('/api/v1/participant/payments/charge', [
                'participation_id' => $participation->id,
                'payer_phone' => '0612345678',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', PaymentStatus::FAILED->value)
            ->assertJsonPath('data.failure_code', 'user_rejected')
            ->assertJsonPath('data.failure_reason', 'Adiga ayaa diidey');
    }
}
