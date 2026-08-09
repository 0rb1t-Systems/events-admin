<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Stevebauman\Location\Facades\Location;

class LocationService
{
    /**
     * Get location data from IP address
     *
     * @param string $ip
     * @return array
     */
    public function getLocationData(string $ip): array
    {
        // Skip lookup for localhost
        if ($ip === '127.0.0.1' || $ip === '::1') {
            return [
                'country' => 'Local',
                'city' => 'Local',
                'address' => 'Local',
                'latitude' => null,
                'longitude' => null,
                'timezone' => null
            ];
        }

        try {
            $position = Location::get($ip);

            if ($position) {
                return [
                    'country' => $position->countryName ?? 'Unknown',
                    'city' => $position->cityName ?? 'Unknown',
                    'address' => $position->ip ?? $ip,
                    'latitude' => $position->latitude ?? null,
                    'longitude' => $position->longitude ?? null,
                    'timezone' => $position->timezone ?? null
                ];
            }
        } catch (\Exception $e) {
            Log::error('IP Geolocation lookup failed: ' . $e->getMessage());
        }

        return [
            'country' => 'Unknown',
            'city' => 'Unknown',
            'address' => $ip,
            'latitude' => null,
            'longitude' => null,
            'timezone' => null
        ];
    }
}
