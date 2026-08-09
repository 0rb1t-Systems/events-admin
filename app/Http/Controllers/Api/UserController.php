<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Arr;

class UserController extends BaseController
{
    protected $model = User::class;

    protected $searchableFields = ['name', 'email'];

    protected $sortableFields = ['id', 'name', 'email', 'created_at', 'updated_at'];

    protected $relationships = ['roles'];

    protected $validationRules = [
        'store' => [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'user_type' => 'in:user,admin',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            "role_id" => "required|exists:roles,id"
        ],
        'update' => [
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:users,email',
            'password' => 'sometimes|required|string|min:8|confirmed',
            'user_type' => 'sometimes|in:user,admin',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'status' => 'sometimes|in:active,inactive',
            'role_id' => 'sometimes|required|exists:roles,id'
        ]
    ];

    /**
     * Override store method to handle role assignment
     */
    public function store(Request $request)
    {
        // Custom validation with unique email check
        $validated = $request->validate($this->validationRules['store']);

        // Hash password if provided
        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        // Create the user, not including role_id
        $userData = Arr::except($validated, ['role_id']);
        $user = $this->model::create($userData);

        // Assign role using Spatie's permission system
        if (isset($validated['role_id'])) {
            $role = Role::find($validated['role_id']);
            if ($role) {
                $user->assignRole($role->name);
            }
        }

        // Load relationships for response
        if (!empty($this->relationships)) {
            $user->load($this->relationships);
        }

        return $this->createdResponse($user);
    }

    /**
     * Override update method to handle role assignment and unique email validation
     */
    public function update(Request $request, $id)
    {
        $user = $this->model::find($id);
        if (!$user) {
            return $this->notFoundResponse();
        }

        // Custom validation rules for update with proper unique check
        $rules = $this->validationRules['update'];
        if ($request->has('email')) {
            $rules['email'] = 'sometimes|required|string|email|max:255|unique:users,email,' . $id;
        }

        $validated = $request->validate($rules);

        // Hash password if provided
        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        // Update the user, not including role_id
        $userData = Arr::except($validated, ['role_id']);
        $user->update($userData);

        // Handle role assignment if role_id is provided
        if (isset($validated['role_id'])) {
            $role = Role::find($validated['role_id']);
            if ($role) {
                // Remove all current roles and assign the new one
                $user->syncRoles([$role->name]);
            }
        }

        // Load relationships for response
        if (!empty($this->relationships)) {
            $user->load($this->relationships);
        }

        return $this->successResponse($user, 'User updated successfully');
    }
}
