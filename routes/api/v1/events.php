<?php

use App\Http\Controllers\Api\EventController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Events API Routes (Admin oversight)
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum', 'admin.panel'])->group(function () {
    Route::get('/', [EventController::class, 'index'])->middleware('permission:view events');
    Route::get('/search', [EventController::class, 'search'])->middleware('permission:view events');
    Route::post('/', [EventController::class, 'store'])->middleware('permission:create events');

    Route::get('/trashed/list', [EventController::class, 'trashed'])->middleware('permission:view trash items');
    Route::delete('/bulk/delete', [EventController::class, 'bulkDelete'])->middleware('permission:delete events');
    Route::post('/bulk/restore', [EventController::class, 'bulkRestore'])->middleware('permission:delete events');
    Route::delete('/bulk/force-delete', [EventController::class, 'bulkForceDelete'])->middleware('permission:delete events');

    Route::post('/{id}/transition', [EventController::class, 'transition'])->middleware('permission:edit events');
    Route::post('/{id}/sync-capacity', [EventController::class, 'syncCapacity'])->middleware('permission:edit events');
    Route::get('/{id}/registration-gates', [EventController::class, 'registrationGates'])->middleware('permission:view events');

    Route::post('/{id}/gallery', [EventController::class, 'uploadGalleryImage'])->middleware('permission:edit events');
    Route::post('/{id}/gallery/reorder', [EventController::class, 'reorderGallery'])->middleware('permission:edit events');
    Route::delete('/{id}/gallery/{imageId}', [EventController::class, 'deleteGalleryImage'])->middleware('permission:edit events');

    Route::post('/{id}/restore', [EventController::class, 'restore'])->middleware('permission:delete events');
    Route::delete('/{id}/force', [EventController::class, 'forceDestroy'])->middleware('permission:delete events');

    Route::get('/{id}', [EventController::class, 'show'])->middleware('permission:view events');
    Route::patch('/{id}', [EventController::class, 'update'])->middleware('permission:edit events');
    Route::delete('/{id}', [EventController::class, 'destroy'])->middleware('permission:delete events');
});
