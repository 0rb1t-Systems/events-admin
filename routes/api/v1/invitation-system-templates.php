<?php

use App\Http\Controllers\Api\InvitationSystemTemplateController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Invitation System Templates (Admin library CRUD)
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum', 'admin.panel'])->group(function () {
    Route::get('/', [InvitationSystemTemplateController::class, 'index'])
        ->middleware('permission:view invitation templates');
    Route::get('/search', [InvitationSystemTemplateController::class, 'search'])
        ->middleware('permission:view invitation templates');
    Route::post('/', [InvitationSystemTemplateController::class, 'store'])
        ->middleware('permission:manage invitation templates');
    Route::get('/trashed/list', [InvitationSystemTemplateController::class, 'trashed'])
        ->middleware('permission:view trash items');

    Route::delete('/bulk/delete', [InvitationSystemTemplateController::class, 'bulkDelete'])
        ->middleware('permission:manage invitation templates');
    Route::post('/bulk/restore', [InvitationSystemTemplateController::class, 'bulkRestore'])
        ->middleware('permission:manage invitation templates');
    Route::delete('/bulk/force-delete', [InvitationSystemTemplateController::class, 'bulkForceDelete'])
        ->middleware('permission:manage invitation templates');

    Route::post('/{id}/restore', [InvitationSystemTemplateController::class, 'restore'])
        ->middleware('permission:manage invitation templates');
    Route::delete('/{id}/force', [InvitationSystemTemplateController::class, 'forceDestroy'])
        ->middleware('permission:manage invitation templates');

    Route::get('/{id}', [InvitationSystemTemplateController::class, 'show'])
        ->middleware('permission:view invitation templates');
    Route::patch('/{id}', [InvitationSystemTemplateController::class, 'update'])
        ->middleware('permission:manage invitation templates');
    // Support multipart updates from browsers that only POST
    Route::post('/{id}', [InvitationSystemTemplateController::class, 'update'])
        ->middleware('permission:manage invitation templates');
    Route::delete('/{id}', [InvitationSystemTemplateController::class, 'destroy'])
        ->middleware('permission:manage invitation templates');
});
