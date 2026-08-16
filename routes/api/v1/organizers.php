<?php

use App\Http\Controllers\Api\OrganizerController;
use App\Http\Controllers\Api\OrganizerSubscriptionController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Organizers API Routes (Admin Panel oversight)
|--------------------------------------------------------------------------
|
| Admins: view, edit identity, suspend/reactivate, soft-delete/restore/force-delete.
| Password changes are not admin-editable (Web App / self-service).
| Subscription oversight (history / assign / cancel) — not Web App self-serve.
|
*/

Route::middleware(['auth:sanctum', 'admin.panel'])->group(function () {
    Route::get('/', [OrganizerController::class, 'index'])->middleware('permission:view organizers');
    Route::get('/trashed/list', [OrganizerController::class, 'trashed'])->middleware('permission:view trash items');

    // Static subscription paths BEFORE /{id} so "subscriptions" is not captured as an id
    Route::get('/subscriptions', [OrganizerSubscriptionController::class, 'index'])
        ->middleware('permission:view organizer subscriptions');
    Route::get('/subscriptions/{id}', [OrganizerSubscriptionController::class, 'show'])
        ->middleware('permission:view organizer subscriptions');
    Route::post('/subscriptions/{id}/cancel', [OrganizerSubscriptionController::class, 'cancel'])
        ->middleware('permission:assign organizer subscriptions');

    Route::delete('/bulk/delete', [OrganizerController::class, 'bulkDelete'])->middleware('permission:delete organizers');
    Route::post('/bulk/restore', [OrganizerController::class, 'bulkRestore'])->middleware('permission:delete organizers');
    Route::delete('/bulk/force-delete', [OrganizerController::class, 'bulkForceDelete'])->middleware('permission:delete organizers');

    Route::post('/{id}/suspend', [OrganizerController::class, 'suspend'])->middleware('permission:suspend organizers');
    Route::post('/{id}/reactivate', [OrganizerController::class, 'reactivate'])->middleware('permission:suspend organizers');
    Route::post('/{id}/restore', [OrganizerController::class, 'restore'])->middleware('permission:delete organizers');
    Route::delete('/{id}/force', [OrganizerController::class, 'forceDestroy'])->middleware('permission:delete organizers');

    Route::get('/{id}/subscriptions', [OrganizerSubscriptionController::class, 'forOrganizer'])
        ->middleware('permission:view organizer subscriptions');
    Route::post('/{id}/subscriptions', [OrganizerSubscriptionController::class, 'assign'])
        ->middleware('permission:assign organizer subscriptions');

    Route::get('/{id}', [OrganizerController::class, 'show'])->middleware('permission:view organizers');
    Route::patch('/{id}', [OrganizerController::class, 'update'])->middleware('permission:edit organizers');
    Route::delete('/{id}', [OrganizerController::class, 'destroy'])->middleware('permission:delete organizers');
});
