<?php

namespace App\Http\Controllers\Api\Web;

use App\Enums\QrScanResult;
use App\Http\Controllers\Api\BaseController;
use App\Http\Controllers\Api\Web\Concerns\ResolvesOrganizerEvent;
use App\Models\Event;
use App\Models\Participation;
use App\Models\QrScanLog;
use App\Services\QrValidationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Organizer Web App QR check-in. Scanner organizer is always the authenticated organizer.
 */
class OrganizerQrController extends BaseController
{
    use ResolvesOrganizerEvent;

    public function __construct(private QrValidationService $qrValidation) {}

    public function validateScan(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => 'required|string|max:128',
            'gate' => 'nullable|string|max:100',
        ]);

        $organizer = $this->organizer();
        $token = trim($validated['token']);
        $gate = $validated['gate'] ?? null;

        $participation = $token === ''
            ? null
            : Participation::query()->where('qr_token', $token)->first();

        if ($participation && ! $this->participationBelongsToOrganizer($participation, $organizer->id)) {
            $scanLog = QrScanLog::create([
                'scanned_token' => $token,
                'participation_id' => $participation->id,
                'event_id' => $participation->event_id,
                'result' => QrScanResult::INVALID,
                'gate' => $gate,
                'scanner_user_id' => null,
                'scanner_organizer_id' => $organizer->id,
                'meta' => ['reason' => 'event_not_owned'],
            ]);

            $this->logActivity(
                'QR scan validated',
                $scanLog,
                [
                    'result' => QrScanResult::INVALID->value,
                    'checked_in' => false,
                    'reason' => 'event_not_owned',
                    'gate' => $gate,
                ],
                'updated'
            );

            return $this->successResponse([
                'result' => QrScanResult::INVALID->value,
                'checked_in' => false,
                'participation' => null,
                'scan_log' => $scanLog->fresh(['scannerOrganizer']),
            ], 'Scan processed.');
        }

        $outcome = $this->qrValidation->validate(
            $validated['token'],
            $gate,
            null,
            $organizer
        );

        $scanLog = $outcome['scan_log']->fresh(['participation.user', 'event', 'scannerOrganizer']);

        $this->logActivity(
            $outcome['checked_in'] ? 'QR check-in succeeded' : 'QR scan validated',
            $scanLog,
            [
                'result' => $outcome['result']->value,
                'checked_in' => $outcome['checked_in'],
                'participation_id' => $outcome['participation']?->id,
                'gate' => $gate,
            ],
            'updated'
        );

        return $this->successResponse([
            'result' => $outcome['result']->value,
            'checked_in' => $outcome['checked_in'],
            'participation' => $outcome['participation'],
            'scan_log' => $scanLog,
        ], 'Scan processed.');
    }

    public function forEvent($event): JsonResponse
    {
        $owned = $this->ownedEventOrFail($event);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        $logs = QrScanLog::query()
            ->with(['participation.user', 'scannerUser', 'scannerOrganizer'])
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

    public function checkInStats($event): JsonResponse
    {
        $owned = $this->ownedEventOrFail($event);
        if ($owned instanceof JsonResponse) {
            return $owned;
        }

        return $this->successResponse($this->qrValidation->checkInStats($owned->id));
    }

    private function participationBelongsToOrganizer(Participation $participation, int $organizerId): bool
    {
        return Event::query()
            ->whereKey($participation->event_id)
            ->where('organizer_id', $organizerId)
            ->exists();
    }
}
