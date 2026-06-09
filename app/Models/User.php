<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable([
    'name',
    'email',
    'password',
    'company_name',
    'percentage',
    'role',
    'email_verified_at',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public const ROLE_ADMIN = 'admin';

    public const ROLE_REPARTIDOR = 'repartidor';

    public const ROLE_USER = 'user';

    public const DEFAULT_COMPANY_NAME = 'Clikio';

    public const DEFAULT_REPARTIDOR_PERCENTAGE = 66.70;

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isRepartidor(): bool
    {
        return $this->role === self::ROLE_REPARTIDOR;
    }

    public static function roleLabel(?string $role): string
    {
        return match ($role) {
            self::ROLE_ADMIN => 'Administrador',
            self::ROLE_REPARTIDOR => 'Repartidor',
            default => ucfirst((string) $role),
        };
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'percentage' => 'decimal:2',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
