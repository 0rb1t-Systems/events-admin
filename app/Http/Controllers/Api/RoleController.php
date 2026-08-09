<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleController extends BaseController
{
    protected $model = Role::class;

    protected $searchableFields = ['name'];

    protected $sortableFields = ['id', 'name', 'created_at', 'updated_at'];

    protected $relationships = ['permissions'];

    protected $validationRules = [
        'store' => [
            'name' => 'required|string|max:255|unique:roles,name',
            'guard_name' => 'sometimes|string|max:255',
        ],
        'update' => [
            'name' => 'sometimes|required|string|max:255',
            'guard_name' => 'sometimes|string|max:255',
        ]
    ];

    /**
     * Assign/sync permissions to a role
     * This will add new permissions and remove ones not in the list
     */
    public function assignPermissions(Request $request, $id)
    {
        $validated = $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'required|string|exists:permissions,name'
        ]);

        $role = Role::find($id);
        if (!$role) {
            return $this->notFoundResponse('Role not found');
        }

        try {
            // Get current permissions
            $currentPermissions = $role->permissions->pluck('name')->toArray();
            $newPermissions = $validated['permissions'];

            // Sync permissions (this will add new ones and remove ones not in the list)
            $role->syncPermissions($newPermissions);

            // Get the updated role with permissions
            $updatedRole = Role::with('permissions')->find($id);

            // Determine what was added and removed for the response
            $addedPermissions = array_diff($newPermissions, $currentPermissions);
            $removedPermissions = array_diff($currentPermissions, $newPermissions);

            return $this->successResponse([
                'role' => $updatedRole,
                'changes' => [
                    'added_permissions' => array_values($addedPermissions),
                    'removed_permissions' => array_values($removedPermissions),
                    'total_permissions' => count($newPermissions)
                ]
            ], 'Role permissions updated successfully');

        } catch (\Exception $e) {
            return $this->errorResponse('Failed to update role permissions: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Get all available permissions (helper endpoint)
     */
    public function getAvailablePermissions()
    {
        try {
            $permissions = Permission::select('id', 'name', 'guard_name')
                ->orderBy('name')
                ->get();

            return $this->successResponse($permissions, 'Available permissions retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Failed to retrieve permissions: ' . $e->getMessage(), [], 500);
        }
    }
}
