<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Must run after create_organizations_table.
     */
    public function up(): void
    {
        if (! Schema::hasTable('organizations')) {
            return;
        }

        Schema::table('organizations', function (Blueprint $table) {
            if (! Schema::hasColumn('organizations', 'logo_dark_url')) {
                $table->string('logo_dark_url')->nullable()->after('logo_url');
            }
            if (! Schema::hasColumn('organizations', 'icon_url')) {
                $table->string('icon_url')->nullable()->after('logo_dark_url');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('organizations')) {
            return;
        }

        Schema::table('organizations', function (Blueprint $table) {
            $columnsToDrop = [];

            if (Schema::hasColumn('organizations', 'logo_dark_url')) {
                $columnsToDrop[] = 'logo_dark_url';
            }
            if (Schema::hasColumn('organizations', 'icon_url')) {
                $columnsToDrop[] = 'icon_url';
            }

            if (! empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
