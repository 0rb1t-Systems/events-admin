<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

class StartQueueWorker extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'queue:start {--timeout=60 : The number of seconds a child process can run} {--memory=128 : The memory limit in megabytes} {--sleep=3 : Number of seconds to sleep when no job is available}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Start the queue worker to process email jobs';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $timeout = $this->option('timeout');
        $memory = $this->option('memory');
        $sleep = $this->option('sleep');

        $this->info('Starting queue worker for email processing...');
        $this->info("Configuration: timeout={$timeout}s, memory={$memory}MB, sleep={$sleep}s");
        $this->newLine();

        // Start the queue worker
        Artisan::call('queue:work', [
            '--queue' => 'default',
            '--timeout' => $timeout,
            '--memory' => $memory,
            '--sleep' => $sleep,
            '--tries' => 3,
            '--max-jobs' => 1000,
            '--max-time' => 3600, // 1 hour
            '--verbose' => true,
        ]);

        $this->info('Queue worker stopped.');
    }
}
