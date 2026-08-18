<?php

namespace App\Http\Controllers\Api\Web;

use App\Http\Controllers\Api\BaseController;
use App\Http\Controllers\Api\Web\Concerns\ResolvesOrganizerEvent;
use App\Models\Event;
use App\Services\EventAnalyticsService;
use Illuminate\Http\JsonResponse;

/**
 * Organizer Web API — analytics for one owned event (cross-organizer → 404).
 * Delegates to EventAnalyticsService::forEvent — no duplicated math.
 */
class OrganizerAnalyticsController extends BaseController
{
    use ResolvesOrganizerEvent;

    protected $model = Event::class;

    protected $searchableFields = [];

    protected $sortableFields = ['id'];

    protected $relationships = [];

    protected $validationRules = [
        'store' => [],
        'update' => [],
    ];

    public function __construct(private EventAnalyticsService $analytics) {}

    public function show($event)
    {
        $owned = $this->ownedEventOrFail($event);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        return $this->successResponse($this->analytics->forEvent($owned));
    }
}
