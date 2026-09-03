<?php

use App\Enums\DiscountCodeType;
use App\Enums\EventMode;
use App\Enums\EventStatus;
use App\Enums\FormFieldType;
use App\Enums\OrganizerStatus;
use App\Enums\PackageDurationUnit;
use App\Enums\PackageStatus;
use App\Enums\ParticipationPaymentStatus;
use App\Enums\ParticipationStatus;
use App\Enums\PaymentStatus;
use App\Enums\PayoutRequestStatus;
use App\Enums\QrScanResult;
use App\Enums\SponsorTier;
use App\Enums\SubscriptionOrderAction;
use App\Enums\SubscriptionOrderStatus;
use App\Enums\SubscriptionSource;
use App\Enums\SubscriptionStatus;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Support\EnumColumn;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * Convert domain status / constrained-choice string columns to MySQL ENUM.
 * users.status and users.user_type were already ENUM; re-apply for consistency.
 * SQLite (tests) is a no-op — see EnumColumn.
 */
return new class extends Migration
{
    public function up(): void
    {
        EnumColumn::modify('users', 'status', UserStatus::values(), false, UserStatus::ACTIVE->value);
        EnumColumn::modify('users', 'user_type', UserType::values(), false, UserType::ADMIN->value);

        EnumColumn::modify('organizers', 'status', OrganizerStatus::values(), false, OrganizerStatus::ACTIVE->value);
        EnumColumn::modify('packages', 'status', PackageStatus::values(), false, PackageStatus::ACTIVE->value);
        EnumColumn::modify('packages', 'duration_unit', PackageDurationUnit::values(), true, null);

        EnumColumn::modify(
            'organizer_subscriptions',
            'status',
            SubscriptionStatus::values(),
            false,
            SubscriptionStatus::ACTIVE->value
        );
        EnumColumn::modify('organizer_subscriptions', 'source', SubscriptionSource::values(), true, null);

        EnumColumn::modify('events', 'status', EventStatus::values(), false, EventStatus::DRAFT->value);
        EnumColumn::modify('events', 'event_mode', EventMode::values(), false, EventMode::IN_PERSON->value);

        EnumColumn::modify('participations', 'status', ParticipationStatus::values(), false, null);
        EnumColumn::modify(
            'participations',
            'payment_status',
            ParticipationPaymentStatus::values(),
            false,
            ParticipationPaymentStatus::NOT_REQUIRED->value
        );

        EnumColumn::modify('payments', 'status', PaymentStatus::values(), false, null);
        EnumColumn::modify('payments', 'gateway', ['waafipay', 'manual'], true, 'waafipay');

        EnumColumn::modify('payout_requests', 'status', PayoutRequestStatus::values(), false, null);

        EnumColumn::modify(
            'organizer_subscription_orders',
            'status',
            SubscriptionOrderStatus::values(),
            false,
            SubscriptionOrderStatus::PENDING->value
        );
        EnumColumn::modify(
            'organizer_subscription_orders',
            'action',
            SubscriptionOrderAction::values(),
            false,
            null
        );

        EnumColumn::modify('discount_codes', 'type', DiscountCodeType::values(), false, null);
        if (Schema::hasTable('event_form_fields')) {
            EnumColumn::modify('event_form_fields', 'type', FormFieldType::values(), false, null);
        }
        EnumColumn::modify('event_sponsors', 'tier', SponsorTier::values(), false, null);
        EnumColumn::modify('qr_scan_logs', 'result', QrScanResult::values(), false, null);

        EnumColumn::modify(
            'event_invitation_templates',
            'mode',
            ['template', 'custom'],
            true,
            null
        );
    }

    public function down(): void
    {
        // Irreversible without knowing prior VARCHAR lengths; leave ENUMs in place.
    }
};
