<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\MailService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Exception;

class SendEmailJob implements ShouldQueue
{
    use Queueable, InteractsWithQueue, SerializesModels;

    public $timeout = 60;
    public $tries = 3;
    public $backoff = [10, 30, 60]; // Retry after 10s, 30s, 60s

    protected $user;
    protected $templateType;
    protected $variables;
    protected $attachments;

    /**
     * Create a new job instance.
     */
    public function __construct($user, string $templateType, array $variables = [], array $attachments = [])
    {
        $this->user = $user;
        $this->templateType = $templateType;
        $this->variables = $variables;
        $this->attachments = $attachments;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            $mailService = new MailService();

            // Configure mail settings
            if (!$mailService->configureMailSettings()) {
                throw new Exception('Mail configuration not found. Please configure mail settings first.');
            }

            // Get template configuration
            $templateConfig = $mailService->getTemplateConfig($this->templateType);

            // Determine recipient details
            if ($this->user instanceof User) {
                $recipientEmail = $this->user->email;
                $recipientName = $this->user->name;
                $this->variables['user_name'] = $this->user->name;
            } elseif (is_array($this->user) && isset($this->user['email'])) {
                $recipientEmail = $this->user['email'];
                $recipientName = $this->user['name'] ?? $this->user['email'];
                $this->variables['user_name'] = $this->user['name'] ?? 'User';
            } else {
                throw new Exception('Invalid user data provided');
            }

            // Set subject from variables if provided (for notification emails)
            $subject = $this->variables['subject'] ?? $templateConfig['subject'];

            // Send email using Blade template
            Mail::send($templateConfig['view'], $this->variables, function ($message) use ($recipientEmail, $recipientName, $subject) {
                $message->to($recipientEmail, $recipientName)
                    ->subject($subject);

                // Add attachments if provided
                foreach ($this->attachments as $attachment) {
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

            Log::info("Email sent successfully via queue", [
                'type' => $this->templateType,
                'recipient' => $recipientEmail,
                'subject' => $subject,
                'job_id' => $this->job->getJobId()
            ]);

        } catch (Exception $e) {
            Log::error("Failed to send queued email", [
                'type' => $this->templateType,
                'recipient' => is_array($this->user) ? $this->user['email'] : $this->user->email,
                'error' => $e->getMessage(),
                'job_id' => $this->job->getJobId(),
                'attempt' => $this->attempts()
            ]);

            // Re-throw the exception to trigger retry mechanism
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(Exception $exception): void
    {
        Log::error("Email job failed permanently", [
            'type' => $this->templateType,
            'recipient' => is_array($this->user) ? $this->user['email'] : $this->user->email,
            'error' => $exception->getMessage(),
            'job_id' => $this->job->getJobId()
        ]);
    }
}
