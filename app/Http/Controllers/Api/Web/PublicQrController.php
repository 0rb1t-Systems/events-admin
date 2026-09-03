<?php

namespace App\Http\Controllers\Api\Web;

use App\Enums\QrScanResult;
use App\Http\Controllers\Api\BaseController;
use App\Models\Event;
use App\Models\Participation;
use App\Models\QrScanLog;
use App\Services\QrValidationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Public door scanner — API-key only. Authorization is the event scan_token (no Bearer).
 */
class PublicQrController extends BaseController
{
    public function __construct(private QrValidationService $qrValidation) {}

    public function unlockScanner(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'scan_token' => 'required|string|max:64',
        ]);

        $event = $this->eventForScanToken($validated['scan_token']);
        if ($event instanceof JsonResponse) {
            return $event;
        }

        return $this->successResponse([
            'event_id' => $event->id,
            'title' => $event->title,
            'status' => $event->status,
            'event_mode' => $event->event_mode,
        ], 'Scanner unlocked for event.');
    }

    public function validateScan(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'scan_token' => 'required|string|max:64',
            'token' => 'required|string|max:128',
            'gate' => 'nullable|string|max:100',
            'event_id' => 'nullable|integer|exists:events,id',
        ]);

        $event = $this->eventForScanToken($validated['scan_token']);
        if ($event instanceof JsonResponse) {
            return $event;
        }

        $token = \App\Services\QrTokenService::normalize($validated['token']);
        $gate = $validated['gate'] ?? null;
        $eventId = (int) ($validated['event_id'] ?? $event->id);

        if ($eventId !== (int) $event->id) {
            return $this->forbiddenResponse('Scan token does not match this event.');
        }

        $participation = $token === ''
            ? null
            : Participation::query()->where('qr_token', $token)->first();

        if ($participation && (int) $participation->event_id !== $eventId) {
            $scanLog = QrScanLog::create([
                'scanned_token' => $token,
                'participation_id' => $participation->id,
                'event_id' => $participation->event_id,
                'result' => QrScanResult::INVALID,
                'gate' => $gate,
                'scanner_user_id' => null,
                'scanner_organizer_id' => null,
                'meta' => ['reason' => 'event_id_mismatch', 'expected_event_id' => $eventId, 'public_scanner' => true],
            ]);

            return $this->successResponse([
                'result' => QrScanResult::INVALID->value,
                'checked_in' => false,
                'participation' => null,
                'scan_log' => $scanLog,
            ], 'Ticket does not belong to this event.');
        }

        $outcome = $this->qrValidation->validate(
            $validated['token'],
            $gate,
            null,
            null
        );

        $scanLog = $outcome['scan_log']->fresh(['participation.user', 'event']);

        return $this->successResponse([
            'result' => $outcome['result']->value,
            'checked_in' => $outcome['checked_in'],
            'participation' => $outcome['participation'],
            'scan_log' => $scanLog,
        ], 'Scan processed.');
    }

    public function forEvent(Request $request, $event): JsonResponse
    {
        $validated = $request->validate([
            'scan_token' => 'required|string|max:64',
        ]);

        $owned = $this->eventForScanToken($validated['scan_token']);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        if ((int) $owned->id !== (int) $event) {
            return $this->forbiddenResponse('Scan token does not match this event.');
        }

        $logs = QrScanLog::query()
            ->with(['participation.user'])
            ->where('event_id', $owned->id)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        return $this->successResponse([
            'event_id' => $owned->id,
            'stats' => $this->qrValidation->checkInStats($owned->id),
            'scan_logs' => $logs,
        ]);
    }

    private function eventForScanToken(string $scanToken): Event|JsonResponse
    {
        $event = Event::query()
            ->where('scan_token', trim($scanToken))
            ->first();

        if (! $event) {
            return $this->notFoundResponse('Invalid scan token');
        }

        return $event;
    }
}
