<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Upgrade event_invitation_templates for template vs custom modes.
     * Keeps legacy `config` JSON for backward compatibility.
     * New positional data lives in `overlay_positions`; branding overrides in `customizations`.
     */
    public function up(): void
    {
        Schema::table('event_invitation_templates', function (Blueprint $table) {
            $table->string('mode')->nullable()->after('event_id'); // template | custom | null
            $table->foreignId('system_template_id')
                ->nullable()
                ->after('mode')
                ->constrained('invitation_system_templates')
                ->nullOnDelete();
            $table->string('background_image_path')->nullable()->after('system_template_id');
            $table->json('overlay_positions')->nullable()->after('config');
            $table->json('customizations')->nullable()->after('overlay_positions');
        });
    }

    public function down(): void
    {
        Schema::table('event_invitation_templates', function (Blueprint $table) {
            $table->dropConstrainedForeignId('system_template_id');
            $table->dropColumn([
                'mode',
                'background_image_path',
                'overlay_positions',
                'customizations',
            ]);
        });
    }
};
