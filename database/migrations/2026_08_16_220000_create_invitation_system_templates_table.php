<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Platform library of pre-designed invitation card templates (Admin CRUD).
     * Canvas standard: 800×1100px portrait — see .agent "Invitation Canvas Standard".
     */
    public function up(): void
    {
        Schema::create('invitation_system_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('thumbnail_path')->nullable();
            $table->string('background_image_path');
            $table->json('default_overlay_positions')->nullable();
            $table->json('default_customizations')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invitation_system_templates');
    }
};
