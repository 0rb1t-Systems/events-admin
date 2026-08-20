<?php

namespace Database\Seeders;

use App\Enums\DiscountCodeType;
use App\Enums\EventStatus;
use App\Enums\FormFieldType;
use App\Enums\OrganizerStatus;
use App\Enums\PackageStatus;
use App\Enums\ParticipationPaymentStatus;
use App\Enums\ParticipationStatus;
use App\Enums\PaymentStatus;
use App\Enums\PayoutRequestStatus;
use App\Enums\QrScanResult;
use App\Enums\SponsorTier;
use App\Enums\SubscriptionStatus;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\Certificate;
use App\Models\DiscountCode;
use App\Models\Event;
use App\Models\EventAnnouncement;
use App\Models\EventCategory;
use App\Models\EventFeedback;
use App\Models\EventFormField;
use App\Models\EventImage;
use App\Models\EventInvitationTemplate;
use App\Models\EventSession;
use App\Models\EventSpeaker;
use App\Models\EventSponsor;
use App\Models\InvitationSystemTemplate;
use App\Models\Organization;
use App\Models\Organizer;
use App\Models\OrganizerSubscription;
use App\Models\Package;
use App\Models\Participation;
use App\Models\Payment;
use App\Models\PayoutRequest;
use App\Models\QrScanLog;
use App\Models\TicketType;
use App\Models\User;
use App\Services\EventMonetization;
use App\Services\QrTokenService;
use App\Support\InvitationCanvas;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Idempotent demo rows so Admin + Web App catalogs are not empty.
 * Safe to re-run: keyed by emails / event titles.
 *
 * Demo passwords are all `password`.
 */
