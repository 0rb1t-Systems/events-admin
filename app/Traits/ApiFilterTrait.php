<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

trait ApiFilterTrait
{
    /**
     * Apply common API filtering (search, sorting, pagination) to query builder
     *
     * @param Builder $query
     * @param Request $request
     * @param array $searchableFields Fields that can be searched
     * @param array $sortableFields Fields that can be sorted
     * @param string $defaultSortField Default field to sort by if none specified
     * @param string $defaultSortDirection Default sort direction
     * @return Builder
     */
    protected function applyApiFilters(
        Builder $query,
        Request $request,
        array $searchableFields = [],
        array $sortableFields = ['id', 'created_at', 'updated_at'],
        string $defaultSortField = 'created_at',
        string $defaultSortDirection = 'desc'
    ): Builder {
        // Apply dynamic query criteria if present
        $this->applyDynamicCriteria($query, $request);

        // Apply search if requested
        $this->applySearch($query, $request, $searchableFields);

        // Apply sorting
        $this->applySorting($query, $request, $sortableFields, $defaultSortField, $defaultSortDirection);

        return $query;
    }

    /**
     * Apply dynamic criteria from request
     * Supports filter[field]=value and filter[field][operator]=value
     *
     * @param Builder $query
     * @param Request $request
     * @return Builder
     */
    protected function applyDynamicCriteria(Builder $query, Request $request): Builder
    {
        if ($request->has('filter') && is_array($request->query('filter'))) {
            $criteria = $request->query('filter');

            foreach ($criteria as $field => $condition) {
                // If condition is an array, it contains operators like [gt], [lt], etc.
                if (is_array($condition)) {
                    foreach ($condition as $operator => $value) {
                        $this->applyOperatorCondition($query, $field, $operator, $value);
                    }
                } else {
                    // Check if the condition contains commas, treat as "in" query
                    if (strpos($condition, ',') !== false) {
                        $values = explode(',', $condition);
                        $query->whereIn($field, $values);
                    } else {
                        // Simple equals condition
                        $query->where($field, $condition);
                    }
                }
            }
        }

        return $query;
    }

    /**
     * Apply operator-based condition to query
     *
     * @param Builder $query
     * @param string $field
     * @param string $operator
     * @param mixed $value
     * @return void
     */
    private function applyOperatorCondition(Builder $query, string $field, string $operator, $value): void
    {
        switch ($operator) {
            case 'gt':
                $query->where($field, '>', $value);
                break;
            case 'gte':
                $query->where($field, '>=', $value);
                break;
            case 'lt':
                $query->where($field, '<', $value);
                break;
            case 'lte':
                $query->where($field, '<=', $value);
                break;
            case 'not':
                $query->where($field, '!=', $value);
                break;
            case 'like':
                $query->where($field, 'like', "%$value%");
                break;
            case 'in':
                $values = is_array($value) ? $value : explode(',', $value);
                $query->whereIn($field, $values);
                break;
            case 'not_in':
                $values = is_array($value) ? $value : explode(',', $value);
                $query->whereNotIn($field, $values);
                break;
            case 'between':
                $values = is_array($value) ? $value : explode(',', $value);
                if (count($values) === 2) {
                    $query->whereBetween($field, $values);
                }
                break;
            case 'null':
                if ($value === true || $value === 'true' || $value === 1) {
                    $query->whereNull($field);
                } else {
                    $query->whereNotNull($field);
                }
                break;
            case 'starts':
                $query->where($field, 'like', "$value%");
                break;
            case 'ends':
                $query->where($field, 'like', "%$value");
                break;
            case 'contains':
                $query->where($field, 'like', "%$value%");
            default:
                // Default to equals
                $query->where($field, $value);
                break;
        }
    }

    /**
     * Apply search filters to the query
     *
     * @param Builder $query
     * @param Request $request
     * @param array $searchableFields
     * @return Builder
     */
    protected function applySearch(Builder $query, Request $request, array $searchableFields): Builder
    {
        if ($request->has('search_term') && $request->has('search_fields') && !empty($searchableFields)) {
            $searchTerm = $request->input('search_term');

            // Normalize search fields to an array
            $searchFields = is_array($request->input('search_fields'))
                ? $request->input('search_fields')
                : explode(',', $request->input('search_fields'));

            // Filter to only allowed fields
            $searchFields = array_filter($searchFields, function ($field) use ($searchableFields) {
                return in_array(trim($field), $searchableFields);
            });

            // Apply search query for each valid field
            if (!empty($searchFields)) {
                $query->where(function ($q) use ($searchFields, $searchTerm) {
                    foreach ($searchFields as $field) {
                        $q->orWhere($field, 'like', '%' . $searchTerm . '%');
                    }
                });
            }
        }

        // For dedicated search endpoints that use the 'q' parameter
        if ($request->has('q') && !empty($searchableFields)) {
            $searchTerm = $request->q;

            $query->where(function ($q) use ($searchableFields, $searchTerm) {
                foreach ($searchableFields as $field) {
                    $q->orWhere($field, 'like', '%' . $searchTerm . '%');
                }
            });
        }

        return $query;
    }

