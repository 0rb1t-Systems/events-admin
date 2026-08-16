<?php

namespace App\Http\Controllers\Api;

use App\Enums\SanctumAbility;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\MailService;
use App\Services\LocationService;
use App\Traits\ApiResponseTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    use ApiResponseTrait;

    protected $mailService;
    protected $locationService;

    public function __construct(MailService $mailService, LocationService $locationService)
    {
        $this->mailService = $mailService;
        $this->locationService = $locationService;
    }

    /**
     * Register a new user
     */
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $ip = $request->ip();
        $locationData = $this->locationService->getLocationData($ip);

        $emailVerificationCode = str_pad(random_int(1000, 9999), 4, '0', STR_PAD_LEFT);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'email_verification_code' => $emailVerificationCode,
            'email_verification_expires_at' => now()->addMinutes(30),
            'status' => UserStatus::INACTIVE, // User is inactive until email is verified
            'user_type' => UserType::USER, // Public registration creates participants
        ]);

        // Log user registration
        $this->logAuthActivity([
            'user' => $user,
            'request' => $request,
            'locationData' => $locationData,
            'event' => 'register',
            'message' => 'User registered',
        ]);

        // Send verification email using MailService (queued)
        try {
            $this->mailService->sendEmailQueued($user, 'verification', [
                'verification_code' => $emailVerificationCode
            ]);
        } catch (\Exception $e) {
            // Log the error but don't fail registration
            Log::error('Failed to queue verification email: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'User registered successfully. Please check your email to verify your account.',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'status' => $user->status,
                ]
            ]
        ], 201);
    }

    /**
     * Web / participant login — issues a web-participant scoped token.
     * Allowed for user_type=user and user_type=admin (admins may also use the Web App).
     * Does not revoke admin-panel tokens.
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $ip = $request->ip();
        $locationData = $this->locationService->getLocationData($ip);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            // Log failed login attempt
            $this->logAuthActivity([
                'user' => null,
                'request' => $request,
                'locationData' => $locationData,
                'event' => 'login',
                'message' => 'Failed login attempt',
                'extra' => [
                    'email' => $request->email,
                ]
            ]);

            return $this->unauthorizedResponse('Invalid credentials');
        }

        if ($user->status === UserStatus::INACTIVE) {
            // Log failed login attempt for inactive user
            $this->logAuthActivity([
                'user' => null,
                'request' => $request,
                'locationData' => $locationData,
                'event' => 'login',
                'message' => 'Failed login attempt',
                'extra' => [
                    'email' => $request->email,
                    'reason' => 'Inactive user',
                ]
            ]);

            return $this->forbiddenResponse('Please verify your email address before logging in.');
        }

        // Revoke only prior web-participant tokens (keep admin-panel tokens intact)
        $this->revokeTokensWithAbility($user, SanctumAbility::WebParticipant);

        $token = $user->createToken(
            'web_participant_token',
            [SanctumAbility::WebParticipant->value]
        )->plainTextToken;

        // Log successful login
        $this->logAuthActivity([
            'user' => $user,
            'request' => $request,
            'locationData' => $locationData,
            'event' => 'login',
            'message' => 'User logged in (web-participant)',
            'extra' => [
                'token_ability' => SanctumAbility::WebParticipant->value,
            ]
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'status' => $user->status,
                    'user_type' => $user->user_type,
                    'phone' => $user->phone,
                    'address' => $user->address,
                    'profile_image' => $user->profile_image,
                ],
                'token' => $token,
                'token_ability' => SanctumAbility::WebParticipant->value,
            ]
        ]);
    }

    /**
     * Admin login - only for users with user_type 'admin'.
     * Issues admin-panel scoped token. Does not revoke web-participant tokens.
     */
    public function adminLogin(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $ip = $request->ip();
        $locationData = $this->locationService->getLocationData($ip);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            // Log failed admin login attempt
            $this->logAuthActivity([
                'user' => null,
                'request' => $request,
                'locationData' => $locationData,
                'event' => 'admin_login',
                'message' => 'Failed admin login attempt',
                'extra' => [
                    'email' => $request->email,
                    'type' => 'admin',
                ]
            ]);

            return $this->unauthorizedResponse('Invalid credentials');
        }

        // Participant accounts cannot obtain admin-panel tokens
        if ($user->user_type !== UserType::ADMIN) {
            $this->logAuthActivity([
                'user' => $user,
                'request' => $request,
                'locationData' => $locationData,
                'event' => 'admin_login',
                'message' => 'Failed admin login attempt',
                'extra' => [
                    'email' => $request->email,
                    'type' => 'admin',
                    'reason' => 'participant_blocked_from_admin_panel',
                    'user_type' => $user->user_type?->value ?? (string) $user->user_type,
                ]
            ]);

            return response()->json([
                'success' => false,
                'message' => 'This account cannot access the Admin Panel. Participant accounts must use the Web App login.',
                'errors' => [
                    'error_code' => ['participant_admin_login_forbidden'],
                    'permission' => ['This account cannot access the Admin Panel. Participant accounts must use the Web App login.'],
                ],
                'status_code' => 403,
            ], 403);
        }

        if ($user->status === UserStatus::INACTIVE) {
            // Log failed admin login attempt for inactive user
            $this->logAuthActivity([
                'user' => null,
                'request' => $request,
                'locationData' => $locationData,
                'event' => 'admin_login',
                'message' => 'Failed admin login attempt',
                'extra' => [
                    'email' => $request->email,
                    'type' => 'admin',
                    'reason' => 'Inactive user',
                ]
            ]);

            return $this->forbiddenResponse('Please verify your email address before logging in.');
        }

        // Revoke only prior admin-panel tokens (keep web-participant tokens intact)
        $this->revokeTokensWithAbility($user, SanctumAbility::AdminPanel);

        $token = $user->createToken(
            'admin_auth_token',
            [SanctumAbility::AdminPanel->value]
        )->plainTextToken;

        // Load roles and permissions relationships
        $user->load(['roles']);

        // Log successful admin login
        $this->logAuthActivity([
            'user' => $user,
            'request' => $request,
            'locationData' => $locationData,
            'event' => 'admin_login',
            'message' => 'Admin logged in',
            'extra' => [
                'type' => 'admin',
                'token_ability' => SanctumAbility::AdminPanel->value,
            ]
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Admin login successful',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'status' => $user->status,
                    'user_type' => $user->user_type,
                    'phone' => $user->phone,
                    'address' => $user->address,
                    'profile_image' => $user->profile_image,
                    'roles' => $user->roles->makeHidden('permissions'),
                    'permissions' => $user->getAllPermissions(),
                ],
                'token' => $token,
                'token_ability' => SanctumAbility::AdminPanel->value,
            ]
        ]);
    }

    /**
     * Verify email address
     */
    public function verify(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
            'verification_code' => 'required|string|size:4',
        ]);

        $ip = $request->ip();
        $locationData = $this->locationService->getLocationData($ip);

        $user = User::where('email', $request->email)
            ->where('email_verification_code', $request->verification_code)
            ->first();

        if (!$user) {
            // Log failed email verification
            $this->logAuthActivity([
                'user' => null,
                'request' => $request,
                'locationData' => $locationData,
                'event' => 'verify',
                'message' => 'Failed email verification',
                'extra' => [
                    'email' => $request->email,
                    'reason' => 'Invalid verification code',
                ]
            ]);

            return $this->errorResponse('Invalid verification code or email', [
                'verification_code' => ['Invalid verification code or email']
            ], 400);
        }

        // Check if verification code has expired
        if ($user->email_verification_expires_at && now()->isAfter($user->email_verification_expires_at)) {
            // Log failed email verification due to expired code
            $this->logAuthActivity([
                'user' => null,
                'request' => $request,
                'locationData' => $locationData,
                'event' => 'verify',
                'message' => 'Failed email verification',
                'extra' => [
                    'email' => $request->email,
                    'reason' => 'Expired verification code',
                ]
            ]);

            return $this->errorResponse('Verification code has expired', [
                'verification_code' => ['Verification code has expired. Please request a new one.']
            ], 400);
        }

        $user->update([
            'email_verified_at' => now(),
            'email_verification_code' => null,
            'email_verification_expires_at' => null,
            'status' => UserStatus::ACTIVE,
        ]);

        // Log successful email verification
        $this->logAuthActivity([
            'user' => $user,
            'request' => $request,
            'locationData' => $locationData,
            'event' => 'verify',
            'message' => 'Email verified',
        ]);

        // Send welcome email (queued)
        try {
            $this->mailService->sendEmailQueued($user, 'welcome', []);
        } catch (\Exception $e) {
            // Log the error but don't fail verification
            Log::error('Failed to queue welcome email: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Email verified successfully',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'status' => $user->status,
                ]
            ]
        ]);
    }

    /**
     * Resend verification code
     */
    public function resendVerification(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
        ]);

        $ip = $request->ip();
        $locationData = $this->locationService->getLocationData($ip);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return $this->notFoundResponse('User not found');
        }

        if ($user->email_verified_at) {
            return $this->errorResponse('Email is already verified', [
                'email' => ['Email is already verified']
            ], 400);
        }

        $emailVerificationCode = str_pad(random_int(1000, 9999), 4, '0', STR_PAD_LEFT);

        $user->update([
            'email_verification_code' => $emailVerificationCode,
            'email_verification_expires_at' => now()->addMinutes(30),
        ]);

        // Log verification code resend
        $this->logAuthActivity([
            'user' => $user,
            'request' => $request,
            'locationData' => $locationData,
            'event' => 'resend_verification',
            'message' => 'Verification code resent',
        ]);

        // Send verification email using MailService (queued)
        try {
            $this->mailService->sendEmailQueued($user, 'verification', [
                'verification_code' => $emailVerificationCode
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to queue verification email: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Verification code sent successfully. Please check your email.',
        ]);
    }

    /**
     * Send password reset code
     */
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
        ]);

        $ip = $request->ip();
        $locationData = $this->locationService->getLocationData($ip);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            // Log failed password reset request
            $this->logAuthActivity([
                'user' => null,
                'request' => $request,
                'locationData' => $locationData,
                'event' => 'forgot_password',
                'message' => 'Failed password reset request',
                'extra' => [
                    'email' => $request->email,
                    'reason' => 'User not found',
                ]
            ]);

            return $this->notFoundResponse('Invalid email address');
        }

        $resetCode = str_pad(random_int(1000, 9999), 4, '0', STR_PAD_LEFT);

        $user->update([
            'reset_code' => $resetCode,
        ]);

        // Log password reset request
        $this->logAuthActivity([
            'user' => $user,
            'request' => $request,
            'locationData' => $locationData,
            'event' => 'forgot_password',
            'message' => 'Password reset requested',
        ]);

        // Send password reset email using MailService (queued)
        try {
            $this->mailService->sendEmailQueued($user, 'password_reset', [
                'reset_code' => $resetCode
            ]);
            $message = 'Password reset code sent successfully. Please check your email.';
        } catch (\Exception $e) {
            Log::error('Failed to queue password reset email: ' . $e->getMessage());
            $message = 'Password reset code generated, but failed to queue email. Please check your email configuration.';
        }

        return response()->json([
            'success' => true,
            'message' => $message,
        ]);
    }

    /**
     * Reset password using reset code
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
            'reset_code' => 'required|string|size:4',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $ip = $request->ip();
        $locationData = $this->locationService->getLocationData($ip);

        $user = User::where('email', $request->email)
            ->where('reset_code', $request->reset_code)
            ->first();

        if (!$user) {
            // Log failed password reset
            $this->logAuthActivity([
                'user' => null,
                'request' => $request,
                'locationData' => $locationData,
                'event' => 'reset_password',
                'message' => 'Failed password reset',
                'extra' => [
                    'email' => $request->email,
                    'reason' => 'Invalid reset code',
                ]
            ]);

            return $this->errorResponse('Invalid reset code or email', [
                'reset_code' => ['Invalid reset code or email']
            ], 400);
        }

        $user->update([
            'password' => Hash::make($request->password),
            'reset_code' => null,
        ]);

        // Revoke all existing tokens for this user
        $user->tokens()->delete();

        // Log successful password reset
        $this->logAuthActivity([
            'user' => $user,
            'request' => $request,
            'locationData' => $locationData,
            'event' => 'reset_password',
            'message' => 'Password reset successfully',
        ]);

        // Send password reset confirmation email (queued)
        try {
            $this->mailService->sendEmailQueued($user, 'password_reset_confirmation', []);
        } catch (\Exception $e) {
            // Log the error but don't fail password reset
            Log::error('Failed to queue password reset confirmation email: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Password reset successfully',
        ]);
    }

    /**
     * Logout user (revoke token)
     */
    public function logout(Request $request)
    {
        $user = $request->user();
        $ip = $request->ip();
        $locationData = $this->locationService->getLocationData($ip);

        // Log logout
        $this->logAuthActivity([
            'user' => $user,
            'request' => $request,
            'locationData' => $locationData,
            'event' => 'logout',
            'message' => 'User logged out',
        ]);

        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully'
        ]);
    }

    /**
     * Get authenticated user
     */
    public function me(Request $request)
    {
        $user = $request->user();

        // Load roles and permissions relationships
        $user->load(['roles']);

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'status' => $user->status,
                    'user_type' => $user->user_type,
                    'phone' => $user->phone,
                    'address' => $user->address,
                    'profile_image' => $user->profile_image,
                    'email_verified_at' => $user->email_verified_at,
                    'roles' => $user->roles->makeHidden('permissions'),
                    'permissions' => $user->getAllPermissions(),
                ]
            ]
        ]);
    }

    /**
     * Update authenticated user's profile info
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
        ]);
        $user->update($validated);
        return response()->json(['success' => true, 'user' => $user]);
    }

    /**
     * Update authenticated user's profile picture
     */
    public function updateProfilePicture(Request $request)
    {
        $user = $request->user();
        $request->validate([
            'profile_image' => 'required|image|max:2048',
        ]);

        // Store directly in public/upload/profile_images directory
        $uploadPath = 'upload/profile_images';
        $fullPath = public_path($uploadPath);

        // Create directory if it doesn't exist
        if (!file_exists($fullPath)) {
            mkdir($fullPath, 0755, true);
        }

        // Generate unique filename
        $filename = $user->id . '.' . $request->file('profile_image')->getClientOriginalExtension();
        $filePath = $uploadPath . '/' . $filename;

        // Move uploaded file to public directory
        $request->file('profile_image')->move($fullPath, $filename);

        $user->profile_image = '/' . $filePath;
        $user->save();

        return response()->json(['success' => true, 'profile_image' => $user->profile_image]);
    }

    /**
     * Change authenticated user's password
     */
    public function changePassword(Request $request)
    {
        $user = $request->user();
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);
        if (!Hash::check($request->current_password, $user->password)) {
            return $this->badRequestResponse('Current password is incorrect');
        }
        $user->password = Hash::make($request->new_password);
        $user->save();
        return response()->json(['success' => true, 'message' => 'Password changed successfully']);
    }

    /**
     * Lock user session (requires password verification)
     */
    public function lock(Request $request)
    {
        $request->validate([
            'password' => 'required|string',
        ]);

        $user = $request->user();
        $ip = $request->ip();
        $locationData = $this->locationService->getLocationData($ip);

        // Verify password before locking
        if (!Hash::check($request->password, $user->password)) {
            // Log failed lock attempt
            $this->logAuthActivity([
                'user' => $user,
                'request' => $request,
                'locationData' => $locationData,
                'event' => 'lock_attempt',
                'message' => 'Failed lock attempt - invalid password',
            ]);

            return $this->unauthorizedResponse('Invalid password');
        }

        // Store lock state in user's current token metadata (preserve existing scope abilities).
        // Note: 'locked' is a session flag on the token, NOT a SanctumAbility login scope.
        $token = $request->user()->currentAccessToken();
        $abilities = $token->abilities ?? [];
        if (! in_array('locked', $abilities, true)) {
            $abilities[] = 'locked';
        }
        $token->update([
            'abilities' => array_values($abilities),
            'updated_at' => now(),
        ]);

        // Log successful lock
        $this->logAuthActivity([
            'user' => $user,
            'request' => $request,
            'locationData' => $locationData,
            'event' => 'lock',
            'message' => 'User session locked',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Session locked successfully',
            'data' => [
                'locked_at' => now()->timestamp,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'profile_image' => $user->profile_image,
                ]
            ]
        ]);
    }

    /**
     * Unlock user session
     */
    public function unlock(Request $request)
    {
        $request->validate([
            'password' => 'required|string',
        ]);

        $user = $request->user();
        $ip = $request->ip();
        $locationData = $this->locationService->getLocationData($ip);

        // Verify password
        if (!Hash::check($request->password, $user->password)) {
            // Log failed unlock attempt
            $this->logAuthActivity([
                'user' => $user,
                'request' => $request,
                'locationData' => $locationData,
                'event' => 'unlock_attempt',
                'message' => 'Failed unlock attempt - invalid password',
            ]);

            return $this->unauthorizedResponse('Invalid password');
        }

        // Remove lock state from user's current token (preserve admin-panel / web-participant)
        $token = $request->user()->currentAccessToken();
        $abilities = array_values(array_filter($token->abilities ?? [], function ($ability) {
            return $ability !== 'locked';
        }));
        $token->update([
            'abilities' => $abilities,
            'updated_at' => now(),
        ]);

        // Log successful unlock
        $this->logAuthActivity([
            'user' => $user,
            'request' => $request,
            'locationData' => $locationData,
            'event' => 'unlock',
            'message' => 'User session unlocked',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Session unlocked successfully',
        ]);
    }

    /**
     * Check if user session is locked
     */
    public function checkLock(Request $request)
    {
        $user = $request->user();
        $token = $request->user()->currentAccessToken();

        $isLocked = in_array('locked', $token->abilities ?? [], true);

        return response()->json([
            'success' => true,
            'data' => [
                'is_locked' => $isLocked,
                'locked_at' => $isLocked ? $token->updated_at->timestamp : null,
                'user' => $isLocked ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'profile_image' => $user->profile_image,
                ] : null
            ]
        ]);
    }


    /**
     * Revoke only tokens for the given scope so admin-panel and web-participant can coexist.
     * Matches by ability and known token names; on admin login also retires legacy "*" tokens.
     */
    private function revokeTokensWithAbility(User $user, SanctumAbility $ability): void
    {
        $scopeNames = match ($ability) {
            SanctumAbility::AdminPanel => ['admin_auth_token'],
            SanctumAbility::WebParticipant => ['web_participant_token', 'auth_token'],
            default => [],
        };

        $user->tokens()->get()->each(function ($token) use ($ability, $scopeNames) {
            $abilities = $token->abilities ?? [];
            $hasAbility = in_array($ability->value, $abilities, true);
            $nameMatch = in_array($token->name, $scopeNames, true);
            $retireLegacyWildcardOnAdminLogin = $ability === SanctumAbility::AdminPanel
                && in_array('*', $abilities, true);

            if ($hasAbility || $nameMatch || $retireLegacyWildcardOnAdminLogin) {
                $token->delete();
            }
        });
    }

    /**
     * Helper to log authentication activities
     */
    private function logAuthActivity(array $params)
    {
        $user = $params['user'] ?? null;
        $request = $params['request'];
        $locationData = $params['locationData'];
        $event = $params['event'];
        $message = $params['message'];
        $extra = $params['extra'] ?? [];

        $properties = array_merge([
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'country' => $locationData['country'],
            'city' => $locationData['city'],
            'address' => $locationData['address'],
            'latitude' => $locationData['latitude'],
            'longitude' => $locationData['longitude'],
            'event' => $event,
            'subject_type' => \App\Models\User::class,
        ], $extra);

        if ($user) {
            $properties['user_id'] = $user->id;
            $properties['email'] = $user->email;
            activity('auth')
                ->causedBy($user)
                ->withProperties($properties)
                ->log($message);
        } else {
            activity('auth')
                ->withProperties($properties)
                ->log($message);
        }
    }
}
