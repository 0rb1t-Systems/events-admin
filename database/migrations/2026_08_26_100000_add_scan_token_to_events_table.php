<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('events', 'scan_token')) {
            Schema::table('events', function (Blueprint $table) {
                $table->string('scan_token', 64)->nullable()->unique()->after('banner_path');
            });
        }

        $ids = DB::table('events')->whereNull('scan_token')->pluck('id');
        foreach ($ids as $id) {
            DB::table('events')->where('id', $id)->update([
                'scan_token' => bin2hex(random_bytes(16)),
            ]);
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('events', 'scan_token')) {
            Schema::table('events', function (Blueprint $table) {
                $table->dropColumn('scan_token');
            });
        }
    }
};
