<?php

use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Users API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register users API routes for your application.
| These routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group and requires authentication.
|
*/

// All user routes require authentication
Route::middleware('auth:sanctum')->group(function () {

    // Standard CRUD operations
    Route::get('/', [UserController::class, 'index'])->middleware('permission:view users');
    Route::post('/', [UserController::class, 'store'])->middleware('permission:create users');
    Route::get('/{id}', [UserController::class, 'show'])->middleware('permission:view users');
    Route::patch('/{id}', [UserController::class, 'update'])->middleware('permission:edit users');
    Route::delete('/{id}', [UserController::class, 'destroy'])->middleware('permission:delete users');

    // Bulk operations
    Route::delete('/bulk/delete', [UserController::class, 'bulkDelete'])->middleware('permission:delete users');
    Route::post('/bulk/restore', [UserController::class, 'bulkRestore'])->middleware('permission:edit users');
    Route::delete('/bulk/force-delete', [UserController::class, 'bulkForceDelete'])->middleware('permission:delete users');


    // Soft delete operations
    Route::get('/trashed/list', [UserController::class, 'trashed'])->middleware('permission:view users');
    Route::post('/{id}/restore', [UserController::class, 'restore'])->middleware('permission:edit users');
    Route::delete('/{id}/force', [UserController::class, 'forceDestroy'])->middleware('permission:delete users');
});
