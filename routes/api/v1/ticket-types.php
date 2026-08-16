<?php

use App\Http\Controllers\Api\DiscountCodeController;
use App\Http\Controllers\Api\TicketTypeController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Ticket Types (Admin oversight — moderate sales_enabled; soft-delete)
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum', 'admin.panel'])->prefix('ticket-types')->group(function () {
    Route::post('/', [TicketTypeController::class, 'store'])->middleware('permission:create ticket types');
    Route::patch('/{id}', [TicketTypeController::class, 'update'])->middleware('permission:moderate ticket types');
    Route::post('/{id}/disable-sales', [TicketTypeController::class, 'disableSales'])->middleware('permission:moderate ticket types');
    Route::post('/{id}/enable-sales', [TicketTypeController::class, 'enableSales'])->middleware('permission:moderate ticket types');
    Route::delete('/{id}', [TicketTypeController::class, 'destroy'])->middleware('permission:moderate ticket types');
    Route::delete('/{id}/force', [TicketTypeController::class, 'forceDestroy'])->middleware('permission:moderate ticket types');
});

/*
|--------------------------------------------------------------------------
| Discount Codes (Admin read oversight + ops create)
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum', 'admin.panel'])->prefix('discount-codes')->group(function () {
    Route::get('/', [DiscountCodeController::class, 'index'])->middleware('permission:view discount codes');
    Route::post('/', [DiscountCodeController::class, 'store'])->middleware('permission:create discount codes');
    Route::get('/{id}', [DiscountCodeController::class, 'show'])->middleware('permission:view discount codes');
});
