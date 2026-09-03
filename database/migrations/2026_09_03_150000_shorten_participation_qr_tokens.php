<?php

use App\Models\Participation;
use App\Services\QrTokenService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * Replace 64-char hex qr_tokens with short 8-char door codes (scan + manual entry).
 * Existing printed long tokens become invalid after this runs — re-download the ticket.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('participations') || ! Schema::hasColumn('participations', 'qr_token')) {
            return;
        }

        $tokens = app(QrTokenService::class);

        Participation::query()
            ->whereNotNull('qr_token')
            ->where('qr_token', '!=', '')
            ->orderBy('id')
            ->each(function (Participation $participation) use ($tokens) {
                // Only rewrite legacy long hex tokens; leave already-short codes alone.
                if (strlen((string) $participation->qr_token) <= QrTokenService::TOKEN_LENGTH) {
                    $participation->qr_token = QrTokenService::normalize((string) $participation->qr_token);
                    $participation->save();

                    return;
                }

                $tokens->assignToken($participation);
            });
    }

    public function down(): void
    {
        // Irreversible: short tokens cannot be restored to prior hex values.
    }
};
