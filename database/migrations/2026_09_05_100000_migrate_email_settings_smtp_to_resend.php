<?php

use App\Models\Settings;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Rename legacy SMTP email setting row to Resend (provider change).
     * Details with old SMTP keys are cleared — admin must re-enter Resend API key.
     */
    public function up(): void
    {
        $legacy = Settings::query()
            ->where('setting_type', 'email')
            ->whereRaw('LOWER(name) = ?', ['smtp'])
            ->first();

        if (! $legacy) {
            return;
        }

        $existingResend = Settings::query()
            ->where('setting_type', 'email')
            ->whereRaw('LOWER(name) = ?', ['resend'])
            ->exists();

        if ($existingResend) {
            $legacy->delete();

            return;
        }

        $details = $legacy->details ? json_decode($legacy->details, true) : null;
        // Drop SMTP-only secrets; keep from_* if present for convenience
        $migrated = null;
        if (is_array($details)) {
            $migrated = array_filter([
                'from_name' => $details['from_name'] ?? null,
                'from_email' => $details['from_email'] ?? null,
                // api_key intentionally omitted — SMTP password is not a Resend key
            ], fn ($v) => $v !== null && $v !== '');
            $migrated = $migrated === [] ? null : $migrated;
        }

        DB::table('settings')->where('id', $legacy->id)->update([
            'name' => Settings::EMAIL_SETTING_NAME,
            'slug' => 'email-resend',
            'details' => $migrated ? json_encode($migrated) : null,
            'status' => false, // require admin to save Resend API key
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Settings::query()
            ->where('setting_type', 'email')
            ->whereRaw('LOWER(name) = ?', ['resend'])
            ->update([
                'name' => 'smtp',
                'slug' => 'email-smtp',
            ]);
    }
};
