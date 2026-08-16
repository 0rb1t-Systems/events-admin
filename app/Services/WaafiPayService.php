<?php

namespace App\Services;

use App\Support\SomaliPhoneNormalizer;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;
use Throwable;

/**
 * WaafiPay Hormuud EVC purchase integration.
 *
 * Success ONLY when BOTH:
 *   responseCode === "2001"
 *   AND strtolower(params.state) === "approved"
 *
 * HTTP 200 alone is NOT success.
 *
 * Timeout: config('waafipay.http_timeout') default 180s — customer approves on phone
 * before the HTTP response returns.
 *
 * Never log apiKey in plaintext.
 */
class WaafiPayService
{
    /**
     * Lookup table: Waafi responseMsg → [failure_code, user_facing_message]
     *
     * @var array<string, array{0: string, 1: string}>
     */
    public const ERROR_MAP = [
        'RCS_NO_ROUTE_FOUND' => ['no_route', 'Payment route unavailable. Check the phone number.'],
        'RCS_USER_REJECTED' => ['user_rejected', 'Payment was rejected on the phone.'],
        'Invalid_PIN' => ['invalid_pin', 'Incorrect PIN entered.'],
        'RCS_INSUFFICIENT_BALANCE' => ['insufficient_balance', 'Insufficient mobile money balance.'],
        'RCS_ACCOUNT_BLOCKED' => ['account_blocked', 'The mobile money account is blocked.'],
        'RCS_TRANSACTION_LIMIT_EXCEEDED' => ['limit_exceeded', 'Transaction limit exceeded.'],
        'RCS_SERVICE_UNAVAILABLE' => ['service_unavailable', 'Payment service temporarily unavailable.'],
        'RCS_TIMEOUT' => ['timeout', 'Payment timed out waiting for approval.'],
    ];

    /**
     * @return array{
     *   success: bool,
     *   request_id: string,
     *   response_code: string|null,
     *   response_msg: string|null,
     *   state: string|null,
     *   transaction_id: string|null,
     *   issuer_transaction_id: string|null,
     *   failure_code: string|null,
     *   failure_reason: string|null,
     *   raw: array<string, mixed>|null
     * }
     */
    public function purchase(string $referenceId, string $amountDecimal2, string $payerPhone): array
    {
        $phone = SomaliPhoneNormalizer::normalize($payerPhone);
        $requestId = (string) Str::uuid();
        $timestamp = now()->format('Y-m-d H:i:s.v');

        $payload = [
            'schemaVersion' => '1.0',
            'requestId' => $requestId,
            'timestamp' => $timestamp,
            'channelName' => 'WEB',
            'serviceName' => config('waafipay.service_name', 'API_PURCHASE'),
            'serviceParams' => [
                'merchantUid' => config('waafipay.merchant_uid'),
                'apiUserId' => config('waafipay.api_user_id'),
                'apiKey' => config('waafipay.api_key'),
                'paymentMethod' => config('waafipay.payment_method', 'MWALLET_ACCOUNT'),
                'payerInfo' => [
                    'accountNo' => $phone,
                ],
                'transactionInfo' => [
                    'referenceId' => $referenceId,
                    'invoiceId' => $referenceId,
                    'amount' => $amountDecimal2,
                    'currency' => config('waafipay.currency', 'USD'),
                    'description' => 'Event ticket payment',
                ],
            ],
        ];

        $this->assertCredentialsPresent();

        $timeout = (int) config('waafipay.http_timeout', 180);
        $url = rtrim((string) config('waafipay.base_url'), '/');

        try {
            $response = Http::timeout($timeout)
                ->acceptJson()
                ->asJson()
                ->post($url, $payload);
        } catch (ConnectionException $e) {
            $this->logSafe('WaafiPay connection error', [
                'request_id' => $requestId,
                'reference_id' => $referenceId,
                'error' => $e->getMessage(),
            ]);

            return $this->failureResult(
                $requestId,
                null,
                'RCS_TIMEOUT',
                null,
                ['error' => 'connection_exception']
            );
        } catch (Throwable $e) {
            $this->logSafe('WaafiPay unexpected error', [
                'request_id' => $requestId,
                'reference_id' => $referenceId,
                'error' => $e->getMessage(),
            ]);

            throw new RuntimeException('WaafiPay request failed: '.$e->getMessage(), 0, $e);
        }

        return $this->interpretResponse($response, $requestId, $referenceId);
    }

