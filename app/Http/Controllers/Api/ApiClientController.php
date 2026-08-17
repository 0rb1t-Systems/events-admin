<?php

namespace App\Http\Controllers\Api;

use App\Models\ApiClient;
use Illuminate\Http\Request;

class ApiClientController extends BaseController
{
    public function __construct()
    {
        $this->model = ApiClient::class;
        $this->searchableFields = ['name', 'public_key'];
        $this->sortableFields = ['id', 'name', 'public_key', 'active', 'created_at', 'updated_at'];
        $this->defaultSortField = 'name';
        $this->defaultSortDirection = 'asc';
    }

    public function index(Request $request)
    {
        $response = parent::index($request);
        $payload = $response->getData(true);

        if (isset($payload['data']) && is_array($payload['data'])) {
            $payload['data'] = array_map(
                fn (array $row) => $this->transformClient($row),
                $payload['data']
            );
        }

        return response()->json($payload, $response->getStatusCode());
    }

    public function show($id)
    {
        $response = parent::show($id);
        $payload = $response->getData(true);

        if (isset($payload['data']) && is_array($payload['data'])) {
            $payload['data'] = $this->transformClient($payload['data']);
        }

        return response()->json($payload, $response->getStatusCode());
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function transformClient(array $row): array
    {
        unset($row['secret']);

        if (isset($row['public_key']) && is_string($row['public_key'])) {
            $row['public_key_masked'] = $this->maskPublicKey($row['public_key']);
        }

        return $row;
    }

    private function maskPublicKey(string $publicKey): string
    {
        if (strlen($publicKey) <= 8) {
            return str_repeat('*', strlen($publicKey));
        }

        return substr($publicKey, 0, 4).str_repeat('*', max(strlen($publicKey) - 8, 4)).substr($publicKey, -4);
    }
}
