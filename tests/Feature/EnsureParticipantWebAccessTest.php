<?php

namespace Tests\Feature;

use App\Enums\SanctumAbility;
use App\Http\Middleware\EnsureParticipantWebAccess;
use App\Models\Organizer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EnsureParticipantWebAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_returns_401_with_error_code(): void
    {
        $middleware = new EnsureParticipantWebAccess;
        $request = Request::create('/api/v1/participant/participations', 'GET');

        $response = $middleware->handle($request, fn () => response('ok'));

        $this->assertSame(401, $response->getStatusCode());
        $payload = $response->getData(true);
        $this->assertFalse($payload['success']);
        $this->assertSame(['unauthenticated'], $payload['errors']['error_code']);
    }

    public function test_admin_panel_token_returns_403_wrong_ability(): void
    {
        $user = User::factory()->admin()->create();
        $token = $user->createToken('admin_auth_token', [SanctumAbility::AdminPanel->value]);
        $user->withAccessToken($token->accessToken);

        $middleware = new EnsureParticipantWebAccess;
        $request = Request::create('/api/v1/participant/participations', 'GET');
        $request->setUserResolver(fn () => $user);

        $response = $middleware->handle($request, fn () => response('ok'));

        $this->assertSame(403, $response->getStatusCode());
        $payload = $response->getData(true);
        $this->assertSame(['wrong_ability'], $payload['errors']['error_code']);
    }

    public function test_organizer_guard_user_returns_403_wrong_ability(): void
    {
        $organizer = Organizer::factory()->create();

        $middleware = new EnsureParticipantWebAccess;
        $request = Request::create('/api/v1/participant/participations', 'GET');
        $request->setUserResolver(fn () => $organizer);

        $response = $middleware->handle($request, fn () => response('ok'));

        $this->assertSame(403, $response->getStatusCode());
        $payload = $response->getData(true);
        $this->assertSame(['wrong_ability'], $payload['errors']['error_code']);
    }

    public function test_web_participant_token_is_allowed(): void
    {
        $user = User::factory()->participant()->create();
        Sanctum::actingAs($user, [SanctumAbility::WebParticipant->value]);

        $middleware = new EnsureParticipantWebAccess;
        $request = Request::create('/api/v1/participant/participations', 'GET');
        $request->setUserResolver(fn () => $user);

        $response = $middleware->handle($request, fn () => response('ok'));

        $this->assertSame('ok', $response->getContent());
    }
}
