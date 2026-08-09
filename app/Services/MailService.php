<?php

namespace App\Services;

use App\Models\Settings;
use App\Models\User;
use App\Jobs\SendEmailJob;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Exception;

class MailService
{
    /**
     * Configure mail settings from database
     */
    public function configureMailSettings()
    {
        $mailSetting = Settings::where('setting_type', 'email')
            ->where('name', 'smtp')
            ->where('status', true)
            ->first();

        if (!$mailSetting || !$mailSetting->details) {
            return false;
        }

        $details = json_decode($mailSetting->details, true);

        // Set mail configuration
        Config::set('mail.default', 'smtp');
        Config::set('mail.mailers.smtp', [
            'transport' => 'smtp',
            'host' => $details['host'],
            'port' => $details['port'],
            'encryption' => $details['encryption'],
            'username' => $details['username'],
            'password' => $details['password'],
            'timeout' => 60,
            'local_domain' => env('MAIL_EHLO_DOMAIN', '[127.0.0.1]'),
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true,
            'stream_context_options' => [
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                    'allow_self_signed' => true,
                    'disable_compression' => true,
                    'SNI_enabled' => true,
                    'ciphers' => 'HIGH:!SSLv2:!SSLv3',
                ],
            ],
        ]);
        Config::set('mail.from', [
            'address' => $details['from_email'],
            'name' => $details['from_name'],
        ]);

        // Clear any existing mail manager instance to ensure new config is used
        app()->forgetInstance('mail.manager');
        app()->forgetInstance('mailer');

        return true;
    }

    /**
     * Get email template view name and subject based on type
     */
    public function getTemplateConfig($templateType)
    {
        $templates = [
            'verification' => [
                'view' => 'mail.verification',
                'subject' => 'Verify Your Email Address - ' . config('app.name')
            ],
            'welcome' => [
                'view' => 'mail.welcome',
                'subject' => 'Welcome to ' . config('app.name') . '!'
            ],
            'password_reset' => [
                'view' => 'mail.password-reset',
                'subject' => 'Reset Your Password - ' . config('app.name')
            ],
            'password_reset_confirmation' => [
                'view' => 'mail.password-reset-confirmation',
                'subject' => 'Password Successfully Reset - ' . config('app.name')
            ],
            'notification' => [
                'view' => 'mail.notification',
                'subject' => null // Will be set from variables
            ],
            'test' => [
                'view' => 'mail.test',
                'subject' => 'SMTP Configuration Test - ' . config('app.name')
            ]
        ];

        if (!isset($templates[$templateType])) {
            throw new Exception("Email template type '{$templateType}' not found.");
        }

        return $templates[$templateType];
    }

    /**
     * Send email using queue (recommended for better performance)
     *
     * @param mixed $user User model or email array ['email' => '', 'name' => '']
     * @param string $templateType Email template type (verification, welcome, password_reset, notification, test)
     * @param array $variables Variables to pass to template
     * @param array $attachments Optional file attachments
     * @param int $delay Optional delay in seconds before sending
     * @return bool
     */
    public function sendEmailQueued($user, $templateType, $variables = [], $attachments = [], $delay = 0)
    {
        try {
            $job = new SendEmailJob($user, $templateType, $variables, $attachments);

            if ($delay > 0) {
                $job->delay(now()->addSeconds($delay));
            }

            dispatch($job);

            Log::info("Email queued successfully", [
                'type' => $templateType,
                'recipient' => is_array($user) ? $user['email'] : $user->email,
                'delay' => $delay
            ]);

            return true;
        } catch (Exception $e) {
            Log::error("Failed to queue email", [
                'type' => $templateType,
                'recipient' => is_array($user) ? $user['email'] : $user->email,
                'error' => $e->getMessage()
            ]);

            throw $e;
        }
    }

    /**
     * Send email using Blade template
     *
     * @param mixed $user User model or email array ['email' => '', 'name' => '']
     * @param string $templateType Email template type (verification, welcome, password_reset, notification, test)
     * @param array $variables Variables to pass to template
     * @param array $attachments Optional file attachments
     * @return bool
     */
    public function sendEmail($user, $templateType, $variables = [], $attachments = [])
    {
        try {
            // Configure mail settings
            if (!$this->configureMailSettings()) {
                throw new Exception('Mail configuration not found. Please configure mail settings first.');
            }

            // Get template configuration
            $templateConfig = $this->getTemplateConfig($templateType);

            // Determine recipient details
            if ($user instanceof User) {
                $recipientEmail = $user->email;
                $recipientName = $user->name;
                $variables['user_name'] = $user->name;
            } elseif (is_array($user) && isset($user['email'])) {
                $recipientEmail = $user['email'];
                $recipientName = $user['name'] ?? $user['email'];
                $variables['user_name'] = $user['name'] ?? 'User';
            } else {
                throw new Exception('Invalid user data provided');
            }

            // Set subject from variables if provided (for notification emails)
            $subject = $variables['subject'] ?? $templateConfig['subject'];

            // Send email using Blade template
            Mail::send($templateConfig['view'], $variables, function ($message) use ($recipientEmail, $recipientName, $subject, $attachments) {
                $message->to($recipientEmail, $recipientName)
                    ->subject($subject);

                // Add attachments if provided
                foreach ($attachments as $attachment) {
                    if (is_array($attachment)) {
                        $message->attach($attachment['path'], [
                            'as' => $attachment['name'] ?? null,
                            'mime' => $attachment['mime'] ?? null,
                        ]);
                    } else {
                        $message->attach($attachment);
                    }
                }
            });

            Log::info("Email sent successfully", [
                'type' => $templateType,
                'recipient' => $recipientEmail,
                'subject' => $subject
            ]);

            return true;
        } catch (Exception $e) {
            Log::error("Failed to send email", [
                'type' => $templateType,
                'recipient' => is_array($user) ? $user['email'] : $user->email,
                'error' => $e->getMessage()
            ]);

            throw $e;
        }
    }

    /**
     * Get available template types
     */
    public function getAvailableTemplateTypes()
    {
        return [
            'verification' => 'Email Verification',
            'welcome' => 'Welcome Email',
            'password_reset' => 'Password Reset',
            'password_reset_confirmation' => 'Password Reset Confirmation',
            'notification' => 'General Notification',
            'test' => 'SMTP Test Email',
        ];
    }
}
