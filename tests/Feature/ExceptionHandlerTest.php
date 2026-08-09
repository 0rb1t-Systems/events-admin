<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;

class ExceptionHandlerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Create test routes for demonstration
        Route::get('/test/404', function () {
            abort(404);
        });

        Route::get('/test/403', function () {
            abort(403, 'Custom forbidden message');
        });

        Route::get('/test/500', function () {
            throw new \Exception('Test server error');
        });

        Route::post('/test/validation', function () {
            request()->validate([
                'email' => 'required|email',
                'name' => 'required|string|min:3'
            ]);
        });
    }

    /** @test */
    public function it_handles_404_errors_with_consistent_format()
    {
        $response = $this->getJson('/test/404');

        $response->assertStatus(404)
                 ->assertJsonStructure([
                     'success',
                     'message',
                     'errors',
                     'status_code'
                 ])
                 ->assertJson([
                     'success' => false,
                     'status_code' => 404
                 ]);
    }

    /** @test */
    public function it_handles_403_errors_with_consistent_format()
    {
        $response = $this->getJson('/test/403');

        $response->assertStatus(403)
                 ->assertJsonStructure([
                     'success',
                     'message',
                     'errors',
                     'status_code'
                 ])
                 ->assertJson([
                     'success' => false,
                     'status_code' => 403
                 ]);
    }

    /** @test */
    public function it_handles_validation_errors_with_consistent_format()
    {
        $response = $this->postJson('/test/validation', [
            'email' => 'invalid-email',
            'name' => 'ab' // too short
        ]);

        $response->assertStatus(422)
                 ->assertJsonStructure([
                     'success',
                     'message',
                     'errors' => [
                         'email',
                         'name'
                     ],
                     'status_code'
                 ])
                 ->assertJson([
                     'success' => false,
                     'message' => 'Validation failed',
                     'status_code' => 422
                 ]);
    }

    /** @test */
    public function it_handles_server_errors_with_consistent_format()
    {
        $response = $this->getJson('/test/500');

        $response->assertStatus(500)
                 ->assertJsonStructure([
                     'success',
                     'message',
                     'errors',
                     'status_code'
                 ])
                 ->assertJson([
                     'success' => false,
                     'status_code' => 500
                 ]);
    }
}
