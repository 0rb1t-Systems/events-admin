<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Payments — source of truth for money movement (Phase 6).
     * participations.payment_status is a denormalized mirror only.
     *
     * Currency assumption: USD (WaafiPay example / platform default) — see config/waafipay.php.
     * reference_id UNIQUE — hard backstop against double-charge retries.
     */
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('participation_id')->constrained('participations')->restrictOnDelete();
            $table->foreignId('ticket_type_id')->nullable()->constrained('ticket_types')->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('USD');
            $table->string('status'); // PaymentStatus
            $table->string('reference_id')->unique();
            $table->string('waafi_transaction_id')->nullable();
            $table->string('waafi_issuer_transaction_id')->nullable();
            $table->string('payer_phone')->nullable();
            $table->string('failure_reason')->nullable();
            $table->string('failure_code')->nullable(); // raw Waafi responseMsg key
            $table->timestamp('expires_at')->nullable(); // pending cleanup window
            $table->timestamps();

            $table->index(['participation_id', 'status']);
            $table->index(['status', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
