<?php

namespace App\Http\Controllers\Api;

use App\Models\Certificate;
use App\Models\Participation;
use App\Services\CertificateIssuanceService;
use Illuminate\Http\Request;
use InvalidArgumentException;
use RuntimeException;

/**
 * Admin certificate oversight — platform list + force re-issue.
 */
class CertificateController extends BaseController
{
    protected $model = Certificate::class;

    protected $searchableFields = [];

    protected $sortableFields = ['id', 'issued_at', 'created_at', 'verified'];

    protected $relationships = ['participation.user', 'participation.event.organizer'];

    protected $validationRules = [
        'store' => [],
        'update' => [],
    ];

    public function __construct(private CertificateIssuanceService $issuance) {}

    public function index(Request $request)
    {
        $query = Certificate::query()->with($this->relationships);

        if ($request->filled('event_id')) {
            $query->whereHas(
                'participation',
                fn ($q) => $q->where('event_id', $request->integer('event_id'))
            );
        }
        if ($request->has('verified') && $request->input('verified') !== '' && $request->input('verified') !== null) {
            $query->where('verified', filter_var($request->input('verified'), FILTER_VALIDATE_BOOLEAN));
        }
        if ($request->filled('date_from')) {
            $query->whereDate('issued_at', '>=', $request->string('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('issued_at', '<=', $request->string('date_to'));
        }

        $query = $this->applyApiFilters(
            $query,
            $request,
            $this->searchableFields,
            $this->sortableFields,
            'issued_at',
            'desc'
        );

        return $this->paginateResponse($query, $request);
    }

    /**
     * Force re-issue certificate for a participation (admin-panel only).
     * POST /api/v1/certificates/{participation_id}/reissue
     */
    public function reissue(Request $request, $participationId)
    {
        $participation = Participation::with(['user', 'event'])->find($participationId);
        if (! $participation) {
            return $this->notFoundResponse('Participation not found');
        }

        try {
            $certificate = $this->issuance->reissueForParticipation($participation);
        } catch (InvalidArgumentException $e) {
            return $this->badRequestResponse($e->getMessage(), [
                'error_code' => ['certificate_requires_checked_in_status'],
            ]);
        } catch (RuntimeException $e) {
            return $this->errorResponse($e->getMessage(), [
                'error_code' => ['certificate_reissue_failed'],
            ], 500);
        }

        $this->logActivity(
            'Certificate re-issued',
            $certificate,
            [
                'participation_id' => $participation->id,
                'participant_name' => $participation->user?->name,
                'event_id' => $participation->event_id,
                'admin_id' => auth()->id(),
            ],
            'updated'
        );

        return $this->successResponse(
            $certificate->fresh($this->relationships),
            'Certificate re-issued.'
        );
    }
}
