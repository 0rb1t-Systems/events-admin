<?php

namespace App\Http\Controllers\Api\Web;

use App\Http\Controllers\Api\BaseController;
use App\Http\Controllers\Api\Web\Concerns\ResolvesOrganizerEvent;
use App\Models\LuckyWheelAttempt;
use App\Services\LuckyWheelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

/**
 * Organizer Web API — lucky wheel for owned events only (cross-organizer → 404).
 */
class OrganizerLuckyWheelController extends BaseController
{
    use ResolvesOrganizerEvent;

    protected $model = LuckyWheelAttempt::class;

    protected $searchableFields = [];

    protected $sortableFields = ['id', 'created_at'];

    protected $relationships = [];

    protected $validationRules = [
        'store' => [],
        'update' => [],
    ];

    public function __construct(private LuckyWheelService $luckyWheel) {}

    public function show($event)
    {
        $owned = $this->ownedEventOrFail($event);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $participants = $this->luckyWheel->eligibleParticipations($owned);

        $attempts = LuckyWheelAttempt::query()
            ->with(['winners.participation.user', 'winners.participation.ticketType'])
            ->where('event_id', $owned->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        return $this->successResponse([
            'event_id' => (int) $owned->id,
            'participant_count' => $participants->count(),
            'participants' => $participants,
            'attempts' => $attempts,
        ]);
    }

    public function spin(Request $request, $event)
    {
        $owned = $this->ownedEventOrFail($event);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $validated = $request->validate([
            'winner_count' => 'required|integer|min:1',
        ]);

        try {
            $attempt = $this->luckyWheel->spin(
                $owned,
                $this->organizer(),
                (int) $validated['winner_count'],
            );
        } catch (InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), [], 422);
        }

        return $this->successResponse($attempt, 'Lucky wheel spin completed.', 201);
    }
}
