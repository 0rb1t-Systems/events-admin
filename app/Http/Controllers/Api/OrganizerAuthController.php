<?php

namespace App\Http\Controllers\Api;

use App\Enums\OrganizerStatus;
use App\Enums\SanctumAbility;
use App\Models\Organizer;
use App\Services\GoogleTokenVerifier;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Organizer Web App auth scaffolding (no UI in this phase).
 * Completely separate from User / Admin Panel authentication.
 */
class OrganizerAuthController extends Controller
{
    use ApiResponseTrait;

    /**
     * Register a new organizer (Web App — no Admin UI).
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'business_name' => 'required|string|max:255',
            'contact_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:organizers,email',
            'phone' => 'nullable|string|max:30',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $organizer = Organizer::create([
            ...$validated,
            'status' => OrganizerStatus::ACTIVE,
        ]);

        $token = $organizer->createToken(
            'organizer_web_token',
            [SanctumAbility::OrganizerWeb->value]
        )->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Organizer registered successfully',
            'data' => [
                'organizer' => $this->organizerPayload($organizer),
                'token' => $token,
                'token_ability' => SanctumAbility::OrganizerWeb->value,
            ],
        ], 201);
    }

    /**
     * Organizer login — issues organizer-web scoped token.
     * Suspended organizers are rejected with 403.
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $organizer = Organizer::where('email', $request->email)->first();

        if (! $organizer || ! Hash::check($request->password, $organizer->password)) {
            return $this->unauthorizedResponse('Invalid credentials');
        }

        if ($organizer->isSuspended()) {
            return response()->json([
                'success' => false,
                'message' => 'This organizer account is suspended. Contact support or wait for reactivation.',
                'errors' => [
                    'error_code' => ['organizer_suspended'],
                ],
                'status_code' => 403,
            ], 403);
        }

        $this->revokeOrganizerWebTokens($organizer);

        $token = $organizer->createToken(
            'organizer_web_token',
            [SanctumAbility::OrganizerWeb->value]
        )->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Organizer login successful',
            'data' => [
                'organizer' => $this->organizerPayload($organizer),
                'token' => $token,
                'token_ability' => SanctumAbility::OrganizerWeb->value,
            ],
        ]);
    }

    /**
     * Google sign-in for organizers (API-key + GIS credential).
     * Body: { id_token } and/or { access_token }. Issues organizer-web token.
     * New Google emails create an active organizer (contact/business name from Google profile).
     */
    public function googleLogin(Request $request)
    {
        $request->validate([
            'id_token' => 'nullable|string',
            'access_token' => 'nullable|string',
        ]);

        if (! $request->filled('id_token') && ! $request->filled('access_token')) {
            return $this->validationErrorResponse([
                'id_token' => ['Provide a Google id_token or access_token.'],
            ], 'Google credential required');
        }

        try {
            $google = app(GoogleTokenVerifier::class)->verify(
                $request->input('id_token'),
                $request->input('access_token'),
            );
        } catch (InvalidArgumentException $e) {
            return $this->unauthorizedResponse($e->getMessage());
        }

        $organizer = Organizer::query()->where('email', $google['email'])->first();

        if (! $organizer) {
            $name = $google['name'];
            $organizer = Organizer::create([
                'business_name' => $name,
                'contact_name' => $name,
                'email' => $google['email'],
                'phone' => null,
                'password' => Hash::make(Str::random(40)),
                'status' => OrganizerStatus::ACTIVE,
            ]);
        } elseif ($organizer->isSuspended()) {
            return response()->json([
                'success' => false,
                'message' => 'This organizer account is suspended. Contact support or wait for reactivation.',
                'errors' => [
                    'error_code' => ['organizer_suspended'],
                ],
                'status_code' => 403,
            ], 403);
        }

        $this->revokeOrganizerWebTokens($organizer);

        $token = $organizer->createToken(
            'organizer_web_token',
            [SanctumAbility::OrganizerWeb->value]
        )->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Organizer login successful',
            'data' => [
                'organizer' => $this->organizerPayload($organizer->fresh() ?? $organizer),
                'token' => $token,
                'token_ability' => SanctumAbility::OrganizerWeb->value,
            ],
        ]);
    }

    public function logout(Request $request)
    {
        $token = $request->user()?->currentAccessToken();
        if ($token) {
            $token->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
        ]);
    }

    public function me(Request $request)
    {
        $organizer = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'organizer' => $this->organizerPayload($organizer),
            ],
        ]);
    }

    /**
     * Self-service identity update. Status is not writable here.
     */
    public function updateProfile(Request $request)
    {
        /** @var Organizer $organizer */
        $organizer = $request->user();

        $validated = $request->validate([
            'business_name' => 'sometimes|required|string|max:255',
            'contact_name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:organizers,email,'.$organizer->id,
            'phone' => 'nullable|string|max:30',
        ]);

        unset($validated['password'], $validated['status']);

        $old = $organizer->getOriginal();
        $organizer->update($validated);

        activity('organizer')
            ->causedBy($organizer)
            ->performedOn($organizer)
            ->withProperties(['old' => $old, 'attributes' => $organizer->getAttributes()])
            ->event('updated')
            ->log('Organizer profile was updated');

        return $this->successResponse([
            'organizer' => $this->organizerPayload($organizer->fresh()),
        ], 'Profile updated successfully');
    }

    /**
     * Self-service password change — current_password + password confirmed.
     */
    public function changePassword(Request $request)
    {
        /** @var Organizer $organizer */
        $organizer = $request->user();

        $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if (! Hash::check($request->current_password, $organizer->password)) {
            return $this->badRequestResponse('Current password is incorrect');
        }

        $organizer->password = $request->password;
        $organizer->save();

        activity('organizer')
            ->causedBy($organizer)
            ->performedOn($organizer)
            ->event('updated')
            ->log('Organizer password was changed');

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully',
            'status_code' => 200,
        ]);
    }

    private function revokeOrganizerWebTokens(Organizer $organizer): void
    {
        $organizer->tokens()->get()->each(function ($token) {
            $abilities = $token->abilities ?? [];
            $hasAbility = in_array(SanctumAbility::OrganizerWeb->value, $abilities, true);
            $nameMatch = $token->name === 'organizer_web_token';

            if ($hasAbility || $nameMatch) {
                $token->delete();
            }
        });
    }

    private function organizerPayload(Organizer $organizer): array
    {
        return [
            'id' => $organizer->id,
            'business_name' => $organizer->business_name,
            'contact_name' => $organizer->contact_name,
            'email' => $organizer->email,
            'phone' => $organizer->phone,
            'status' => $organizer->status,
        ];
    }
}
