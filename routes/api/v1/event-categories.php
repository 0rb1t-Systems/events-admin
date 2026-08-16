<?php

use App\Http\Controllers\Api\EventCategoryController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Event Categories API Routes (Admin CRUD)
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum', 'admin.panel'])->group(function () {
    Route::get('/', [EventCategoryController::class, 'index'])->middleware('permission:view event categories');
    Route::get('/search', [EventCategoryController::class, 'search'])->middleware('permission:view event categories');
    Route::post('/', [EventCategoryController::class, 'store'])->middleware('permission:create event categories');
    Route::get('/trashed/list', [EventCategoryController::class, 'trashed'])->middleware('permission:view trash items');

    Route::delete('/bulk/delete', [EventCategoryController::class, 'bulkDelete'])->middleware('permission:delete event categories');
    Route::post('/bulk/restore', [EventCategoryController::class, 'bulkRestore'])->middleware('permission:delete event categories');
    Route::delete('/bulk/force-delete', [EventCategoryController::class, 'bulkForceDelete'])->middleware('permission:delete event categories');

    Route::post('/{id}/restore', [EventCategoryController::class, 'restore'])->middleware('permission:delete event categories');
    Route::delete('/{id}/force', [EventCategoryController::class, 'forceDestroy'])->middleware('permission:delete event categories');

    Route::get('/{id}', [EventCategoryController::class, 'show'])->middleware('permission:view event categories');
    Route::patch('/{id}', [EventCategoryController::class, 'update'])->middleware('permission:edit event categories');
    Route::delete('/{id}', [EventCategoryController::class, 'destroy'])->middleware('permission:delete event categories');
});
