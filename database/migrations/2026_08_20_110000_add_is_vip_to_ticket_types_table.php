<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * VIP is an explicit boolean — never inferred from ticket name.
     * Existing rows default to false (safe).
     */
    public function up(): void
    {
        Schema::table('ticket_types', function (Blueprint $table) {
            $table->boolean('is_vip')->default(false)->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('ticket_types', function (Blueprint $table) {
            $table->dropColumn('is_vip');
        });
    }
};
