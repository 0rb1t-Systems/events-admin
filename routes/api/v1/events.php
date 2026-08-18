<?php

use App\Http\Controllers\Api\EventController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Events API Routes (Admin oversight)
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum', 'admin.panel'])->group(function () {
    Route::get('/search', [EventController::class, 'search'])->middleware('permission:view events');
    Route::post('/', [EventController::class, 'store'])->middleware('permission:create events');

    Route::get('/trashed/list', [EventController::class, 'trashed'])->middleware('permission:view trash items');
    Route::delete('/bulk/delete', [EventController::class, 'bulkDelete'])->middleware('permission:delete events');
    Route::post('/bulk/restore', [EventController::class, 'bulkRestore'])->middleware('permission:delete events');
    Route::delete('/bulk/force-delete', [EventController::class, 'bulkForceDelete'])->middleware('permission:delete events');

    Route::post('/{id}/transition', [EventController::class, 'transition'])->middleware('permission:edit events');
    Route::post('/{id}/sync-capacity', [EventController::class, 'syncCapacity'])->middleware('permission:edit events');
    Route::get('/{id}/registration-gates', [EventController::class, 'registrationGates'])->middleware('permission:view events');

    // Ticket types + discount codes (nested oversight — before generic /{id})
    Route::get('/{id}/ticket-types', [\App\Http\Controllers\Api\TicketTypeController::class, 'forEvent'])
        ->middleware('permission:view ticket types');
    Route::get('/{id}/discount-codes', [\App\Http\Controllers\Api\DiscountCodeController::class, 'forEvent'])
        ->middleware('permission:view discount codes');
    Route::post('/{id}/discount-codes/validate', [\App\Http\Controllers\Api\DiscountCodeController::class, 'validateForEvent'])
        ->middleware('permission:view discount codes');

    Route::get('/{id}/participations', [\App\Http\Controllers\Api\ParticipationController::class, 'forEvent'])
        ->middleware('permission:view participations');

    Route::get('/{id}/form-fields', [\App\Http\Controllers\Api\EventFormFieldController::class, 'forEvent'])
        ->middleware('permission:view event form fields');

    Route::get('/{id}/check-in-stats', [\App\Http\Controllers\Api\QrScanLogController::class, 'checkInStats'])
        ->middleware('permission:view qr scan logs');
    Route::get('/{id}/qr-scan-logs', [\App\Http\Controllers\Api\QrScanLogController::class, 'forEvent'])
        ->middleware('permission:view qr scan logs');
    Route::get('/{id}/invitation-template', [\App\Http\Controllers\Api\EventInvitationTemplateController::class, 'forEvent'])
        ->middleware('permission:view invitation templates');

    Route::get('/{id}/finance', [\App\Http\Controllers\Api\PaymentController::class, 'eventFinance'])
        ->middleware('permission:view payments');

    // Prompt 10 add-ons (admin read-only oversight)
    Route::get('/{id}/analytics', [\App\Http\Controllers\Api\EventAddOnController::class, 'analytics'])
        ->middleware('permission:view event analytics');
    Route::post('/{id}/views', [\App\Http\Controllers\Api\EventAddOnController::class, 'recordView'])
        ->middleware('permission:view event analytics');
    Route::get('/{id}/announcements', [\App\Http\Controllers\Api\EventAddOnController::class, 'announcements'])
        ->middleware('permission:view event announcements');
    Route::post('/{id}/announcements', [\App\Http\Controllers\Api\EventAddOnController::class, 'storeAnnouncement'])
        ->middleware('permission:manage event announcements');
    Route::get('/{id}/certificates', [\App\Http\Controllers\Api\EventAddOnController::class, 'certificates'])
        ->middleware('permission:view certificates');
    Route::get('/{id}/feedback', [\App\Http\Controllers\Api\EventAddOnController::class, 'feedback'])
        ->middleware('permission:view event feedback');

    // Sponsors CRUD
    Route::get('/{id}/sponsors', [\App\Http\Controllers\Api\EventAddOnController::class, 'sponsors'])
        ->middleware('permission:view event sponsors');
    Route::post('/{id}/sponsors', [\App\Http\Controllers\Api\EventAddOnController::class, 'storeSponsor'])
        ->middleware('permission:manage event sponsors');
    Route::patch('/{id}/sponsors/{sponsorId}', [\App\Http\Controllers\Api\EventAddOnController::class, 'updateSponsor'])
        ->middleware('permission:manage event sponsors');
    Route::delete('/{id}/sponsors/{sponsorId}', [\App\Http\Controllers\Api\EventAddOnController::class, 'destroySponsor'])
        ->middleware('permission:manage event sponsors');

    // Speakers CRUD
    Route::get('/{id}/speakers', [\App\Http\Controllers\Api\EventAddOnController::class, 'speakers'])
        ->middleware('permission:view event speakers');
    Route::post('/{id}/speakers', [\App\Http\Controllers\Api\EventAddOnController::class, 'storeSpeaker'])
        ->middleware('permission:manage event speakers');
    Route::patch('/{id}/speakers/{speakerId}', [\App\Http\Controllers\Api\EventAddOnController::class, 'updateSpeaker'])
        ->middleware('permission:manage event speakers');
    Route::delete('/{id}/speakers/{speakerId}', [\App\Http\Controllers\Api\EventAddOnController::class, 'destroySpeaker'])
        ->middleware('permission:manage event speakers');

    // Sessions CRUD
    Route::get('/{id}/sessions', [\App\Http\Controllers\Api\EventAddOnController::class, 'sessions'])
        ->middleware('permission:view event sessions');
    Route::post('/{id}/sessions', [\App\Http\Controllers\Api\EventAddOnController::class, 'storeSession'])
        ->middleware('permission:manage event sessions');
    Route::patch('/{id}/sessions/{sessionId}', [\App\Http\Controllers\Api\EventAddOnController::class, 'updateSession'])
        ->middleware('permission:manage event sessions');
    Route::delete('/{id}/sessions/{sessionId}', [\App\Http\Controllers\Api\EventAddOnController::class, 'destroySession'])
        ->middleware('permission:manage event sessions');

    Route::post('/{id}/gallery', [EventController::class, 'uploadGalleryImage'])->middleware('permission:edit events');
    Route::post('/{id}/gallery/reorder', [EventController::class, 'reorderGallery'])->middleware('permission:edit events');
    Route::delete('/{id}/gallery/{imageId}', [EventController::class, 'deleteGalleryImage'])->middleware('permission:edit events');

    Route::post('/{id}/restore', [EventController::class, 'restore'])->middleware('permission:delete events');
    Route::delete('/{id}/force', [EventController::class, 'forceDestroy'])->middleware('permission:delete events');

    Route::patch('/{id}', [EventController::class, 'update'])->middleware('permission:edit events');
    Route::delete('/{id}', [EventController::class, 'destroy'])->middleware('permission:delete events');
});

/*
| API-key-only public catalog (verify.api.client from routes/api.php).
| Admin Bearer with admin-panel ability still receives the full unfiltered payload.
*/
Route::get('/', [EventController::class, 'index']);
Route::get('/{id}', [EventController::class, 'show']);
