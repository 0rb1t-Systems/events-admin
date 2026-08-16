<?php

namespace App\Support;

/**
 * Shared defaults for invitation compositing (Prompt 15).
 * Canvas: 800×1100px portrait — locked in .agent "Invitation Canvas Standard".
 */
class InvitationCanvas
{
    public const WIDTH = 800;

    public const HEIGHT = 1100;

    /**
     * Default overlay zones for a new system template (pixels on 800×1100 canvas).
     *
     * @return array<string, array<string, int|string>>
     */
    public static function defaultOverlayPositions(): array
    {
        return [
            'qr_code' => [
                'x' => 300,
                'y' => 820,
                'width' => 200,
                'height' => 200,
            ],
            'participant_name' => [
                'x' => 80,
                'y' => 220,
                'font_size' => 36,
                'font_color' => '#111827',
            ],
            'event_title' => [
                'x' => 80,
                'y' => 290,
                'font_size' => 28,
                'font_color' => '#111827',
            ],
            'event_date' => [
                'x' => 80,
                'y' => 360,
                'font_size' => 20,
                'font_color' => '#374151',
            ],
            'event_time' => [
                'x' => 80,
                'y' => 400,
                'font_size' => 18,
                'font_color' => '#374151',
            ],
            'event_venue' => [
                'x' => 80,
                'y' => 450,
                'font_size' => 18,
                'font_color' => '#374151',
            ],
            'ticket_type' => [
                'x' => 80,
                'y' => 500,
                'font_size' => 16,
                'font_color' => '#4B5563',
            ],
            'organizer_logo' => [
                'x' => 80,
                'y' => 60,
                'width' => 120,
                'height' => 60,
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function defaultCustomizations(): array
    {
        return [
            'primary_color' => '#0ea5e9',
            'secondary_color' => '#0369a1',
            'font_family' => 'Inter',
            'header_text' => 'You are invited',
        ];
    }
}
