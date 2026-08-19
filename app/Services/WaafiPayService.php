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
     * Lookup table: Waafi responseMsg → failure_code (stable domain code).
     * The mapped code is always used as `failure_code`.
     * The human-readable `failure_reason` is derived separately via
     * extractFailureReason() which prefers params.description > responseMsg fallback.
     *
     * @var array<string, string>
     */
    public const ERROR_CODE_MAP = [
        'RCS_NO_ROUTE_FOUND' => 'no_route',
        'RCS_USER_REJECTED' => 'user_rejected',
        'Invalid_PIN' => 'invalid_pin',
        'RCS_INSUFFICIENT_BALANCE' => 'insufficient_balance',
        'RCS_ACCOUNT_BLOCKED' => 'account_blocked',
        'RCS_TRANSACTION_LIMIT_EXCEEDED' => 'limit_exceeded',
        'RCS_SERVICE_UNAVAILABLE' => 'service_unavailable',
        'RCS_TIMEOUT' => 'timeout',
    ];

    /**
     * Fallback English reasons used ONLY when params.description is absent AND
     * responseMsg is a known technical code (i.e. not itself human-readable).
     *
     * @var array<string, string>
     */
    public const ERROR_FALLBACK_REASON = [
        'RCS_NO_ROUTE_FOUND' => 'Payment route unavailable. Check the phone number.',
        'RCS_USER_REJECTED' => 'Payment was rejected on the phone.',
        'Invalid_PIN' => 'Incorrect PIN entered.',
        'RCS_INSUFFICIENT_BALANCE' => 'Insufficient mobile money balance.',
        'RCS_ACCOUNT_BLOCKED' => 'The mobile money account is blocked.',
        'RCS_TRANSACTION_LIMIT_EXCEEDED' => 'Transaction limit exceeded.',
        'RCS_SERVICE_UNAVAILABLE' => 'Payment service temporarily unavailable.',
        'RCS_TIMEOUT' => 'Payment timed out waiting for approval.',
    ];

    /**
     * @deprecated Use ERROR_CODE_MAP + ERROR_FALLBACK_REASON instead.
     *             Kept for backward compatibility with callers using the old array shape.
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
     * @deprecated Use extractFailureReason() + failure code lookup directly.
     *             Kept for legacy callers that only have responseMsg.
     */
    public function mapFailure(?string $responseMsg): array
    {
        $key = $responseMsg ?? '';
        if (isset(self::ERROR_MAP[$key])) {
            return self::ERROR_MAP[$key];
        }

        return ['unknown', $responseMsg ? "Payment failed: {$responseMsg}" : 'Payment was not approved.'];
    }

    /**
     * Derive stable failure_code from responseMsg.
     *
     * Returns a stable domain code (e.g. 'user_rejected') when responseMsg is a
     * known Waafi technical code, or 'unknown' otherwise.
     */
    public function resolveFailureCode(?string $responseMsg): string
    {
        return self::ERROR_CODE_MAP[$responseMsg ?? ''] ?? 'unknown';
    }

    /**
     * Extract a customer-safe failure reason using priority:
     *   1. params.description  — Waafi's own human-readable field (may be Somali or English)
     *   2. responseMsg fallback — if responseMsg is a known technical code, use mapped English phrase
     *   3. responseMsg itself   — if non-empty but not a known code (might be human-readable from Waafi)
     *   4. stable fallback      — "Payment was not approved."
     *
     * Does NOT translate. Does NOT expose technical codes as failure_reason.
     *
     * @param  array<string, mixed>  $body  Full decoded Waafi response body
     */
    public function extractFailureReason(array $body): string
    {
        $description = data_get($body, 'params.description');
        if ($description !== null && $description !== '') {
            $sanitized = $this->sanitizeCustomerMessage((string) $description);
            if ($sanitized !== '') {
                return $sanitized;
            }
        }

        $responseMsg = isset($body['responseMsg']) ? (string) $body['responseMsg'] : null;

        if ($responseMsg !== null && $responseMsg !== '') {
            if (isset(self::ERROR_FALLBACK_REASON[$responseMsg])) {
                return self::ERROR_FALLBACK_REASON[$responseMsg];
            }

            $sanitized = $this->sanitizeCustomerMessage($responseMsg);
            if ($sanitized !== '') {
                return $sanitized;
            }
        }

        return 'Payment was not approved.';
    }

    /**
     * Sanitize a gateway customer message for safe display.
     *
     * - Trims whitespace
     * - Strips obvious technical wrappers (e.g. "Error: ", "Exception: " prefixes)
     * - Preserves meaningful Somali or English wallet messages verbatim
     * - Does NOT translate
     * - Returns empty string if nothing useful remains
     */
    public function sanitizeCustomerMessage(string $raw): string
    {
        $cleaned = trim($raw);

        // Strip common technical prefixes that add no customer value
        $cleaned = preg_replace('/^(Error|Exception|Fault|Failure):\s*/i', '', $cleaned) ?? $cleaned;
        $cleaned = trim((string) $cleaned);

        if ($cleaned === '') {
            return '';
        }

        // If the result is purely an uppercase_UNDERSCORE_IDENTIFIER (e.g. RCS_USER_REJECTED)
        // it's a technical code, not a customer message — return empty so caller falls through
        if (preg_match('/^[A-Z][A-Z0-9_]+$/', $cleaned)) {
            return '';
        }

        return $cleaned;
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
        // HTTP 401 means our API credentials were rejected by Waafi — not a customer decline.
        // The response body is typically empty or non-JSON on 401, so handle before JSON decode.
        if ($response->status() === 401) {
            $this->logSafe('WaafiPay authentication failure (HTTP 401)', [
                'request_id' => $requestId,
                'reference_id' => $referenceId,
            ]);

            return [
                'success' => false,
                'request_id' => $requestId,
                'response_code' => null,
                'response_msg' => null,
                'state' => null,
                'transaction_id' => null,
                'issuer_transaction_id' => null,
                'failure_code' => 'gateway_auth_error',
                'failure_reason' => 'Payment service configuration error. Please contact support.',
                'raw' => null,
            ];
        }

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
        $bodyForExtraction = $raw ?? [];
        // Ensure responseMsg is available for fallback even when raw was partially missing
        if ($responseMsg !== null && ! isset($bodyForExtraction['responseMsg'])) {
            $bodyForExtraction['responseMsg'] = $responseMsg;
        }

        $code = $this->resolveFailureCode($responseMsg);
        $reason = $this->extractFailureReason($bodyForExtraction);

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
