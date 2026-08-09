<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Spatie\Activitylog\Models\Activity;
use Illuminate\Support\Facades\DB;

class LogController extends BaseController
{
    protected $model = Activity::class;
    protected $searchableFields = ['description', 'log_name', 'event'];
    protected $sortableFields = ['id', 'created_at', 'log_name', 'event'];
    protected $defaultSortField = 'created_at';
    protected $defaultSortDirection = 'desc';
    protected $relationships = ['causer', 'subject'];

    public function index(Request $request)
    {
        $query = Activity::query();

        // Load relationships
        $query->with($this->relationships);

        // Apply search if requested
        $this->applySearch($query, $request, $this->searchableFields);

        // Apply sorting
        $this->applySorting($query, $request, $this->sortableFields, $this->defaultSortField, $this->defaultSortDirection);

        // Filter by log type if specified
        if ($request->has('log_name') && $request->log_name) {
            $query->where('log_name', $request->log_name);
        }

        // Filter by event type if specified
        if ($request->has('event') && $request->event) {
            $query->where('event', $request->event);
        }

        // Filter by date range if specified
        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        return $this->paginateResponse($query, $request);
    }

    public function getLogTypes()
    {
        $logTypes = Activity::select('log_name')
            ->distinct()
            ->whereNotNull('log_name')
            ->pluck('log_name');

        return $this->successResponse($logTypes);
    }

    public function getAuthLogs(Request $request)
    {
        $query = Activity::where('log_name', 'auth')
            ->with($this->relationships);

        // Apply search if requested
        $this->applySearch($query, $request, $this->searchableFields);

        // Apply sorting
        $this->applySorting($query, $request, $this->sortableFields, $this->defaultSortField, $this->defaultSortDirection);

        return $this->paginateResponse($query, $request);
    }

    public function getUserLogs(Request $request)
    {
        $query = Activity::where('log_name', 'user')
            ->with($this->relationships);

        // Apply search if requested
        $this->applySearch($query, $request, $this->searchableFields);

        // Apply sorting
        $this->applySorting($query, $request, $this->sortableFields, $this->defaultSortField, $this->defaultSortDirection);

        return $this->paginateResponse($query, $request);
    }

    public function getContentLogs(Request $request)
    {
        $query = Activity::where('log_name', 'content')
            ->with($this->relationships);

        // Apply search if requested
        $this->applySearch($query, $request, $this->searchableFields);

        // Apply sorting
        $this->applySorting($query, $request, $this->sortableFields, $this->defaultSortField, $this->defaultSortDirection);

        return $this->paginateResponse($query, $request);
    }

    public function show($id)
    {
        $activity = Activity::with($this->relationships)->find($id);

        if (!$activity) {
            return $this->notFoundResponse();
        }

        return $this->successResponse($activity);
    }

    public function getLogStats()
    {
        $stats = [
            'total_logs' => Activity::count(),
            'logs_by_type' => Activity::select('log_name', DB::raw('count(*) as count'))
                ->whereNotNull('log_name')
                ->groupBy('log_name')
                ->get(),
            'logs_by_event' => Activity::select('event', DB::raw('count(*) as count'))
                ->whereNotNull('event')
                ->groupBy('event')
                ->get(),
            'recent_activity' => Activity::with('causer')
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get()
        ];

        return $this->successResponse($stats);
    }
}
