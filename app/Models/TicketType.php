<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class TicketType extends Model
{
    /** @use HasFactory<\Database\Factories\TicketTypeFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'event_id',
        'name',
        'is_vip',
        'price',
        'quantity_limit',
        'quantity_sold',
        'sort_order',
        'sales_enabled',
    ];

    protected function casts(): array
    {
        return [
            'is_vip' => 'boolean',
            'price' => 'decimal:2',
            'quantity_limit' => 'integer',
            'quantity_sold' => 'integer',
            'sort_order' => 'integer',
            'sales_enabled' => 'boolean',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function isUnlimited(): bool
    {
        return $this->quantity_limit === null;
    }

    public function isSoldOut(): bool
    {
        if ($this->quantity_limit === null) {
            return false;
        }

        if ($this->quantity_limit === 0) {
            return true;
        }

        return $this->quantity_sold >= $this->quantity_limit;
    }

    public function hasSales(): bool
    {
        return $this->quantity_sold > 0;
    }

    public function isPaid(): bool
    {
        return (float) $this->price > 0;
    }

    /**
     * Phase 6 Participation — claim one seat atomically.
     *
     * Strategy: single conditional UPDATE (optimistic row check), not read-then-write:
     *
     *   UPDATE ticket_types
     *   SET quantity_sold = quantity_sold + $qty
     *   WHERE id = ?
     *     AND deleted_at IS NULL
     *     AND sales_enabled = 1
     *     AND (quantity_limit IS NULL OR quantity_sold + $qty <= quantity_limit)
     *
     * Affected rows == 0 → sold out / disabled / race lost.
     * Wrap in DB::transaction with participation insert; on refund/cancel, Phase 6 must
     * atomically decrement with WHERE quantity_sold >= $qty and never double-count.
     *
     * Optional hardening later: SELECT … FOR UPDATE inside the same transaction before
     * the conditional UPDATE if multi-qty baskets need stronger serialization.
     *
     * @return bool true if claim succeeded
     */
    public static function claimQuantityAtomically(int $ticketTypeId, int $qty = 1): bool
    {
        if ($qty < 1) {
            return false;
        }

        $affected = DB::update(
            'UPDATE ticket_types
             SET quantity_sold = quantity_sold + ?, updated_at = ?
             WHERE id = ?
               AND deleted_at IS NULL
               AND sales_enabled = 1
               AND (quantity_limit IS NULL OR quantity_sold + ? <= quantity_limit)',
            [$qty, now(), $ticketTypeId, $qty]
        );

        return $affected === 1;
    }

    /**
     * Phase 6 — release seats on cancel/refund (atomic; never go below 0).
     */
    public static function releaseQuantityAtomically(int $ticketTypeId, int $qty = 1): bool
    {
        if ($qty < 1) {
            return false;
        }

        $affected = DB::update(
            'UPDATE ticket_types
             SET quantity_sold = quantity_sold - ?, updated_at = ?
             WHERE id = ?
               AND deleted_at IS NULL
               AND quantity_sold >= ?',
            [$qty, now(), $ticketTypeId, $qty]
        );

        return $affected === 1;
    }
}
