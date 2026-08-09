<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Settings;
use App\Services\MailService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class SettingsController extends Controller
{
    protected $mailService;

    public function __construct(MailService $mailService)
    {
        $this->mailService = $mailService;
    }

    /**
     * Get current mail configuration
     */
    public function getMailConfig(Request $request)
    {
        $mailSetting = Settings::where('setting_type', 'email')
            ->where('name', 'smtp')
            ->first();

        if (!$mailSetting || !$mailSetting->details) {
            $config = [
                'from_name' => '',
                'from_email' => '',
                'host' => '',
                'port' => 587,
                'encryption' => 'tls',
                'username' => '',
                'password' => '',
            ];
        } else {
            $details = json_decode($mailSetting->details, true);
            $config = [
                'from_name' => $details['from_name'] ?? '',
                'from_email' => $details['from_email'] ?? '',
                'host' => $details['host'] ?? '',
                'port' => $details['port'] ?? 587,
                'encryption' => $details['encryption'] ?? 'tls',
                'username' => $credentials['username'] ?? '',
                'password' => $credentials['password'] ?? '',
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $config
        ]);
    }

    /**
     * Update mail configuration
     */
    public function updateMailConfig(Request $request)
    {
        $request->validate([
            'from_name' => 'required|string|max:255',
            'from_email' => 'required|email|max:255',
            'host' => 'required|string|max:255',
            'port' => 'required|integer|min:1|max:65535',
            'encryption' => 'required|string|in:tls,ssl,none',
            'username' => 'required|string|max:255',
            'password' => 'required|string|max:255',
        ]);

        try {
            $details = [
                'from_name' => $request->from_name,
                'from_email' => $request->from_email,
                'host' => $request->host,
                'port' => $request->port,
                'encryption' => $request->encryption,
                'username' => $request->username,
                'password' => $request->password,
            ];

            Settings::updateOrCreate(
                [
                    'setting_type' => 'email',
                    'name' => 'smtp'
                ],
                [
                    'slug' => 'email-smtp',
                    'details' => json_encode($details),
                    'status' => true,
                    'is_global' => true,
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Mail configuration updated successfully'
            ]);
        } catch (\Exception $e) {
            throw ValidationException::withMessages([
                'config' => ['Failed to update mail configuration: ' . $e->getMessage()]
            ]);
        }
    }

    /**
     * Test mail configuration by sending a test mail
     */
    public function testMailConfig(Request $request)
    {
        $request->validate([
            'test_email' => 'required|email'
        ]);

        try {
            $user = ['email' => $request->test_email, 'name' => 'Test User'];
            $this->mailService->sendEmail($user, 'test');

            return response()->json([
                'success' => true,
                'message' => 'Test mail sent successfully'
            ]);
        } catch (\Exception $e) {
            throw ValidationException::withMessages([
                'email' => ['Failed to send test mail: ' . $e->getMessage()]
            ]);
        }
    }
}
