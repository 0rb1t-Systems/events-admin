<?php

use Illuminate\Support\Facades\Route;

Route::middleware('verify.api.client')->group(function () {
    Route::get('/ping', function () {
        return response()->json([
            'message' => 'API is working ✅',
            'time' => now(),
        ]);
    });

    // API Version 1 Routes
    Route::prefix('v1')->group(function () {
        // Auth routes
        Route::prefix('auth')->group(base_path('routes/api/v1/auth.php'));

        // Settings routes
        Route::prefix('settings')->group(base_path('routes/api/v1/settings.php'));

        // Admin dashboard stats
        Route::prefix('dashboard')->group(base_path('routes/api/v1/dashboard.php'));

        // Users routes
        Route::prefix('users')->group(base_path('routes/api/v1/users.php'));

        // Roles routes
        Route::prefix('roles')->group(base_path('routes/api/v1/roles.php'));

        // Logs routes
        Route::prefix('logs')->group(base_path('routes/api/v1/logs.php'));

        // Organizations routes
        Route::prefix('organizations')->group(base_path('routes/api/v1/organizations.php'));

        // Public platform branding (Web App — API-key only, no Bearer)
        Route::get('/platform/branding', [\App\Http\Controllers\Api\Web\PlatformBrandingController::class, 'show']);

        // Public door scanner (scan_token auth — no Bearer)
        Route::prefix('public')->group(base_path('routes/api/v1/public-scanner.php'));

        // Organizers (Admin oversight)
        Route::prefix('organizers')->group(base_path('routes/api/v1/organizers.php'));

        // Packages (Admin CRUD — subscription plans)
        Route::prefix('packages')->group(base_path('routes/api/v1/packages.php'));

        // Events (Admin oversight)
        Route::prefix('events')->group(base_path('routes/api/v1/events.php'));

        // Event categories (Admin CRUD)
        Route::prefix('event-categories')->group(base_path('routes/api/v1/event-categories.php'));

        // Ticket types + discount codes (admin oversight endpoints)
        require base_path('routes/api/v1/ticket-types.php');

        // Participations (admin oversight)
        require base_path('routes/api/v1/participations.php');

        // QR scan logs (Phase 5b) — invitation templates removed
        Route::prefix('qr-scan-logs')->group(base_path('routes/api/v1/qr-scan-logs.php'));

        // Certificates (admin re-issue — Prompt 13)
        Route::prefix('certificates')->group(base_path('routes/api/v1/certificates.php'));

        // Platform feedback oversight (Prompt 13)
        Route::prefix('feedback')->group(base_path('routes/api/v1/feedback.php'));

        // Payments + payouts (Phase 6)
        Route::prefix('payments')->group(base_path('routes/api/v1/payments.php'));
        Route::prefix('payout-requests')->group(base_path('routes/api/v1/payout-requests.php'));

        // Event feedback submit (ops/tests; Web App owns participant UX)
        Route::middleware(['auth:sanctum', 'admin.panel'])->post(
            '/event-feedback',
            [\App\Http\Controllers\Api\EventAddOnController::class, 'submitFeedback']
        )->middleware('permission:manage event feedback');

        // Organizer Web App auth scaffolding (separate from User auth)
        Route::prefix('organizer-auth')->group(base_path('routes/api/v1/organizer-auth.php'));

        // Organizer Web App (explicit organizer.web surface — do not reuse Admin routes)
        require base_path('routes/api/v1/organizer-web-core.php');
        require base_path('routes/api/v1/organizer-web-content.php');
        require base_path('routes/api/v1/organizer-web-ops.php');

        // Participant Web App (explicit participant.web surface)
        require base_path('routes/api/v1/participant-web.php');

        // Profile routes (Admin Panel scoped)
        Route::middleware(['auth:sanctum', 'admin.panel'])->put('/auth/profile', [\App\Http\Controllers\Api\AuthController::class, 'updateProfile']);
        Route::middleware(['auth:sanctum', 'admin.panel'])->post('/auth/profile-picture', [\App\Http\Controllers\Api\AuthController::class, 'updateProfilePicture']);
        Route::middleware(['auth:sanctum', 'admin.panel'])->post('/auth/change-password', [\App\Http\Controllers\Api\AuthController::class, 'changePassword']);

        // API clients (read-only Settings oversight)
        Route::prefix('api-clients')->group(base_path('routes/api/v1/api-clients.php'));
    });
});
