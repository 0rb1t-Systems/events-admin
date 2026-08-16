<?php

namespace App\Http\Controllers\Api;

use App\Enums\OrganizerStatus;
use App\Models\Organizer;

/**
 * Admin Panel oversight of organizers.
 * Admins may view, suspend/reactivate, and soft-delete/restore.
 * Admins do NOT freely edit business name / contact / email / password
 * (Web App owns self-service identity; flag if product later needs admin corrections).
 */
class OrganizerController extends BaseController
{
    protected $model = Organizer::class;

    protected $searchableFields = ['business_name', 'contact_name', 'email', 'phone'];

    protected $sortableFields = [
        'id',
        'business_name',
        'contact_name',
        'email',
        'status',
        'created_at',
        'updated_at',
    ];

    protected $relationships = ['activeSubscription.package'];

    public function index(\Illuminate\Http\Request $request)
    {
        $query = $this->model::query()->with($this->relationships)->withCount('events');

        $query = $this->applyApiFilters(
            $query,
            $request,
            $this->searchableFields,
            $this->sortableFields,
            $this->defaultSortField,
            $this->defaultSortDirection
        );

        return $this->paginateResponse($query, $request);
    }

    public function show($id)
    {
        $organizer = $this->model::with($this->relationships)->withCount('events')->find($id);
        if (! $organizer) {
            return $this->notFoundResponse();
        }

        return $this->successResponse($organizer);
    }

    protected $validationRules = [
        'store' => [],
        'update' => [],
    ];

    /**
     * Suspend organizer — does not delete events (Phase 4: events remain visible to admins;
     * suspended organizer cannot edit via organizer-web auth).
     */
    public function suspend($id)
    {
        $organizer = $this->model::find($id);
        if (! $organizer) {
            return $this->notFoundResponse('Organizer not found');
        }

        $old = $organizer->status;
        $organizer->status = OrganizerStatus::SUSPENDED;
        $organizer->save();

        // Revoke active organizer-web tokens so suspension takes effect immediately
        $organizer->tokens()->delete();

        $this->logActivity(
            'Organizer was suspended',
            $organizer,
            ['old_status' => $old, 'status' => OrganizerStatus::SUSPENDED->value],
            'suspended'
        );

        return $this->successResponse($organizer, 'Organizer suspended successfully');
    }

    public function reactivate($id)
    {
        $organizer = $this->model::find($id);
        if (! $organizer) {
            return $this->notFoundResponse('Organizer not found');
        }

        $old = $organizer->status;
        $organizer->status = OrganizerStatus::ACTIVE;
        $organizer->save();

        $this->logActivity(
            'Organizer was reactivated',
            $organizer,
            ['old_status' => $old, 'status' => OrganizerStatus::ACTIVE->value],
            'reactivated'
        );

        return $this->successResponse($organizer, 'Organizer reactivated successfully');
    }

    /**
     * Soft-delete only. Related records (future events/subscriptions) stay attached
     * because the organizers row remains. Force-delete must stay restricted once FKs exist.
     */
    public function destroy($id)
    {
        $organizer = $this->model::find($id);
        if (! $organizer) {
            return $this->notFoundResponse();
        }

        $organizer->tokens()->delete();
        $organizer->delete();

        $this->logActivity(
            'Organizer was soft-deleted',
            $organizer,
            ['old' => $organizer->getOriginal()],
            'deleted'
        );

        return $this->noContentResponse('Organizer moved to trash');
    }
}
