<?php

namespace App\Http\Controllers\Api;

use App\Enums\PackageStatus;
use App\Models\Package;
use Illuminate\Http\Request;

class PackageController extends BaseController
{
    protected $model = Package::class;

    protected $searchableFields = ['name', 'description'];

    protected $sortableFields = ['id', 'name', 'price', 'event_quota', 'status', 'created_at', 'updated_at'];

    protected $relationships = [];

    protected $validationRules = [
        'store' => [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            // Present + nullable: omit vs null vs 0 are distinct; null = unlimited, 0 = zero quota
            'event_quota' => 'present|nullable|integer|min:0',
            'status' => 'sometimes|in:active,archived',
        ],
        'update' => [
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'sometimes|required|numeric|min:0',
            'event_quota' => 'sometimes|nullable|integer|min:0',
            'status' => 'sometimes|in:active,archived',
        ],
    ];

    public function store(Request $request)
    {
        $validated = $request->validate($this->validationRules['store']);
        $validated['status'] = $validated['status'] ?? PackageStatus::ACTIVE->value;

        $package = $this->model::create($validated);

        $this->logActivity(
            'Package was created',
            $package,
            ['attributes' => $package->getAttributes()],
            'created'
        );

        return $this->createdResponse($package);
    }

    public function update(Request $request, $id)
    {
        $package = $this->model::find($id);
        if (! $package) {
            return $this->notFoundResponse();
        }

        $validated = $request->validate($this->validationRules['update']);

        // Archiving with active subscribers is blocked (no silent orphaning of active plans)
        if (
            isset($validated['status'])
            && $validated['status'] === PackageStatus::ARCHIVED->value
            && $package->hasActiveSubscribers()
        ) {
            return $this->forbiddenResponse(
                'Cannot archive a package that still has active subscribers. Cancel or expire those subscriptions first.'
            );
        }

        $old = $package->getOriginal();
        $package->update($validated);

        $this->logActivity(
            'Package was updated',
            $package,
            ['old' => $old, 'attributes' => $package->getAttributes()],
            'updated'
        );

        return $this->successResponse($package->fresh(), 'Package updated successfully');
    }

    public function destroy($id)
    {
        $package = $this->model::find($id);
        if (! $package) {
            return $this->notFoundResponse();
        }

        // Block delete if ANY subscription history references this package (matches restrictOnDelete)
        if ($package->hasAnySubscribers()) {
            return $this->forbiddenResponse(
                'Cannot delete a package that has subscription history. Archive it instead after cancelling active subscribers, or leave it for historical integrity.'
            );
        }

        $package->delete();

        $this->logActivity(
            'Package was deleted',
            $package,
            ['old' => $package->getOriginal()],
            'deleted'
        );

        return $this->noContentResponse('Package deleted successfully');
    }

    public function archive($id)
    {
        $package = $this->model::find($id);
        if (! $package) {
            return $this->notFoundResponse();
        }

        if ($package->hasActiveSubscribers()) {
            return $this->forbiddenResponse(
                'Cannot archive a package that still has active subscribers. Cancel or expire those subscriptions first.'
            );
        }

        $old = $package->status;
        $package->status = PackageStatus::ARCHIVED;
        $package->save();

        $this->logActivity(
            'Package was archived',
            $package,
            ['old_status' => $old, 'status' => PackageStatus::ARCHIVED->value],
            'archived'
        );

        return $this->successResponse($package, 'Package archived successfully');
    }
}
