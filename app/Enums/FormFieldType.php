<?php

namespace App\Enums;

enum FormFieldType: string
{
    case TEXT = 'text';
    case NUMBER = 'number';
    case SELECT = 'select';
    case CHECKBOX = 'checkbox';
    case DATE = 'date';

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
