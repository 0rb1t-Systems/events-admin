<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Every QR scan attempt (valid / already_used / invalid) — add-on 12.5.
     * Log successes AND failures; never skip already_used / invalid rows.
     */
    public function up(): void
    {
        Schema::create('qr_scan_logs', function (Blueprint $table) {
            $table->id();
            $table->string('scanned_token');
            $table->foreignId('participation_id')->nullable()->constrained('participations')->nullOnDelete();
            $table->foreignId('event_id')->nullable()->constrained('events')->nullOnDelete();
            // QrScanResult: valid | already_used | invalid
            $table->string('result');
            $table->string('gate')->nullable();
            $table->foreignId('scanner_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('scanner_organizer_id')->nullable()->constrained('organizers')->nullOnDelete();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['event_id', 'created_at']);
            $table->index(['participation_id', 'created_at']);
            $table->index(['result', 'created_at']);
            $table->index('scanned_token');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qr_scan_logs');
    }
};
