<?php

namespace App\Enums;

enum SanctumAbility: string
{
    /** Admin Panel SPA (Sanctum + Spatie permissions). */
    case AdminPanel = 'admin-panel';

    /** Future Web App participant sessions. Admins may also hold this token. */
    case WebParticipant = 'web-participant';

    /** Future Web App organizer sessions (never used by Admin Panel User auth). */
    case OrganizerWeb = 'organizer-web';
}
