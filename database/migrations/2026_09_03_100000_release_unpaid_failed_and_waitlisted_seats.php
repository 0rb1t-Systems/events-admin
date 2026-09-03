<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Product no longer waitlists, and failed/unpaid checkouts must not occupy seats.
 * Cancel leftover waitlisted + failed-but-still-active rows, release claimed ticket
 * quantity for failed joined rows, and resync events.registrations_count.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('participations')
            ->where('status', 'waitlisted')
            ->update([
                'status' => 'cancelled',
                'updated_at' => now(),
            ]);

        $failed = DB::table('participations')
            ->where('payment_status', 'failed')
            ->where('status', '!=', 'cancelled')
            ->get();

        foreach ($failed as $row) {
            if (
                in_array($row->status, ['joined', 'paid', 'checked_in'], true)
                && $row->ticket_type_id
            ) {
                DB::update(
                    'UPDATE ticket_types
                     SET quantity_sold = quantity_sold - 1, updated_at = ?
                     WHERE id = ?
                       AND deleted_at IS NULL
                       AND quantity_sold >= 1',
                    [now(), $row->ticket_type_id]
                );
            }

            DB::table('participations')->where('id', $row->id)->update([
                'status' => 'cancelled',
                'updated_at' => now(),
            ]);
        }

        $eventIds = DB::table('events')->pluck('id');
        foreach ($eventIds as $eventId) {
            $count = DB::table('participations')
                ->where('event_id', $eventId)
                ->where(function ($q) {
                    $q->whereIn('status', ['paid', 'checked_in'])
                        ->orWhere(function ($inner) {
                            $inner->where('status', 'joined')
                                ->whereIn('payment_status', ['not_required', 'paid']);
                        });
                })
                ->count();

            DB::table('events')->where('id', $eventId)->update([
                'registrations_count' => $count,
            ]);
        }
    }

    public function down(): void
    {
        // Irreversible data repair.
    }
};