    /**
     * Apply sorting to the query
     *
     * @param Builder $query
     * @param Request $request
     * @param array $sortableFields
     * @param string $defaultSortField
     * @param string $defaultSortDirection
     * @return Builder
     */
    protected function applySorting(
        Builder $query,
        Request $request,
        array $sortableFields,
        string $defaultSortField,
        string $defaultSortDirection
    ): Builder {
        if ($request->has('sort_by')) {
            $sortField = $request->input('sort_by');


            // Ensure the sort field is allowed
            if (!in_array($sortField, $sortableFields)) {
                $sortField = $defaultSortField;
            }

            $sortDirection = $request->input('sort_direction', $defaultSortDirection);
            if (!in_array(strtolower($sortDirection), ['asc', 'desc'])) {
                $sortDirection = $defaultSortDirection;
            }

            $query->orderBy($sortField, $sortDirection);
        } else {
            // Apply default sorting
            $query->orderBy($defaultSortField, $defaultSortDirection);
        }

        return $query;
    }

    /**
     * Apply pagination to the query and return JSON response
     *
     * @param Builder $query
     * @param Request $request
     * @param int $defaultPerPage
     * @param int $maxPerPage
     * @return \Illuminate\Http\JsonResponse
     */
    protected function paginateResponse(
        Builder $query,
        Request $request,
        int $defaultPerPage = 15,
        int $maxPerPage = 100
    ) {
        $perPage = min((int) $request->input('per_page', $defaultPerPage), $maxPerPage);
        if ($request->has('all') && $request->input('all') === 'true') {
            $perPage = 1000;
        }
        return response()->json($query->paginate($perPage));
    }

    /**
     * Apply relevance-based sorting for search results
     *
     * @param Builder $query
     * @param string $searchTerm
     * @param string $primaryField Field to prioritize for relevance sorting
     * @param array $allowedFields Array of allowed field names for validation
     * @return Builder
     */
    protected function applyRelevanceSorting(
        Builder $query,
        string $searchTerm,
        string $primaryField = 'title',
        array $allowedFields = []
    ): Builder {
        // Validate the primary field to prevent SQL injection
        if (!empty($allowedFields) && !in_array($primaryField, $allowedFields)) {
            // Fallback to a safe default field
            $primaryField = 'id';
        }

        // Additional validation against database schema if possible
        $primaryField = $this->validateFieldExists($query, $primaryField);

        // Use proper parameter binding to prevent SQL injection
        return $query->orderByRaw("CASE
            WHEN " . $this->escapeFieldName($primaryField) . " = ? THEN 1
            WHEN " . $this->escapeFieldName($primaryField) . " LIKE ? THEN 2
            WHEN " . $this->escapeFieldName($primaryField) . " LIKE ? THEN 3
            ELSE 4
        END", [
            $searchTerm,
            $searchTerm . '%',
            '%' . $searchTerm . '%'
        ]);
    }

    /**
     * Validate if a field exists in the query's table
     *
     * @param Builder $query
     * @param string $fieldName
     * @return string
     */
    private function validateFieldExists(Builder $query, string $fieldName): string
    {
        try {
            $model = $query->getModel();
            $table = $model->getTable();

            // Get the database connection
            $connection = $model->getConnection();

            // Get table columns
            $columns = $connection->getSchemaBuilder()->getColumnListing($table);

            // Check if field exists in table columns
            if (in_array($fieldName, $columns)) {
                return $fieldName;
            }

            // If field doesn't exist, return safe default
            return 'id';
        } catch (\Exception $e) {
            // If validation fails, return safe default
            return 'id';
        }
    }

    /**
     * Escape field name to prevent SQL injection
     * Only allows alphanumeric characters, underscores, and dots
     *
     * @param string $fieldName
     * @return string
     */
    private function escapeFieldName(string $fieldName): string
    {
        // Remove any characters that could be used for SQL injection
        $cleaned = preg_replace('/[^a-zA-Z0-9_.]/', '', $fieldName);

        // If the cleaned field is empty or contains suspicious patterns, use a safe default
        if (empty($cleaned) || strpos($cleaned, '..') !== false) {
            return 'id';
        }

        // Check for common SQL injection patterns
        $suspiciousPatterns = [
            'union',
            'select',
            'insert',
            'update',
            'delete',
            'drop',
            'create',
            'alter',
            'exec',
            'execute',
            'script',
            'javascript',
            'vbscript',
            'onload',
            'onerror'
        ];

        $lowerField = strtolower($cleaned);
        foreach ($suspiciousPatterns as $pattern) {
            if (strpos($lowerField, $pattern) !== false) {
                return 'id';
            }
        }

        // Check for SQL keywords that could be dangerous
        $sqlKeywords = [
            'select',
            'from',
            'where',
            'order',
            'group',
            'having',
            'union',
            'insert',
            'update',
            'delete',
            'drop',
            'create',
            'alter',
            'table',
            'database',
            'index'
        ];

        if (in_array($lowerField, $sqlKeywords)) {
            return 'id';
        }

        return $cleaned;
    }
}
