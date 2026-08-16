<?php

use App\Http\Controllers\Api\EventInvitationTemplateController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Event Invitation Templates (Admin read + ops store)
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum', 'admin.panel'])->group(function () {
    Route::post('/', [EventInvitationTemplateController::class, 'store'])
        ->middleware('permission:manage invitation templates');
    Route::patch('/{id}', [EventInvitationTemplateController::class, 'update'])
        ->middleware('permission:manage invitation templates');
});
