<?php

use App\Http\Controllers\Api\Web\OrganizerPackageController;
use App\Http\Controllers\Api\Web\OrganizerPayoutController;
use App\Http\Controllers\Api\Web\OrganizerQrController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Organizer Web App ops (payouts, QR, packages)
|--------------------------------------------------------------------------
|
| Loaded under /api/v1 (see routes/api.php). Prefix organizer → /api/v1/organizer/...
| Cross-organizer resources return 404. No approve/reject/record-payment.
| Organizer self-subscription: POST /subscriptions (Waafi for paid packages).
| Invitation template routes removed — tickets are a static Web App design.
|
*/

Route::middleware(['auth:sanctum', 'organizer.web'])->prefix('organizer')->group(function () {
    Route::get('/payout-requests', [OrganizerPayoutController::class, 'index']);
    Route::get('/payout-requests/{payoutRequest}', [OrganizerPayoutController::class, 'show']);
    Route::get('/events/{event}/payout-requests', [OrganizerPayoutController::class, 'forEvent']);
    Route::post('/events/{event}/payout-requests', [OrganizerPayoutController::class, 'storeForEvent']);

    Route::post('/scanner/unlock', [OrganizerQrController::class, 'unlockScanner']);
    Route::post('/qr-scan-logs/validate', [OrganizerQrController::class, 'validateScan']);
    Route::get('/events/{event}/qr-scan-logs', [OrganizerQrController::class, 'forEvent']);
    Route::get('/events/{event}/check-in-stats', [OrganizerQrController::class, 'checkInStats']);

    Route::get('/packages', [OrganizerPackageController::class, 'packages']);
    Route::get('/subscription', [OrganizerPackageController::class, 'subscription']);
    Route::get('/quota', [OrganizerPackageController::class, 'quota']);
    Route::post('/subscriptions', [OrganizerPackageController::class, 'subscribe']);
    Route::get('/subscriptions/history', [OrganizerPackageController::class, 'history']);
    Route::get('/subscription-orders', [OrganizerPackageController::class, 'orders']);
    Route::get('/subscription-orders/{id}', [OrganizerPackageController::class, 'showOrder'])->whereNumber('id');
});
