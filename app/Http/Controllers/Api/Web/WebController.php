<?php

namespace App\Http\Controllers\Api\Web;

use App\Models\Participation;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;

abstract class WebController extends Controller
{
    use ApiResponseTrait;

    /**
     * @return array{items: mixed, pagination: array<string, mixed>}
     */
    protected function webPaginatorPayload($paginator): array
    {
        return [
            'items' => $paginator->items(),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ];
    }

    protected function ownedParticipationOrFail(int|string $id): Participation|JsonResponse
    {
        $row = Participation::query()
            ->whereKey($id)
            ->where('user_id', request()->user()->id)
            ->first();

        return $row ?: $this->notFoundResponse('Participation not found');
    }

    /**
     * Always include `data` (including JSON null) so empty participant reads stay explicit.
     */
    protected function successWithNullableData(mixed $data, string $message = 'Operation completed successfully'): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'status_code' => 200,
        ]);
    }
}
