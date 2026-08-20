<?php

namespace App\Support;

use App\Enums\PackageDurationUnit;
use App\Models\Package;
use Carbon\CarbonInterface;
use InvalidArgumentException;

/**
 * Package plan duration helpers.
 *
 * Non-expiring rule: duration_value AND duration_unit both null → expires_at stays null.
 * Both must be set together for time-boxed packages.
 */
class PackageDuration
{
    public static function isNonExpiring(?int $value, PackageDurationUnit|string|null $unit): bool
    {
        return $value === null && ($unit === null || $unit === '');
    }

    public static function assertValidPair(?int $value, PackageDurationUnit|string|null $unit): void
    {
        $unitValue = $unit instanceof PackageDurationUnit ? $unit->value : $unit;

        if ($value === null && ($unitValue === null || $unitValue === '')) {
            return;
        }

        if ($value === null || $unitValue === null || $unitValue === '') {
            throw new InvalidArgumentException(
                'duration_value and duration_unit must both be set, or both null (non-expiring).'
            );
        }

        if ($value < 1) {
            throw new InvalidArgumentException('duration_value must be a positive integer.');
        }

        if (! in_array($unitValue, PackageDurationUnit::values(), true)) {
            throw new InvalidArgumentException('Invalid duration_unit.');
        }
    }

    public static function label(?int $value, PackageDurationUnit|string|null $unit): ?string
    {
        if (self::isNonExpiring($value, $unit)) {
            return null;
        }

        $unitValue = $unit instanceof PackageDurationUnit ? $unit->value : (string) $unit;
        $singular = $unitValue;
        $plural = $unitValue.'s';

        return $value === 1 ? "1 {$singular}" : "{$value} {$plural}";
    }

    public static function labelForPackage(Package $package): ?string
    {
        return self::label(
            $package->duration_value,
            $package->duration_unit
        );
    }

    /**
     * Calendar-aware expiry from start. Months/years use Carbon addMonthsNoOverflow / addYearsNoOverflow.
     */
    public static function expiresAt(
        CarbonInterface $startedAt,
        ?int $value,
        PackageDurationUnit|string|null $unit,
    ): ?CarbonInterface {
        self::assertValidPair($value, $unit);

        if (self::isNonExpiring($value, $unit)) {
            return null;
        }

        $unitEnum = $unit instanceof PackageDurationUnit
            ? $unit
            : PackageDurationUnit::from((string) $unit);

        $start = $startedAt->copy();

        return match ($unitEnum) {
            PackageDurationUnit::DAY => $start->addDays($value),
            PackageDurationUnit::WEEK => $start->addWeeks($value),
            PackageDurationUnit::MONTH => $start->addMonthsNoOverflow($value),
            PackageDurationUnit::YEAR => $start->addYearsNoOverflow($value),
        };
    }

    /**
     * @return array{
     *   package_id: int,
     *   package_name: string,
     *   package_price: string,
     *   event_quota: int|null,
     *   duration_value: int|null,
     *   duration_unit: string|null,
     *   duration_label: string|null,
     *   tier_rank: int
     * }
     */
    public static function snapshot(Package $package): array
    {
        return [
            'package_id' => $package->id,
            'package_name' => $package->name,
            'package_price' => number_format((float) $package->price, 2, '.', ''),
            'event_quota' => $package->event_quota,
            'duration_value' => $package->duration_value,
            'duration_unit' => $package->duration_unit instanceof PackageDurationUnit
                ? $package->duration_unit->value
                : $package->duration_unit,
            'duration_label' => self::labelForPackage($package),
            'tier_rank' => (int) $package->tier_rank,
        ];
    }
}