    /**
     * Exact success check — BOTH conditions required.
     */
    public function isApprovedPayload(array $body): bool
    {
        $responseCode = (string) ($body['responseCode'] ?? '');
        $state = strtolower((string) data_get($body, 'params.state', ''));

        // BOTH required — do not treat HTTP 200 alone as success
        return $responseCode === '2001' && $state === 'approved';
    }

    /**
     * @return array{0: string, 1: string} [failure_code, failure_reason]
     */
    public function mapFailure(?string $responseMsg): array
    {
        $key = $responseMsg ?? '';
        if (isset(self::ERROR_MAP[$key])) {
            return self::ERROR_MAP[$key];
        }

        return ['unknown', $responseMsg ? "Payment failed: {$responseMsg}" : 'Payment failed.'];
    }

    /**
     * @return array{
     *   success: bool,
     *   request_id: string,
     *   response_code: string|null,
     *   response_msg: string|null,
     *   state: string|null,
     *   transaction_id: string|null,
     *   issuer_transaction_id: string|null,
     *   failure_code: string|null,
     *   failure_reason: string|null,
     *   raw: array<string, mixed>|null
     * }
     */
    private function interpretResponse(Response $response, string $requestId, string $referenceId): array
    {
        $body = $response->json() ?? [];
        $responseCode = isset($body['responseCode']) ? (string) $body['responseCode'] : null;
        $responseMsg = isset($body['responseMsg']) ? (string) $body['responseMsg'] : null;
        $state = data_get($body, 'params.state');
        $stateStr = $state !== null ? (string) $state : null;

        $this->logSafe('WaafiPay response', [
            'request_id' => $requestId,
            'reference_id' => $referenceId,
            'http_status' => $response->status(),
            'response_code' => $responseCode,
            'response_msg' => $responseMsg,
            'state' => $stateStr,
        ]);

        if ($this->isApprovedPayload(is_array($body) ? $body : [])) {
            return [
                'success' => true,
                'request_id' => $requestId,
                'response_code' => $responseCode,
                'response_msg' => $responseMsg,
                'state' => $stateStr,
                'transaction_id' => data_get($body, 'params.transactionId')
                    ? (string) data_get($body, 'params.transactionId')
                    : null,
                'issuer_transaction_id' => data_get($body, 'params.issuerTransactionId')
                    ? (string) data_get($body, 'params.issuerTransactionId')
                    : null,
                'failure_code' => null,
                'failure_reason' => null,
                'raw' => $body,
            ];
        }

        return $this->failureResult($requestId, $responseCode, $responseMsg, $stateStr, $body);
    }

    /**
     * @param  array<string, mixed>|null  $raw
     * @return array{
     *   success: bool,
     *   request_id: string,
     *   response_code: string|null,
     *   response_msg: string|null,
     *   state: string|null,
     *   transaction_id: string|null,
     *   issuer_transaction_id: string|null,
     *   failure_code: string|null,
     *   failure_reason: string|null,
     *   raw: array<string, mixed>|null
     * }
     */
    private function failureResult(
        string $requestId,
        ?string $responseCode,
        ?string $responseMsg,
        ?string $state,
        ?array $raw
    ): array {
        [$code, $reason] = $this->mapFailure($responseMsg);

        return [
            'success' => false,
            'request_id' => $requestId,
            'response_code' => $responseCode,
            'response_msg' => $responseMsg,
            'state' => $state,
            'transaction_id' => null,
            'issuer_transaction_id' => null,
            'failure_code' => $code,
            'failure_reason' => $reason,
            'raw' => $raw,
        ];
    }

    private function assertCredentialsPresent(): void
    {
        foreach (['merchant_uid', 'api_user_id', 'api_key'] as $key) {
            if (! config("waafipay.{$key}")) {
                throw new InvalidArgumentException("WaafiPay config missing: {$key}");
            }
        }
    }

    /** @param  array<string, mixed>  $context */
    private function logSafe(string $message, array $context): void
    {
        // Explicit redaction — never log apiKey / credentials
        unset($context['apiKey'], $context['api_key'], $context['payload']);

        Log::info($message, $context);
    }
}
