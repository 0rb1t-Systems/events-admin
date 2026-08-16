<?php

namespace App\Http\Controllers\Api;

use App\Enums\OrganizerStatus;
use App\Models\Organizer;
use Illuminate\Http\Request;

/**
 * Admin Panel oversight of organizers.
 * Admins may view, edit identity fields, suspend/reactivate, and soft-delete/restore.
 * Password changes remain Web App / organizer self-service (not admin PATCH).
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

    protected $validationRules = [
        'store' => [],
        'update' => [
            'business_name' => 'sometimes|required|string|max:255',
            'contact_name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:organizers,email',
            'phone' => 'nullable|string|max:20',
        ],
    ];

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

    /**
     * Admin correction of organizer identity fields.
     * Email uniqueness is re-validated excluding this organizer's row.
     * Password is not writable here.
     */
    public function update(Request $request, $id)
    {
        $organizer = $this->model::find($id);
        if (! $organizer) {
            return $this->notFoundResponse();
        }

        $rules = $this->validationRules['update'];
        if ($request->has('email')) {
            $rules['email'] = 'sometimes|required|string|email|max:255|unique:organizers,email,'.$id;
        }

        $validated = $request->validate($rules);

        // Never accept password / status via this endpoint (status uses suspend/reactivate)
        unset($validated['password'], $validated['status']);

        $old = $organizer->getOriginal();
        $organizer->update($validated);

        if (! empty($this->relationships)) {
            $organizer->load($this->relationships);
        }
        $organizer->loadCount('events');

        $this->logActivity(
            'Organizer was updated',
            $organizer,
            ['old' => $old, 'attributes' => $organizer->getAttributes()],
            'updated'
        );

        return $this->successResponse($organizer, 'Organizer updated successfully');
    }

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
