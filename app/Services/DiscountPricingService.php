<?php

namespace App\Services;

use App\Enums\DiscountCodeType;
use App\Models\DiscountCode;
use App\Models\Event;
use App\Models\Participation;
use App\Models\TicketType;
use InvalidArgumentException;

class DiscountPricingService
{
    public const ERROR_NOT_FOUND = 'discount_not_valid_for_event';

    public const ERROR_INACTIVE = 'discount_inactive';

    public const ERROR_EXPIRED = 'discount_expired';

    public const ERROR_USAGE = 'discount_usage_exhausted';

    /**
     * Find a code in event or organizer-wide scope (does not require active).
     */
    public function findScoped(Event $event, string $code): ?DiscountCode
    {
        $normalized = strtoupper(trim($code));

        return DiscountCode::query()
            ->where('code', $normalized)
            ->where(function ($q) use ($event) {
                $q->where('event_id', $event->id)
                    ->orWhere(function ($q2) use ($event) {
                        $q2->whereNull('event_id')
                            ->where('organizer_id', $event->organizer_id);
                    });
            })
            ->first();
    }

    /**
     * @throws InvalidArgumentException with message = error_code
     */
    public function assertUsable(DiscountCode $code): void
    {
        if (! $code->active) {
            throw new InvalidArgumentException(self::ERROR_INACTIVE);
        }
        if ($code->isExpired()) {
            throw new InvalidArgumentException(self::ERROR_EXPIRED);
        }
        if (! $code->hasRemainingUses()) {
            throw new InvalidArgumentException(self::ERROR_USAGE);
        }
    }

    /**
     * @return array{
     *   code: string,
     *   type: string,
     *   value: string,
     *   original_amount: string,
     *   discount_amount: string,
     *   final_amount: string,
     *   discount_code_id: int
     * }
     */
    public function quote(TicketType $ticket, DiscountCode $code): array
    {
        $original = round((float) $ticket->price, 2);
        $discount = $this->discountAmount($original, $code);
        $final = max(0, round($original - $discount, 2));
        $type = $code->type instanceof DiscountCodeType ? $code->type->value : (string) $code->type;

        return [
            'code' => $code->code,
            'type' => $type,
            'value' => number_format((float) $code->value, 2, '.', ''),
            'original_amount' => number_format($original, 2, '.', ''),
            'discount_amount' => number_format($discount, 2, '.', ''),
            'final_amount' => number_format($final, 2, '.', ''),
            'discount_code_id' => $code->id,
        ];
    }

    public function discountAmount(float $original, DiscountCode $code): float
    {
        $type = $code->type instanceof DiscountCodeType ? $code->type : DiscountCodeType::tryFrom((string) $code->type);
        $value = (float) $code->value;

        if ($type === DiscountCodeType::PERCENT) {
            $amount = round($original * ($value / 100), 2);
        } else {
            $amount = round($value, 2);
        }

        return min($original, max(0, $amount));
    }

    /**
     * @return array<string, mixed>
     */
    public function snapshotPayload(array $quote): array
    {
        return [
            'code' => $quote['code'],
            'type' => $quote['type'],
            'value' => $quote['value'],
            'original_amount' => $quote['original_amount'],
            'discount_amount' => $quote['discount_amount'],
            'final_amount' => $quote['final_amount'],
        ];
    }

    /**
     * Increment usage_count once per participation after a successful paid outcome.
     */
    public function consumeUsageIfNeeded(Participation $participation): void
    {
        if (! $participation->discount_code_id || $participation->discount_usage_consumed) {
            return;
        }

        $code = DiscountCode::query()->whereKey($participation->discount_code_id)->lockForUpdate()->first();
        if ($code) {
            $code->increment('usage_count');
        }

        $participation->discount_usage_consumed = true;
        $participation->save();
    }

    public function chargeAmountFor(Participation $participation, TicketType $ticketType): string
    {
        if ($participation->final_amount !== null) {
            return number_format((float) $participation->final_amount, 2, '.', '');
        }

        return number_format((float) $ticketType->price, 2, '.', '');
    }

    public static function customerMessage(string $errorCode): string
    {
        return match ($errorCode) {
            self::ERROR_INACTIVE => 'Discount code is inactive.',
            self::ERROR_EXPIRED => 'Discount code has expired.',
            self::ERROR_USAGE => 'Discount code usage limit reached.',
            default => 'Discount code not valid for this event.',
        };
    }
}
