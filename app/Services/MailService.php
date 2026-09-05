<?php

namespace App\Services;

use App\Jobs\SendEmailJob;
use App\Models\Settings;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class MailService
{
    /**
     * Configure mail from Admin Settings → Mail (Resend).
     * Credentials live in the settings table — not .env.
     */
    public function configureMailSettings(): bool
    {
        $mailSetting = Settings::emailMail()
            ->where('status', true)
            ->first();

        if (! $mailSetting || ! $mailSetting->details) {
            return false;
        }

        $details = json_decode($mailSetting->details, true);
        if (! is_array($details)) {
            return false;
        }

        $apiKey = trim((string) ($details['api_key'] ?? ''));
        $fromEmail = trim((string) ($details['from_email'] ?? ''));
        $fromName = trim((string) ($details['from_name'] ?? ''));

        if ($apiKey === '' || $fromEmail === '' || $fromName === '') {
            return false;
        }

        Config::set('services.resend.key', $apiKey);
        Config::set('mail.default', 'resend');
        Config::set('mail.from', [
            'address' => $fromEmail,
            'name' => $fromName,
        ]);

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
                'subject' => 'Verify Your Email Address - '.config('app.name'),
            ],
            'welcome' => [
                'view' => 'mail.welcome',
                'subject' => 'Welcome to '.config('app.name').'!',
            ],
            'password_reset' => [
                'view' => 'mail.password-reset',
                'subject' => 'Reset Your Password - '.config('app.name'),
            ],
            'password_reset_confirmation' => [
                'view' => 'mail.password-reset-confirmation',
                'subject' => 'Password Successfully Reset - '.config('app.name'),
            ],
            'notification' => [
                'view' => 'mail.notification',
                'subject' => null,
            ],
            'test' => [
                'view' => 'mail.test',
                'subject' => 'Resend Mail Configuration Test - '.config('app.name'),
            ],
        ];

        if (! isset($templates[$templateType])) {
            throw new Exception("Email template type '{$templateType}' not found.");
        }

        return $templates[$templateType];
    }

    /**
     * Send email using queue (recommended for better performance)
     *
     * @param  mixed  $user  User model or email array ['email' => '', 'name' => '']
     * @param  string  $templateType  Email template type
     * @param  array  $variables  Variables to pass to template
     * @param  array  $attachments  Optional file attachments
     * @param  int  $delay  Optional delay in seconds before sending
     */
    public function sendEmailQueued($user, $templateType, $variables = [], $attachments = [], $delay = 0)
    {
        try {
            $job = new SendEmailJob($user, $templateType, $variables, $attachments);

            if ($delay > 0) {
                $job->delay(now()->addSeconds($delay));
            }

            dispatch($job);

            Log::info('Email queued successfully', [
                'type' => $templateType,
                'recipient' => is_array($user) ? $user['email'] : $user->email,
                'delay' => $delay,
            ]);

            return true;
        } catch (Exception $e) {
            Log::error('Failed to queue email', [
                'type' => $templateType,
                'recipient' => is_array($user) ? $user['email'] : $user->email,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Send email using Blade template
     *
     * @param  mixed  $user  User model or email array ['email' => '', 'name' => '']
     * @param  string  $templateType  Email template type
     * @param  array  $variables  Variables to pass to template
     * @param  array  $attachments  Optional file attachments
     */
    public function sendEmail($user, $templateType, $variables = [], $attachments = [])
    {
        try {
            if (! $this->configureMailSettings()) {
                throw new Exception('Mail configuration not found. Please configure Resend in Settings → Mail first.');
            }

            $templateConfig = $this->getTemplateConfig($templateType);

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

            $subject = $variables['subject'] ?? $templateConfig['subject'];

            Mail::send($templateConfig['view'], $variables, function ($message) use ($recipientEmail, $recipientName, $subject, $attachments) {
                $message->to($recipientEmail, $recipientName)
                    ->subject($subject);

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

            Log::info('Email sent successfully', [
                'type' => $templateType,
                'recipient' => $recipientEmail,
                'subject' => $subject,
            ]);

            return true;
        } catch (Exception $e) {
            Log::error('Failed to send email', [
                'type' => $templateType,
                'recipient' => is_array($user) ? $user['email'] : $user->email,
                'error' => $e->getMessage(),
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
            'test' => 'Resend Test Email',
        ];
    }
}
