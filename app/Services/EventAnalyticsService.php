<?php

namespace App\Services;

use App\Enums\ParticipationStatus;
use App\Enums\PaymentStatus;
use App\Models\Certificate;
use App\Models\Event;
use App\Models\EventAnnouncement;
use App\Models\EventFeedback;
use App\Models\EventSession;
use App\Models\EventSpeaker;
use App\Models\EventSponsor;
use App\Models\Participation;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;

/**
 * Event analytics — efficient aggregates for ONE event (no N+1 per metric).
 *
 * Approach (documented for .agent):
 * - views_count: single column read on events
 * - registrations / check-ins: ONE grouped query on participations by status
 * - revenue: ONE sum query on payments joined to participations for this event
 * - feedback avg: ONE avg/count query
 * Fixed small set of queries (≤5), never a loop of queries per related row.
 */
class EventAnalyticsService
{
    /**
     * @return array{
     *   event_id: int,
     *   views: int,
     *   registrations: int,
     *   conversion_rate: float|null,
     *   revenue: float,
     *   currency: string,
     *   check_ins: int,
     *   attendance_rate: float|null,
     *   average_rating: float|null,
     *   feedback_count: int
     * }
     */
    public function forEvent(Event|int $event): array
    {
        $eventId = $event instanceof Event ? (int) $event->id : (int) $event;

        $views = (int) Event::query()->whereKey($eventId)->value('views_count');

        // Single grouped status query — not one count() per status
        $statusCounts = Participation::query()
            ->where('event_id', $eventId)
            ->select('status', DB::raw('COUNT(*) as aggregate'))
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $registered = Participation::query()
            ->where('event_id', $eventId)
            ->confirmedSeat()
            ->count();
        $checkIns = (int) ($statusCounts[ParticipationStatus::CHECKED_IN->value] ?? 0);

        $revenue = (float) Payment::query()
            ->where('status', PaymentStatus::COMPLETED)
            ->whereHas('participation', fn ($q) => $q->where('event_id', $eventId))
            ->sum('amount');

        $feedbackStats = EventFeedback::query()
            ->whereHas('participation', fn ($q) => $q->where('event_id', $eventId))
            ->selectRaw('AVG(rating) as avg_rating, COUNT(*) as feedback_count')
            ->first();

        $conversion = $views > 0 ? round(($registered / $views) * 100, 2) : null;
        $attendance = $registered > 0 ? round(($checkIns / $registered) * 100, 2) : null;

        return [
            'event_id' => $eventId,
            'views' => $views,
            'registrations' => $registered,
            'conversion_rate' => $conversion,
            'revenue' => round($revenue, 2),
            'currency' => (string) config('waafipay.currency', 'USD'),
            'check_ins' => $checkIns,
            'attendance_rate' => $attendance,
            'average_rating' => $feedbackStats?->avg_rating !== null
                ? round((float) $feedbackStats->avg_rating, 2)
                : null,
            'feedback_count' => (int) ($feedbackStats?->feedback_count ?? 0),
        ];
    }

    public function recordView(Event $event, ?string $viewerKey = null): void
    {
        DB::table('event_views')->insert([
            'event_id' => $event->id,
            'viewer_key' => $viewerKey,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Event::query()->whereKey($event->id)->increment('views_count');
    }
}
