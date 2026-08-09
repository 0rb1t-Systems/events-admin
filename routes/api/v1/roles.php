<?php

use App\Http\Controllers\Api\RoleController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Roles API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register roles API routes for your application.
| These routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group and requires authentication.
|
*/

// All role routes require authentication
Route::middleware('auth:sanctum')->group(function () {

    // Standard CRUD operations
    Route::get('/', [RoleController::class, 'index'])->middleware('permission:view roles');
    Route::get('/search', [RoleController::class, 'search'])->middleware('permission:view roles');
    Route::post('/', [RoleController::class, 'store'])->middleware('permission:create roles');
    Route::get('/{id}', [RoleController::class, 'show'])->middleware('permission:view roles');
    Route::patch('/{id}', [RoleController::class, 'update'])->middleware('permission:edit roles');
    Route::delete('/{id}', [RoleController::class, 'destroy'])->middleware('permission:delete roles');

    // Permission management
    Route::post('/{id}/assign-permissions', [RoleController::class, 'assignPermissions'])->middleware('permission:edit roles');
    Route::get('/permissions/available', [RoleController::class, 'getAvailablePermissions'])->middleware('permission:view roles');

    // Bulk operations
    Route::delete('/bulk/delete', [RoleController::class, 'bulkDelete'])->middleware('permission:delete roles');
    Route::post('/bulk/restore', [RoleController::class, 'bulkRestore'])->middleware('permission:edit roles');
    Route::delete('/bulk/force-delete', [RoleController::class, 'bulkForceDelete'])->middleware('permission:delete roles');

    // Soft delete operations
    Route::get('/trashed/list', [RoleController::class, 'trashed'])->middleware('permission:view roles');
    Route::post('/{id}/restore', [RoleController::class, 'restore'])->middleware('permission:edit roles');
    Route::delete('/{id}/force', [RoleController::class, 'forceDestroy'])->middleware('permission:delete roles');
});
