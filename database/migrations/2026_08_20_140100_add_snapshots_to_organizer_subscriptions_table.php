<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizer_subscriptions', function (Blueprint $table) {
            $table->json('package_snapshot')->nullable()->after('expires_at');
            $table->string('source', 32)->nullable()->after('package_snapshot');
            $table->foreignId('subscription_order_id')
                ->nullable()
                ->after('source')
                ->constrained('organizer_subscription_orders')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('organizer_subscriptions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('subscription_order_id');
            $table->dropColumn(['package_snapshot', 'source']);
        });
    }
};
