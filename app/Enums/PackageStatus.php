<?php

namespace App\Enums;

enum PackageStatus: string
{
    case ACTIVE = 'active';
    case ARCHIVED = 'archived';
}
