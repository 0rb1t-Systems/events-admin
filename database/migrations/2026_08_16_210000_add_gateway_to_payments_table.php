<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add `gateway` column to payments for manual/offline payment tracking.
     * Defaults to 'waafipay' for existing rows.
     */
    public function up(): void
    {
        if (Schema::hasTable('payments') && ! Schema::hasColumn('payments', 'gateway')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->string('gateway')->nullable()->default('waafipay')->after('reference_id');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('payments') && Schema::hasColumn('payments', 'gateway')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->dropColumn('gateway');
            });
        }
    }
};
