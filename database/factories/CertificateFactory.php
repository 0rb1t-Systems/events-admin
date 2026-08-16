<?php

namespace Database\Factories;

use App\Models\Certificate;
use App\Models\Participation;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Certificate> */
class CertificateFactory extends Factory
{
    protected $model = Certificate::class;

    public function definition(): array
    {
        return [
            'participation_id' => Participation::factory(),
            'issued_at' => now(),
            'file_path' => null,
            'file_url' => null,
            'verified' => false,
        ];
    }
}
