<?php

namespace App\Http\Controllers\Api;

use Illuminate\Routing\Controller;
use Illuminate\Http\Request;
use App\Traits\ApiFilterTrait;
use App\Traits\ApiResponseTrait;
use Illuminate\Support\Facades\Log;
use Spatie\Activitylog\Models\Activity;
use Spatie\Activitylog\ActivityLogger;

class BaseController extends Controller
{
    use ApiFilterTrait, ApiResponseTrait;

    protected $model;
    protected $searchableFields = [];
    protected $sortableFields = [];
    protected $defaultSortField = 'created_at';
    protected $defaultSortDirection = 'desc';
    protected $relationships = [];
    protected $validationRules = [];

    public function index(Request $request)
    {
        $query = $this->model::query();

        // Apply filters, search, and sorting
        $query = $this->applyApiFilters(
            $query,
            $request,
            $this->searchableFields,
            $this->sortableFields,
            $this->defaultSortField,
            $this->defaultSortDirection
        );

        // Load relationships if specified
        if (!empty($this->relationships)) {
            $query->with($this->relationships);
        }

        // Return paginated response
        return $this->paginateResponse($query, $request);
    }

    public function search(Request $request)
    {
        $request->validate([
            'q' => 'required|string|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
            'sort_by' => 'nullable|string|in:' . implode(',', $this->sortableFields),
            'sort_direction' => 'nullable|string|in:asc,desc'
        ]);

        $query = $this->model::query();

        // Load relationships if specified
        if (!empty($this->relationships)) {
            $query->with($this->relationships);
        }

        // Apply search
        $query = $this->applySearch($query, $request, $this->searchableFields);

        // Apply sorting if requested, otherwise use relevance sorting
        if ($request->has('sort_by')) {
            $query = $this->applySorting(
                $query,
                $request,
                $this->sortableFields,
                $this->defaultSortField,
                $this->defaultSortDirection
            );
        } else {
            // Use relevance-based sorting on the first searchable field
            $primaryField = !empty($this->searchableFields) ? $this->searchableFields[0] : 'id';
            $query = $this->applyRelevanceSorting($query, $request->q, $primaryField);
        }

        // Return paginated response
        return $this->paginateResponse($query, $request);
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->validationRules['store'] ?? []);
        $model = $this->model::create($validated);
        $this->logActivity(
            class_basename($this->model) . ' was created',
            $model,
            ['attributes' => $model->getAttributes()],
            'created'
        );
        return $this->createdResponse($model);
    }

    public function show($id)
    {
        $model = $this->model::with($this->relationships)->find($id);
        if (!$model) {
            return $this->notFoundResponse();
        }
        return $this->successResponse($model);
    }

    public function update(Request $request, $id)
    {
        $model = $this->model::find($id);
        if (!$model) {
            return $this->notFoundResponse();
        }
        $validated = $request->validate($this->validationRules['update'] ?? []);
        $old = $model->getOriginal();
        $model->update($validated);
        $this->logActivity(
            class_basename($this->model) . ' was updated',
            $model,
            ['old' => $old, 'attributes' => $model->getAttributes()],
            'updated'
        );
        return $this->successResponse($model, 'Resource updated successfully');
    }

    public function destroy($id)
    {
        $model = $this->model::find($id);
        if (!$model) {
            return $this->notFoundResponse();
        }
        $model->delete();
        $this->logActivity(
            class_basename($this->model) . ' was deleted',
            $model,
            ['old' => $model->getOriginal()],
            'deleted'
        );
        return $this->noContentResponse('Resource deleted successfully');
    }

    public function trashed(Request $request)
    {
        $query = $this->model::onlyTrashed();

        // Apply sorting if requested
        if ($request->has('sort_by')) {
            $sortField = $request->input('sort_by', 'id');
            $sortDirection = $request->input('sort_direction', 'asc');
            $query->orderBy($sortField, $sortDirection);
        } else {
            $query->orderBy('deleted_at', 'desc');
        }

        return $this->paginateResponse($query, $request);
    }

    public function restore($id)
    {
        $model = $this->model::onlyTrashed()->find($id);
        if (!$model) {
            return $this->notFoundResponse();
        }
        $model->restore();
        $this->logActivity(
            class_basename($this->model) . ' was restored',
            $model,
            ['attributes' => $model->getAttributes()],
            'restored'
        );
        return $this->successResponse($model, 'Resource restored successfully');
    }

    public function forceDestroy($id)
    {
        $model = $this->model::withTrashed()->find($id);
        if (!$model) {
            return $this->notFoundResponse();
        }

        $model->forceDelete();
        $this->logActivity(
            class_basename($this->model) . ' was permanently deleted',
            $model,
            ['attributes' => $model->getAttributes()],
            'force_deleted'
        );
        return $this->noContentResponse('Resource permanently deleted');
    }

    public function bulkDelete(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'required|integer|exists:' . (new $this->model)->getTable() . ',id'
        ]);
        $models = $this->model::whereIn('id', $validated['ids'])->get();
        $count = $this->model::whereIn('id', $validated['ids'])->delete();
        $subject = $models->first() ?: new $this->model;
        $this->logActivity(
            class_basename($this->model) . ' records were bulk deleted',
            $subject,
            ['ids' => $validated['ids'], 'count' => $count],
            'bulk_deleted'
        );
        return $this->successResponse([
            'deleted_count' => $count
        ], $count . ' records have been deleted');
    }

    public function bulkRestore(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'required|integer|exists:' . (new $this->model)->getTable() . ',id'
        ]);
        $models = $this->model::onlyTrashed()->whereIn('id', $validated['ids'])->get();
        $count = $this->model::onlyTrashed()->whereIn('id', $validated['ids'])->restore();
        $subject = $models->first() ?: new $this->model;
        $this->logActivity(
            class_basename($this->model) . ' records were bulk restored',
            $subject,
            ['ids' => $validated['ids'], 'count' => $count],
            'bulk_restored'
        );
        return $this->successResponse([
            'restored_count' => $count
        ], $count . ' records have been restored');
    }

    public function bulkForceDelete(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'required|integer'
        ]);
        $models = $this->model::withTrashed()->whereIn('id', $validated['ids'])->get();
        $count = $this->model::withTrashed()
            ->whereIn('id', $validated['ids'])
            ->forceDelete();
        $subject = $models->first() ?: new $this->model;
        $this->logActivity(
            class_basename($this->model) . ' records were bulk permanently deleted',
            $subject,
            ['ids' => $validated['ids'], 'count' => $count],
            'bulk_force_deleted'
        );
        return response()->json([
            'message' => $count . ' records have been permanently deleted',
            'deleted_count' => $count
        ]);
    }

    protected function logActivity(string $description, $subject = null, array $properties = [], string $event = null)
    {
        $logName = $subject ? strtolower(class_basename($subject)) : strtolower(class_basename($this->model));
        $logger = activity($logName)
            ->causedBy(request()->user())
            ->withProperties($properties);
        if ($subject) {
            $logger->performedOn($subject);
        }
        if ($event) {
            $logger->event($event);
        }
        $logger->log($description);
    }
}
