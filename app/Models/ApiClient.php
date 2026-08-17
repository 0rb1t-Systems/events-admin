<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;

class ApiClient extends Model
{
    protected $fillable = [
        'name',
        'public_key',
        'secret',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
        ];
    }

    public function setSecretAttribute(string $plainSecret): void
    {
        $this->attributes['secret'] = Hash::make($plainSecret);
    }

    public function matchesPlainSecret(string $plainSecret): bool
    {
        return Hash::check($plainSecret, $this->attributes['secret'] ?? '');
    }
}
