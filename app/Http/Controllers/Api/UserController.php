<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserType;
use App\Models\User;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Arr;

class UserController extends BaseController
{
    protected $model = User::class;

    protected $searchableFields = ['name', 'email'];

    protected $sortableFields = ['id', 'name', 'email', 'user_type', 'status', 'created_at', 'updated_at'];

    protected $relationships = ['roles'];

    protected $validationRules = [
        'store' => [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'role_id' => 'required|exists:roles,id',
        ],
        'update' => [
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:users,email',
            'password' => 'sometimes|required|string|min:8|confirmed',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'status' => 'sometimes|in:active,inactive',
            'role_id' => 'sometimes|required|exists:roles,id',
        ]
    ];

    /**
     * Admin Panel creates staff accounts only (user_type=admin).
     * user_type is not writable from the client (Phase 1: read-only in UI).
     */
    public function store(Request $request)
    {
        $validated = $request->validate($this->validationRules['store']);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $userData = Arr::except($validated, ['role_id']);
        $userData['user_type'] = UserType::ADMIN;

        $user = $this->model::create($userData);

        if (isset($validated['role_id'])) {
            $role = Role::find($validated['role_id']);
            if ($role) {
                $user->assignRole($role->name);
            }
        }

        if (!empty($this->relationships)) {
            $user->load($this->relationships);
        }

        return $this->createdResponse($user);
    }

    /**
     * Update user without allowing user_type changes (read-only in Admin UI).
     */
    public function update(Request $request, $id)
    {
        $user = $this->model::find($id);
        if (!$user) {
            return $this->notFoundResponse();
        }

        $rules = $this->validationRules['update'];
        if ($request->has('email')) {
            $rules['email'] = 'sometimes|required|string|email|max:255|unique:users,email,' . $id;
        }

        $validated = $request->validate($rules);

        // Explicitly ignore any attempted user_type writes
        unset($validated['user_type']);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $userData = Arr::except($validated, ['role_id']);
        $user->update($userData);

        if (isset($validated['role_id'])) {
            $role = Role::find($validated['role_id']);
            if ($role) {
                $user->syncRoles([$role->name]);
            }
        }

        if (!empty($this->relationships)) {
            $user->load($this->relationships);
        }

        return $this->successResponse($user, 'User updated successfully');
    }
}
