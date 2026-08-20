<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\View;
use Tests\TestCase;

class AnnouncementMailTemplateTest extends TestCase
{
    public function test_notification_template_renders_body_not_mail_message_object(): void
    {
        $html = View::make('mail.notification', [
            'subject' => 'Venue change',
            'body' => '<p>New venue is Hall B.</p>',
            'user_name' => 'Ada',
        ])->render();

        $this->assertStringContainsString('Hello Ada', $html);
        $this->assertStringContainsString('New venue is Hall B.', $html);
        $this->assertStringNotContainsString('Illuminate\\Mail\\Message', $html);
    }
}
