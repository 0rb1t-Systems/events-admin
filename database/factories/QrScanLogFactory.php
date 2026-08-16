<?php

namespace Database\Factories;

use App\Enums\QrScanResult;
use App\Models\Event;
use App\Models\Participation;
use App\Models\QrScanLog;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<QrScanLog>
 */
class QrScanLogFactory extends Factory
{
    protected $model = QrScanLog::class;

    public function definition(): array
    {
        return [
            'scanned_token' => bin2hex(random_bytes(16)),
            'participation_id' => null,
            'event_id' => Event::factory(),
            'result' => QrScanResult::INVALID,
            'gate' => null,
            'scanner_user_id' => null,
            'scanner_organizer_id' => null,
            'meta' => null,
        ];
    }

    public function forParticipation(Participation $participation, QrScanResult $result = QrScanResult::VALID): static
    {
        return $this->state(fn () => [
            'scanned_token' => $participation->qr_token ?? bin2hex(random_bytes(8)),
            'participation_id' => $participation->id,
            'event_id' => $participation->event_id,
            'result' => $result,
        ]);
    }
}
