<?php

namespace Tests\Feature;

use App\Models\Settings;
use Database\Seeders\SettingsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MailSettingsLookupTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeded_mail_setting_uses_resend_name_and_stays_inactive(): void
    {
        $this->seed(SettingsSeeder::class);

        $setting = Settings::emailMail()->first();

        $this->assertNotNull($setting);
        $this->assertSame('resend', strtolower($setting->name));
        $this->assertSame('email-resend', $setting->slug);
        $this->assertFalse((bool) $setting->status);
        $this->assertNull($setting->details);
    }

    public function test_email_mail_scope_matches_legacy_smtp_name(): void
    {
        Settings::query()->create([
            'setting_type' => 'email',
            'name' => 'SMTP',
            'slug' => 'legacy-smtp',
            'details' => null,
            'status' => false,
            'is_global' => false,
        ]);

        $this->assertNotNull(Settings::emailMail()->where('slug', 'legacy-smtp')->first());
        $this->assertNotNull(Settings::emailSmtp()->where('slug', 'legacy-smtp')->first());
    }
}
