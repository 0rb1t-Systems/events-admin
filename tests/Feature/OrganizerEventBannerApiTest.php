<?php

namespace Tests\Feature;

use App\Enums\SanctumAbility;
use App\Models\Event;
use App\Models\Organizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrganizerEventBannerApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_banner_upload_stores_public_assets_path_and_absolute_banner_url(): void
    {
        $organizer = Organizer::factory()->create();
        $event = Event::factory()->create(['organizer_id' => $organizer->id, 'banner_path' => null]);
        Sanctum::actingAs($organizer, [SanctumAbility::OrganizerWeb->value]);

        $response = $this->post("/api/v1/organizer/events/{$event->id}/banner", [
            'banner' => UploadedFile::fake()->image('cover.jpg', 80, 40),
        ]);

        $response->assertOk();
        $path = $response->json('data.banner_path');
        $url = $response->json('data.banner_url');

        $this->assertIsString($path);
        $this->assertStringStartsWith('/assets/images/events/', $path);
        $this->assertIsString($url);
        $this->assertStringContainsString('/assets/images/events/', $url);
        $this->assertStringStartsWith('http', $url);
        $this->assertFileExists(public_path(ltrim($path, '/')));

        $this->getJson("/api/v1/organizer/events/{$event->id}")
            ->assertOk()
            ->assertJsonPath('data.banner_path', $path)
            ->assertJsonPath('data.banner_url', $url);

        File::delete(public_path(ltrim($path, '/')));
    }

    public function test_relative_banner_path_on_public_show_includes_banner_url(): void
    {
        $event = Event::factory()->published()->create([
            'banner_path' => '/assets/images/events/demo.jpg',
        ]);

        $payload = $this->getJson("/api/v1/events/{$event->id}")
            ->assertOk()
            ->json('data');

        $this->assertSame('/assets/images/events/demo.jpg', $payload['banner_path']);
        $this->assertStringEndsWith('/assets/images/events/demo.jpg', $payload['banner_url']);
    }
}
