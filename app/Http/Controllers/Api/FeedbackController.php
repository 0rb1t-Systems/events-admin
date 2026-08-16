<?php

namespace App\Http\Controllers\Api;

use App\Models\EventFeedback;
use Illuminate\Http\Request;

/**
 * Platform-wide feedback oversight — list, detail, soft-hide/show.
 * Hidden feedback must never surface on Web App public/organizer queries (filter where hidden=false).
 */
class FeedbackController extends BaseController
{
    protected $model = EventFeedback::class;

    protected $searchableFields = ['comment'];

    protected $sortableFields = ['id', 'rating', 'submitted_at', 'created_at', 'hidden'];

    protected $relationships = ['participation.user', 'participation.event'];

    protected $validationRules = [
        'store' => [],
        'update' => [],
    ];

    public function index(Request $request)
    {
        $query = EventFeedback::query()->with($this->relationships);

        if ($request->filled('event_id')) {
            $query->whereHas(
                'participation',
                fn ($q) => $q->where('event_id', $request->integer('event_id'))
            );
        }

        if ($request->has('hidden') && $request->input('hidden') !== '' && $request->input('hidden') !== null) {
            $query->where('hidden', filter_var($request->input('hidden'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('rating')) {
            $query->where('rating', $request->integer('rating'));
        }

        $query = $this->applyApiFilters(
            $query,
            $request,
            $this->searchableFields,
            $this->sortableFields,
            'submitted_at',
            'desc'
        );

        return $this->paginateResponse($query, $request);
    }

    /**
     * Soft-hide or restore feedback visibility (does not delete).
     * PATCH /api/v1/feedback/{id}/visibility
     */
    public function updateVisibility(Request $request, $id)
    {
        $feedback = EventFeedback::with($this->relationships)->find($id);
        if (! $feedback) {
            return $this->notFoundResponse();
        }

        $validated = $request->validate([
            'hidden' => 'required|boolean',
        ]);

        $old = (bool) $feedback->hidden;
        $feedback->update(['hidden' => (bool) $validated['hidden']]);

        $this->logActivity(
            $feedback->hidden ? 'Event feedback hidden' : 'Event feedback shown',
            $feedback,
            [
                'old_hidden' => $old,
                'hidden' => $feedback->hidden,
                'participation_id' => $feedback->participation_id,
                'admin_id' => auth()->id(),
            ],
            'updated'
        );

        return $this->successResponse(
            $feedback->fresh($this->relationships),
            $feedback->hidden ? 'Feedback hidden.' : 'Feedback visible.'
        );
    }
}
