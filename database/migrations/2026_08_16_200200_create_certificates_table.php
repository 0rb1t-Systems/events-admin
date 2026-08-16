<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Attendance certificates — one per participation (idempotent issuance).
     */
    public function up(): void
    {
        Schema::create('certificates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('participation_id')->constrained('participations')->restrictOnDelete();
            $table->timestamp('issued_at');
            $table->string('file_path')->nullable();
            $table->string('file_url')->nullable();
            $table->boolean('verified')->default(false);
            $table->timestamps();

            $table->unique('participation_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certificates');
    }
};
