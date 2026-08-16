<?php

namespace App\Http\Controllers\Api;

use App\Models\Event;
use App\Models\Organizer;
use App\Models\QrScanLog;
use App\Services\QrValidationService;
use App\Traits\RejectsAdminPanelOrganizerActions;
use Illuminate\Http\Request;

/**
 * Admin QR Scan History (read-only) + validate endpoint for future Web App scanner.
 * Validate is organizer-scoped — Admin Panel tokens are rejected.
 */
class QrScanLogController extends BaseController
{
    use RejectsAdminPanelOrganizerActions;

    protected $model = QrScanLog::class;

    protected $searchableFields = ['scanned_token', 'gate', 'result'];

    protected $sortableFields = ['id', 'result', 'gate', 'created_at'];

    protected $relationships = ['participation.user', 'event', 'scannerUser', 'scannerOrganizer'];

    protected $validationRules = [
        'store' => [],
        'update' => [],
    ];

    public function __construct(private QrValidationService $qrValidation) {}

    public function index(Request $request)
    {
        $query = QrScanLog::query()->with($this->relationships);

        if ($request->filled('event_id')) {
            $query->where('event_id', $request->integer('event_id'));
        }
        if ($request->filled('result')) {
            $query->where('result', $request->string('result'));
        }
        if ($request->filled('participation_id')) {
            $query->where('participation_id', $request->integer('participation_id'));
        }

        $query = $this->applyApiFilters(
            $query,
            $request,
            $this->searchableFields,
            $this->sortableFields,
            'created_at',
            'desc'
        );

        return $this->paginateResponse($query, $request);
    }

    public function show($id)
    {
        $log = QrScanLog::with($this->relationships)->find($id);
        if (! $log) {
            return $this->notFoundResponse();
        }

        return $this->successResponse($log);
    }

    /**
     * Validate a scanned token (organizer Web App scanner).
     * Admin Panel tokens are rejected — check-in is an event-operation action.
     */
    public function validateScan(Request $request)
    {
        if ($denied = $this->rejectIfAdminPanelToken()) {
            return $denied;
        }

        $validated = $request->validate([
            'token' => 'required|string|max:128',
            'gate' => 'nullable|string|max:100',
            'scanner_organizer_id' => 'nullable|integer|exists:organizers,id',
        ]);

        $organizer = null;
        if (! empty($validated['scanner_organizer_id'])) {
            $organizer = Organizer::find($validated['scanner_organizer_id']);
        }

        $outcome = $this->qrValidation->validate(
            $validated['token'],
            $validated['gate'] ?? null,
            $request->user(),
            $organizer
        );

        $scanLog = $outcome['scan_log']->fresh($this->relationships);

        $this->logActivity(
            $outcome['checked_in'] ? 'QR check-in succeeded' : 'QR scan validated',
            $scanLog,
            [
                'result' => $outcome['result']->value,
                'checked_in' => $outcome['checked_in'],
                'participation_id' => $outcome['participation']?->id,
                'gate' => $validated['gate'] ?? null,
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

    public function forEvent($eventId)
    {
        $event = Event::find($eventId);
        if (! $event) {
            return $this->notFoundResponse('Event not found');
        }

        $logs = QrScanLog::query()
            ->with(['participation.user', 'scannerUser'])
            ->where('event_id', $eventId)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        return $this->successResponse([
            'event_id' => (int) $eventId,
            'stats' => $this->qrValidation->checkInStats((int) $eventId),
            'scan_logs' => $logs,
        ]);
    }

    public function checkInStats($eventId)
    {
        $event = Event::find($eventId);
        if (! $event) {
            return $this->notFoundResponse('Event not found');
        }

        return $this->successResponse($this->qrValidation->checkInStats((int) $eventId));
    }
}
