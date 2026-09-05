<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Settings;
use App\Services\CommissionSettings;
use App\Services\MailService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SettingsController extends Controller
{
    protected $mailService;

    public function __construct(MailService $mailService)
    {
        $this->mailService = $mailService;
    }

    /**
     * Get current Resend mail configuration (API key never returned in full).
     */
    public function getMailConfig(Request $request)
    {
        $mailSetting = Settings::emailMail()->first();
        $details = $mailSetting && $mailSetting->details
            ? (json_decode($mailSetting->details, true) ?: [])
            : [];

        $hasApiKey = filled($details['api_key'] ?? null);

        $config = [
            'from_name' => $details['from_name'] ?? '',
            'from_email' => $details['from_email'] ?? '',
            'api_key' => '',
            'has_api_key' => $hasApiKey,
            'configured' => (bool) ($mailSetting?->status && $hasApiKey && filled($details['from_email'] ?? null) && filled($details['from_name'] ?? null)),
        ];

        return response()->json([
            'success' => true,
            'data' => $config,
        ]);
    }

    /**
     * Update Resend mail configuration (stored in settings table, not .env).
     */
    public function updateMailConfig(Request $request)
    {
        $request->validate([
            'from_name' => 'required|string|max:255',
            'from_email' => 'required|email|max:255',
            'api_key' => 'nullable|string|max:255',
        ]);

        try {
            $existing = Settings::emailMail()->first();
            $existingDetails = $existing && $existing->details
                ? (json_decode($existing->details, true) ?: [])
                : [];

            $apiKey = trim((string) $request->input('api_key', ''));
            if ($apiKey === '') {
                $apiKey = (string) ($existingDetails['api_key'] ?? '');
            }

            if ($apiKey === '') {
                throw ValidationException::withMessages([
                    'api_key' => ['Resend API key is required.'],
                ]);
            }

            $details = [
                'api_key' => $apiKey,
                'from_name' => $request->from_name,
                'from_email' => $request->from_email,
            ];

            // Prefer updating the canonical resend row; remove legacy smtp duplicate if present
            $setting = Settings::query()->updateOrCreate(
                [
                    'setting_type' => 'email',
                    'name' => Settings::EMAIL_SETTING_NAME,
                ],
                [
                    'slug' => 'email-resend',
                    'details' => json_encode($details),
                    'status' => true,
                    'is_global' => true,
                ]
            );

            Settings::query()
                ->where('setting_type', 'email')
                ->whereRaw('LOWER(name) = ?', [Settings::EMAIL_SMTP_NAME])
                ->where('id', '!=', $setting->id)
                ->delete();

            activity('settings')
                ->causedBy($request->user())
                ->performedOn($setting)
                ->withProperties([
                    'from_email' => $details['from_email'],
                    'provider' => 'resend',
                ])
                ->event('updated')
                ->log('Mail configuration updated (Resend)');

            return response()->json([
                'success' => true,
                'message' => 'Mail configuration updated successfully',
            ]);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            throw ValidationException::withMessages([
                'config' => ['Failed to update mail configuration: '.$e->getMessage()],
            ]);
        }
    }

    /**
     * Test mail configuration by sending a test mail via Resend.
     */
    public function testMailConfig(Request $request)
    {
        $request->validate([
            'test_email' => 'required|email',
        ]);

        try {
            $user = ['email' => $request->test_email, 'name' => 'Test User'];
            $this->mailService->sendEmail($user, 'test');

            activity('settings')
                ->causedBy($request->user())
                ->withProperties(['test_email' => $request->test_email])
                ->event('updated')
                ->log('Test mail sent');

            return response()->json([
                'success' => true,
                'message' => 'Test mail sent successfully',
            ]);
        } catch (\Exception $e) {
            throw ValidationException::withMessages([
                'email' => ['Failed to send test mail: '.$e->getMessage()],
            ]);
        }
    }

    /**
     * Get platform commission rate (%).
     */
    public function getCommissionRate(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => [
                'rate' => CommissionSettings::currentRate(),
            ],
        ]);
    }

    /**
     * Update platform commission rate. Affects NEW payout requests only (snapshots).
     */
    public function updateCommissionRate(Request $request)
    {
        $request->validate([
            'rate' => 'required|numeric|min:0|max:100',
        ]);

        $previous = CommissionSettings::currentRate();
        CommissionSettings::setRate((float) $request->rate);
        $rate = CommissionSettings::currentRate();

        activity('settings')
            ->causedBy($request->user())
            ->withProperties(['previous_rate' => $previous, 'rate' => $rate])
            ->event('updated')
            ->log('Commission rate updated');

        return response()->json([
            'success' => true,
            'data' => [
                'rate' => $rate,
            ],
            'message' => 'Commission rate updated. Existing payout requests keep their snapshotted rate.',
        ]);
    }
}
