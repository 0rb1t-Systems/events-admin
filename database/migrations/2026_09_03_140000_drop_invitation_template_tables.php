<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * Invitation template customization removed — tickets are a static Web App design.
 * QR tokens and scan validation remain on participations / qr_scan_logs.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('event_invitation_templates');
        Schema::dropIfExists('invitation_system_templates');
    }

    public function down(): void
    {
        // Irreversible — recreate from earlier create migrations if needed.
    }
};
