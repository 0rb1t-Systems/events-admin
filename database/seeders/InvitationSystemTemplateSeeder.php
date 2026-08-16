<?php

namespace Database\Seeders;

use App\Models\InvitationSystemTemplate;
use App\Support\InvitationCanvas;
use Illuminate\Database\Seeder;

class InvitationSystemTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'name' => 'Modern Blue',
                'slug' => 'modern-blue',
                'background_image_path' => 'system/templates/modern-blue-bg.png',
                'thumbnail_path' => 'system/templates/modern-blue-thumb.png',
                'default_customizations' => [
                    'primary_color' => '#0ea5e9',
                    'secondary_color' => '#0369a1',
                    'font_family' => 'Inter',
                    'header_text' => 'You are invited',
                ],
            ],
            [
                'name' => 'Festive Gold',
                'slug' => 'festive-gold',
                'background_image_path' => 'system/templates/festive-gold-bg.png',
                'thumbnail_path' => 'system/templates/festive-gold-thumb.png',
                'default_customizations' => [
                    'primary_color' => '#d97706',
                    'secondary_color' => '#92400e',
                    'font_family' => 'Georgia',
                    'header_text' => 'Join us',
                ],
            ],
            [
                'name' => 'Minimal Dark',
                'slug' => 'minimal-dark',
                'background_image_path' => 'system/templates/minimal-dark-bg.png',
                'thumbnail_path' => 'system/templates/minimal-dark-thumb.png',
                'default_customizations' => [
                    'primary_color' => '#f3f4f6',
                    'secondary_color' => '#9ca3af',
                    'font_family' => 'Inter',
                    'header_text' => 'Invitation',
                ],
            ],
            [
                'name' => 'Classic Cream',
                'slug' => 'classic-cream',
                'background_image_path' => 'system/templates/classic-cream-bg.png',
                'thumbnail_path' => 'system/templates/classic-cream-thumb.png',
                'default_customizations' => [
                    'primary_color' => '#78716c',
                    'secondary_color' => '#44403c',
                    'font_family' => 'Georgia',
                    'header_text' => 'Cordially invited',
                ],
            ],
        ];

        foreach ($templates as $row) {
            InvitationSystemTemplate::query()->updateOrCreate(
                ['slug' => $row['slug']],
                array_merge($row, [
                    'default_overlay_positions' => InvitationCanvas::defaultOverlayPositions(),
                    'active' => true,
                ])
            );
        }
    }
}
