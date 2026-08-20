<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organizer_subscription_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organizer_id')->constrained('organizers')->restrictOnDelete();
            $table->foreignId('package_id')->constrained('packages')->restrictOnDelete();
            $table->string('action', 32); // subscribe | upgrade
            $table->decimal('amount', 12, 2);
            $table->string('currency', 8)->default('USD');
            $table->string('status', 32)->default('pending'); // pending|completed|failed|cancelled
            $table->string('reference_id')->unique();
            $table->string('payer_phone')->nullable();
            $table->string('waafi_request_id')->nullable();
            $table->string('waafi_transaction_id')->nullable();
            $table->string('waafi_issuer_transaction_id')->nullable();
            $table->string('failure_code')->nullable();
            $table->text('failure_reason')->nullable();
            $table->json('package_snapshot');
            // Soft refs to avoid circular FK with organizer_subscriptions.subscription_order_id
            $table->unsignedBigInteger('previous_subscription_id')->nullable();
            $table->unsignedBigInteger('resulting_subscription_id')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->index(['organizer_id', 'status']);
            $table->index(['package_id', 'status']);
            $table->index('previous_subscription_id');
            $table->index('resulting_subscription_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organizer_subscription_orders');
    }
};
