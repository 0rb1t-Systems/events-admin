<?php

use App\Enums\SubscriptionStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Subscription HISTORY — one row per period.
     * Do not store current package as a mutable column on organizers.
     *
     * FKs use restrictOnDelete so packages/organizers cannot be hard-deleted
     * while history rows exist (no silent orphaning).
     *
     * expires_at NULL = not time-boxed; stays active until cancelled/replaced.
     */
    public function up(): void
    {
        Schema::create('organizer_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organizer_id')->constrained('organizers')->restrictOnDelete();
            $table->foreignId('package_id')->constrained('packages')->restrictOnDelete();
            $table->string('status')->default(SubscriptionStatus::ACTIVE->value);
            $table->timestamp('started_at');
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index(['organizer_id', 'status']);
            $table->index(['package_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organizer_subscriptions');
    }
};