class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            EventCategorySeeder::class,
            InvitationSystemTemplateSeeder::class,
        ]);

        $this->seedOrganization();
        $packages = $this->seedPackages();
        $organizers = $this->seedOrganizers($packages);
        $participants = $this->seedParticipants();
        $this->seedEvents($organizers, $participants);

        $this->command?->info('Demo data ready. Organizer/participant login password: password');
    }

    private function seedOrganization(): void
    {
        Organization::query()->firstOrCreate(
            ['email' => 'hello@eventhub.example'],
            [
                'name' => 'EventHub',
                'founded_date' => '2024-01-15',
                'website_url' => 'https://eventhub.example',
                'phone' => '+252611000000',
                'address' => 'Makka Al Mukarama Road',
                'city' => 'Mogadishu',
                'country' => 'Somalia',
            ]
        );
    }

    /** @return array<string, Package> */
    private function seedPackages(): array
    {
        $rows = [
            'starter' => [
                'name' => 'Starter',
                'description' => 'Up to 5 events. Good for first-time organizers.',
                'price' => 29,
                'event_quota' => 5,
                'duration_value' => 1,
                'duration_unit' => 'month',
                'tier_rank' => 10,
            ],
            'pro' => [
                'name' => 'Pro',
                'description' => 'Up to 25 events with priority support.',
                'price' => 79,
                'event_quota' => 25,
                'duration_value' => 1,
                'duration_unit' => 'month',
                'tier_rank' => 20,
            ],
            'unlimited' => [
                'name' => 'Unlimited',
                'description' => 'No event cap. For busy venues and agencies.',
                'price' => 199,
                'event_quota' => null,
                'duration_value' => 1,
                'duration_unit' => 'year',
                'tier_rank' => 30,
            ],
        ];

        $out = [];
        foreach ($rows as $key => $row) {
            $out[$key] = Package::query()->updateOrCreate(
                ['name' => $row['name']],
                array_merge($row, ['status' => PackageStatus::ACTIVE])
            );
        }

        return $out;
    }

    /** @param  array<string, Package>  $packages @return array<string, Organizer> */
    private function seedOrganizers(array $packages): array
    {
        $defs = [
            'horn' => [
                'business_name' => 'Horn Events Co.',
                'contact_name' => 'Amina Hassan',
                'email' => 'horn.events@example.com',
                'phone' => '+252611111001',
                'package' => 'unlimited',
            ],
            'culture' => [
                'business_name' => 'Mogadishu Culture Hub',
                'contact_name' => 'Omar Farah',
                'email' => 'culture.hub@example.com',
                'phone' => '+252611111002',
                'package' => 'pro',
            ],
            'sahil' => [
                'business_name' => 'Sahil Sports League',
                'contact_name' => 'Hodan Ali',
                'email' => 'sahil.sports@example.com',
                'phone' => '+252611111003',
                'package' => 'starter',
            ],
        ];

        $out = [];
        foreach ($defs as $key => $def) {
            $organizer = Organizer::query()->updateOrCreate(
                ['email' => $def['email']],
                [
                    'business_name' => $def['business_name'],
                    'contact_name' => $def['contact_name'],
                    'phone' => $def['phone'],
                    'password' => Hash::make('password'),
                    'status' => OrganizerStatus::ACTIVE,
                ]
            );

            OrganizerSubscription::query()->firstOrCreate(
                [
                    'organizer_id' => $organizer->id,
                    'package_id' => $packages[$def['package']]->id,
                    'status' => SubscriptionStatus::ACTIVE,
                ],
                [
                    'started_at' => now()->subMonth(),
                    'expires_at' => now()->addYear(),
                ]
            );

            $out[$key] = $organizer;
        }

        return $out;
    }

    /** @return list<User> */
    private function seedParticipants(): array
    {
        $names = [
            ['Ayaan Mohamed', 'ayaan.mohamed@example.com'],
            ['Yusuf Abdi', 'yusuf.abdi@example.com'],
            ['Fadumo Warsame', 'fadumo.warsame@example.com'],
            ['Khadar Ismail', 'khadar.ismail@example.com'],
            ['Sahra Nur', 'sahra.nur@example.com'],
            ['Liban Ahmed', 'liban.ahmed@example.com'],
            ['Nasteho Ali', 'nasteho.ali@example.com'],
            ['Hamza Osman', 'hamza.osman@example.com'],
            ['Maryan Dualeh', 'maryan.dualeh@example.com'],
            ['Abdirahman Guled', 'abdirahman.guled@example.com'],
        ];

        $users = [];
        foreach ($names as [$name, $email]) {
            $users[] = User::query()->updateOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'password' => Hash::make('password'),
                    'user_type' => UserType::USER,
                    'status' => UserStatus::ACTIVE,
                    'email_verified_at' => now(),
                ]
            );
        }

        return $users;
    }

    /**
     * @param  array<string, Organizer>  $organizers
     * @param  list<User>  $participants
     */
    private function seedEvents(array $organizers, array $participants): void
    {
        $cat = fn (string $name) => EventCategory::query()->firstOrCreate(['name' => $name]);
        $qr = app(QrTokenService::class);

        $defs = [
            [
                'title' => 'Mogadishu Tech Summit 2026',
                'organizer' => 'horn',
                'category' => 'Conference',
                'status' => EventStatus::REGISTRATION_OPEN,
                'featured' => true,
                'city' => 'Mogadishu',
                'address' => 'Jazeera Palace Conference Hall',
                'capacity' => 400,
                'starts_at' => now()->addDays(21)->setTime(9, 0),
                'ends_at' => now()->addDays(23)->setTime(17, 0),
                'deadline' => now()->addDays(18),
                'description' => 'Three days of product, cloud, and founder talks for East African builders. Keynotes, expo booths, and hiring mixers.',
                'tickets' => [
                    ['General Admission', 25, 300],
                    ['VIP', 75, 80],
                    ['Student (free)', 0, 20],
                ],
                'speakers' => [
                    ['Amina Yusuf', 'CTO', 'Sahal Labs'],
                    ['Daniel Okello', 'Investor', 'Horn Ventures'],
                ],
                'sponsors' => [['Hormuud Telecom', SponsorTier::PLATINUM], ['WaafiPay', SponsorTier::GOLD]],
                'sessions' => ['Opening keynote', 'Payments in Somalia', 'Hiring mixer'],
                'attendee_count' => 8,
                'payout' => true,
            ],
            [
                'title' => 'Coastal Jazz Night',
                'organizer' => 'culture',
                'category' => 'Concert',
                'status' => EventStatus::PUBLISHED,
                'featured' => true,
                'city' => 'Mogadishu',
                'address' => 'Lido Beach Amphitheatre',
                'capacity' => 250,
                'starts_at' => now()->addDays(35)->setTime(19, 0),
                'ends_at' => now()->addDays(35)->setTime(23, 0),
                'deadline' => now()->addDays(34),
                'description' => 'Sunset jazz, food stalls, and a late-night DJ set on Lido Beach.',
                'tickets' => [['Beach Pass', 15, 200], ['Front Row', 40, 50]],
                'speakers' => [['Hodan Band', 'Headliner', 'Live']],
                'sponsors' => [['Coca-Cola', SponsorTier::GOLD]],
                'sessions' => ['Doors open', 'Headliner set'],
                'attendee_count' => 4,
            ],
            [
                'title' => 'Product Design Workshop',
                'organizer' => 'horn',
                'category' => 'Workshop',
                'status' => EventStatus::REGISTRATION_OPEN,
                'featured' => false,
                'city' => 'Hargeisa',
                'address' => 'Innovation Hub, 26 June District',
                'capacity' => 40,
                'starts_at' => now()->addDays(12)->setTime(10, 0),
                'ends_at' => now()->addDays(12)->setTime(16, 0),
                'deadline' => now()->addDays(10),
                'description' => 'Hands-on Figma workshop: research, wireframes, and a mini critique.',
                'tickets' => [['Workshop seat', 12, 40]],
                'speakers' => [['Leyla Jama', 'Design lead', 'Qaran Studio']],
                'sponsors' => [['Canva', SponsorTier::PARTNER]],
                'sessions' => ['Warm-up', 'Studio time', 'Critique'],
                'attendee_count' => 6,
            ],
            [
                'title' => 'Ramadan Iftar Networking',
                'organizer' => 'culture',
                'category' => 'Networking',
                'status' => EventStatus::SOLD_OUT,
                'featured' => false,
                'city' => 'Mogadishu',
                'address' => 'Peace Hotel',
                'capacity' => 60,
                'starts_at' => now()->addDays(5)->setTime(18, 30),
                'ends_at' => now()->addDays(5)->setTime(21, 30),
                'deadline' => now()->addDays(2),
                'description' => 'Community iftar for founders and operators. Sold out — waitlist only.',
                'tickets' => [['Iftar seat', 10, 60]],
                'speakers' => [['Community host', 'MC', 'Culture Hub']],
                'sponsors' => [['Local Grocers Co-op', SponsorTier::SILVER]],
                'sessions' => ['Welcome', 'Iftar'],
                'attendee_count' => 10,
                'waitlist' => 2,
            ],
            [
                'title' => 'Beach Volleyball Open',
                'organizer' => 'sahil',
                'category' => 'Sports',
                'status' => EventStatus::ONGOING,
                'featured' => false,
                'city' => 'Kismayo',
                'address' => 'Kismayo Waterfront Courts',
                'capacity' => 80,
                'starts_at' => now()->subHours(4),
                'ends_at' => now()->addHours(6),
                'deadline' => now()->subDay(),
                'description' => 'Open mixed tournament happening now. Spectators welcome on the sand.',
                'tickets' => [['Player', 8, 64], ['Spectator', 0, 16]],
                'speakers' => [['Coach Warsame', 'Referee', 'Sahil League']],
                'sponsors' => [['Sahil Water', SponsorTier::GOLD]],
                'sessions' => ['Pool play', 'Finals'],
                'attendee_count' => 7,
                'checked_in' => true,
            ],
            [
                'title' => 'Eid Festival Market',
                'organizer' => 'culture',
                'category' => 'Festival',
                'status' => EventStatus::REGISTRATION_CLOSED,
                'featured' => false,
                'city' => 'Bosaso',
                'address' => 'City Fairgrounds',
                'capacity' => 500,
                'starts_at' => now()->addDays(3)->setTime(8, 0),
                'ends_at' => now()->addDays(4)->setTime(22, 0),
                'deadline' => now()->subDay(),
                'description' => 'Vendor stalls, kids zone, and evening concert. Online registration is closed; door tickets may still be available.',
                'tickets' => [['Day pass', 5, 500]],
                'speakers' => [['Festival director', 'Host', 'Culture Hub']],
                'sponsors' => [['Bosaso Port Authority', SponsorTier::PLATINUM]],
                'sessions' => ['Market open', 'Evening concert'],
                'attendee_count' => 5,
            ],
            [
                'title' => 'Hargeisa Startup Pitch Night',
                'organizer' => 'horn',
                'category' => 'Networking',
                'status' => EventStatus::REGISTRATION_OPEN,
                'featured' => false,
                'city' => 'Hargeisa',
                'address' => 'Maansoor Hotel',
                'capacity' => 120,
                'starts_at' => now()->addDays(16)->setTime(17, 0),
                'ends_at' => now()->addDays(16)->setTime(21, 0),
                'deadline' => now()->addDays(15),
                'description' => 'Eight startups pitch to local angels. Audience votes for a people’s choice award.',
                'tickets' => [['Audience', 5, 100], ['Founder table', 20, 20]],
                'speakers' => [['Judge panel', 'Angels', 'Horn Ventures']],
                'sponsors' => [['Dahabshiil', SponsorTier::GOLD]],
                'sessions' => ['Pitches', 'Voting'],
                'attendee_count' => 5,
            ],
            [
                'title' => 'Internal Planning Session',
                'organizer' => 'horn',
                'category' => 'Workshop',
                'status' => EventStatus::DRAFT,
                'featured' => false,
                'city' => 'Mogadishu',
                'address' => 'Horn Events office',
                'capacity' => 12,
                'starts_at' => now()->addDays(40)->setTime(9, 0),
                'ends_at' => now()->addDays(40)->setTime(12, 0),
                'deadline' => now()->addDays(39),
                'description' => 'Draft internal offsite — not visible on the public catalog.',
                'tickets' => [['Staff', 0, 12]],
                'speakers' => [],
                'sponsors' => [],
                'sessions' => [],
                'attendee_count' => 0,
                'public_enrich' => false,
            ],
            [
                'title' => 'Desert Marathon (cancelled)',
                'organizer' => 'sahil',
                'category' => 'Sports',
                'status' => EventStatus::CANCELLED,
                'featured' => false,
                'city' => 'Galkayo',
                'address' => 'City Stadium',
                'capacity' => 200,
                'starts_at' => now()->addDays(8)->setTime(6, 0),
                'ends_at' => now()->addDays(8)->setTime(12, 0),
                'deadline' => now()->addDays(6),
                'description' => 'Cancelled due to weather. Kept in Admin history.',
                'tickets' => [['Runner', 20, 200]],
                'speakers' => [],
                'sponsors' => [],
                'sessions' => [],
                'attendee_count' => 0,
                'public_enrich' => false,
            ],
            [
                'title' => 'Last Year Awards Gala',
                'organizer' => 'culture',
                'category' => 'Festival',
                'status' => EventStatus::COMPLETED,
                'featured' => false,
                'city' => 'Mogadishu',
                'address' => 'National Theatre',
                'capacity' => 180,
                'starts_at' => now()->subMonths(2)->setTime(18, 0),
                'ends_at' => now()->subMonths(2)->addHours(5),
                'deadline' => now()->subMonths(2)->subDays(3),
                'description' => 'Completed awards night. Used for Admin certificates and feedback lists.',
                'tickets' => [['Gala ticket', 30, 180]],
                'speakers' => [['Host', 'Presenter', 'Culture Hub']],
                'sponsors' => [['National Bank', SponsorTier::PLATINUM]],
                'sessions' => ['Awards', 'Dinner'],
                'attendee_count' => 6,
                'checked_in' => true,
                'with_feedback' => true,
            ],
        ];

        $systemTemplate = InvitationSystemTemplate::query()->where('slug', 'modern-blue')->first();

        foreach ($defs as $def) {
            $event = $this->upsertEvent($def, $organizers, $cat($def['category']));
            $this->seedEventContent($event, $def, $systemTemplate);
            $this->seedAttendees($event, $def, $participants, $qr);

            if (! empty($def['payout'])) {
                $this->seedPayout($event);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $def
     * @param  array<string, Organizer>  $organizers
     */
    private function upsertEvent(array $def, array $organizers, EventCategory $category): Event
    {
        $organizer = $organizers[$def['organizer']];

        return Event::query()->updateOrCreate(
            ['title' => $def['title']],
            [
                'organizer_id' => $organizer->id,
                'event_category_id' => $category->id,
                'description' => $def['description'],
                'city' => $def['city'],
                'address' => $def['address'],
                'latitude' => 2.0469,
                'longitude' => 45.3182,
                'banner_path' => 'https://picsum.photos/seed/'.Str::slug($def['title']).'/1200/630',
                'featured' => $def['featured'],
                'monetized' => false,
                'status' => $def['status'],
                'capacity' => $def['capacity'],
                'registrations_count' => 0,
                'registration_deadline' => $def['deadline'],
                'starts_at' => $def['starts_at'],
                'ends_at' => $def['ends_at'],
            ]
        );
    }

    /** @param  array<string, mixed>  $def */
    private function seedEventContent(Event $event, array $def, ?InvitationSystemTemplate $systemTemplate): void
    {
        foreach ($def['tickets'] as $i => [$name, $price, $limit]) {
            TicketType::query()->firstOrCreate(
                ['event_id' => $event->id, 'name' => $name],
                [
                    'price' => $price,
                    'quantity_limit' => $limit,
                    'quantity_sold' => 0,
                    'sort_order' => $i,
                    'sales_enabled' => true,
                    // Demo only: intentionally mark the "VIP" named tier as VIP — not runtime inference.
                    'is_vip' => $name === 'VIP',
                ]
            );
        }

        EventMonetization::syncMonetized($event);

        foreach ($def['speakers'] as $i => [$name, $title, $org]) {
            EventSpeaker::query()->firstOrCreate(
                ['event_id' => $event->id, 'name' => $name],
                [
                    'title' => $title,
                    'organization' => $org,
                    'bio' => $title.' at '.$org.'.',
                    'sort_order' => $i,
                ]
            );
        }

        foreach ($def['sponsors'] as $i => [$name, $tier]) {
            EventSponsor::query()->firstOrCreate(
                ['event_id' => $event->id, 'name' => $name],
                ['tier' => $tier, 'sort_order' => $i]
            );
        }

        $firstSpeaker = $event->speakers()->orderBy('sort_order')->first();
        foreach ($def['sessions'] as $i => $title) {
            EventSession::query()->firstOrCreate(
                ['event_id' => $event->id, 'title' => $title],
                [
                    'speaker_id' => $firstSpeaker?->id,
                    'starts_at' => $event->starts_at?->copy()->addMinutes($i * 45),
                    'ends_at' => $event->starts_at?->copy()->addMinutes($i * 45 + 40),
                    'room' => 'Main hall',
                    'sort_order' => $i,
                ]
            );
        }

        EventFormField::query()->firstOrCreate(
            ['event_id' => $event->id, 'key' => 'company'],
            [
                'label' => 'Company / school',
                'type' => FormFieldType::TEXT,
                'required' => false,
                'sort_order' => 0,
                'active' => true,
            ]
        );
        EventFormField::query()->firstOrCreate(
            ['event_id' => $event->id, 'key' => 'meal'],
            [
                'label' => 'Meal preference',
                'type' => FormFieldType::SELECT,
                'options' => ['Standard', 'Vegetarian', 'None'],
                'required' => false,
                'sort_order' => 1,
                'active' => true,
            ]
        );

        DiscountCode::query()->firstOrCreate(
            ['event_id' => $event->id, 'code' => 'DEMO10'],
            [
                'organizer_id' => $event->organizer_id,
                'type' => DiscountCodeType::PERCENT,
                'value' => 10,
                'usage_limit' => 50,
                'usage_count' => 3,
                'expires_at' => now()->addMonths(2),
                'active' => true,
            ]
        );

        EventImage::query()->firstOrCreate(
            ['event_id' => $event->id, 'sort_order' => 0],
            ['path' => 'https://picsum.photos/seed/'.Str::slug($event->title).'-g1/800/500']
        );

        EventAnnouncement::query()->firstOrCreate(
            ['event_id' => $event->id, 'subject' => 'Welcome — '.$event->title],
            [
                'body' => 'Thanks for joining. Doors open 30 minutes before the start time. Bring your QR invitation.',
                'sent_at' => now()->subDay(),
            ]
        );

        if ($systemTemplate && ($def['public_enrich'] ?? true)) {
            EventInvitationTemplate::query()->updateOrCreate(
                ['event_id' => $event->id],
                [
                    'mode' => 'template',
                    'system_template_id' => $systemTemplate->id,
                    'config' => ['title' => $event->title, 'show_qr' => true],
                    'overlay_positions' => InvitationCanvas::defaultOverlayPositions(),
                    'customizations' => $systemTemplate->default_customizations,
                ]
            );
        }
    }

    /**
     * @param  array<string, mixed>  $def
     * @param  list<User>  $participants
     */
    private function seedAttendees(Event $event, array $def, array $participants, QrTokenService $qr): void
    {
        $count = (int) ($def['attendee_count'] ?? 0);
        if ($count < 1) {
            $event->update(['registrations_count' => $event->participations()->whereIn('status', ParticipationStatus::seatOccupying())->count()]);

            return;
        }

        $tickets = $event->ticketTypes()->orderBy('sort_order')->get();
        $paidTicket = $tickets->first(fn (TicketType $t) => (float) $t->price > 0) ?? $tickets->first();
        $freeTicket = $tickets->first(fn (TicketType $t) => (float) $t->price == 0);

        $checkedIn = ! empty($def['checked_in']);
        $withFeedback = ! empty($def['with_feedback']);

        foreach (array_slice($participants, 0, $count) as $i => $user) {
            $useFree = $freeTicket && $i % 4 === 0;
            $ticket = $useFree ? $freeTicket : $paidTicket;
            $isPaid = $ticket && (float) $ticket->price > 0;
            $status = $checkedIn
                ? ParticipationStatus::CHECKED_IN
                : ($isPaid ? ParticipationStatus::PAID : ParticipationStatus::JOINED);

            $participation = Participation::query()->firstOrCreate(
                [
                    'user_id' => $user->id,
                    'event_id' => $event->id,
                ],
                [
                    'ticket_type_id' => $ticket?->id,
                    'status' => $status,
                    'payment_status' => $isPaid ? ParticipationPaymentStatus::PAID : ParticipationPaymentStatus::NOT_REQUIRED,
                    'custom_field_answers' => [
                        'company' => 'Demo Co.',
                        'meal' => 'Standard',
                    ],
                ]
            );

            $qr->ensureForConfirmed($participation->fresh());

            if ($isPaid && $ticket) {
                Payment::query()->firstOrCreate(
                    ['reference_id' => 'DEMO-'.$event->id.'-'.$user->id],
                    [
                        'participation_id' => $participation->id,
                        'ticket_type_id' => $ticket->id,
                        'amount' => $ticket->price,
                        'currency' => 'USD',
                        'status' => PaymentStatus::COMPLETED,
                        'gateway' => 'waafipay',
                        'waafi_transaction_id' => 'TX-DEMO-'.$participation->id,
                        'payer_phone' => '252611'.str_pad((string) ($user->id % 1000000), 7, '0', STR_PAD_LEFT),
                        'expires_at' => null,
                    ]
                );
            }

            if ($checkedIn && $participation->qr_token) {
                QrScanLog::query()->firstOrCreate(
                    [
                        'participation_id' => $participation->id,
                        'result' => QrScanResult::VALID,
                    ],
                    [
                        'scanned_token' => $participation->qr_token,
                        'event_id' => $event->id,
                        'gate' => 'Main',
                        'scanner_organizer_id' => $event->organizer_id,
                    ]
                );

                Certificate::query()->firstOrCreate(
                    ['participation_id' => $participation->id],
                    [
                        'issued_at' => now()->subHours(2),
                        'file_url' => 'https://example.com/certificates/demo-'.$participation->id.'.pdf',
                        'verified' => true,
                    ]
                );
            }

            if ($withFeedback && $i < 4) {
                EventFeedback::query()->firstOrCreate(
                    ['participation_id' => $participation->id],
                    [
                        'rating' => 4 + ($i % 2),
                        'comment' => $i === 0 ? 'Great night — would attend again.' : 'Well organized.',
                        'hidden' => $i === 3,
                        'submitted_at' => now()->subDays(3),
                    ]
                );
            }
        }

        $waitlist = (int) ($def['waitlist'] ?? 0);
        foreach (array_slice($participants, $count, $waitlist) as $user) {
            Participation::query()->firstOrCreate(
                [
                    'user_id' => $user->id,
                    'event_id' => $event->id,
                ],
                [
                    'ticket_type_id' => $paidTicket?->id,
                    'status' => ParticipationStatus::WAITLISTED,
                    'payment_status' => ParticipationPaymentStatus::NOT_REQUIRED,
                ]
            );
        }

        $sold = $event->participations()
            ->whereIn('status', ParticipationStatus::seatOccupying())
            ->count();

        if ($event->status === EventStatus::SOLD_OUT && $event->capacity !== null) {
            $sold = max($sold, (int) $event->capacity);
        }

        $event->update(['registrations_count' => $sold]);

        foreach ($event->ticketTypes as $ticket) {
            $ticketSold = $event->participations()
                ->where('ticket_type_id', $ticket->id)
                ->whereIn('status', ParticipationStatus::seatOccupying())
                ->count();
            $ticket->update(['quantity_sold' => $ticketSold]);
        }
    }

    private function seedPayout(Event $event): void
    {
        $existing = PayoutRequest::query()->where('event_id', $event->id)->first();
        if ($existing) {
            return;
        }

        $request = new PayoutRequest([
            'organizer_id' => $event->organizer_id,
            'event_id' => $event->id,
            'requested_amount' => 120,
            'status' => PayoutRequestStatus::REQUESTED,
            'commission_rate' => 10,
        ]);
        $amounts = $request->computeAmountsFromSnapshot();
        $request->fill($amounts)->save();
    }
}
