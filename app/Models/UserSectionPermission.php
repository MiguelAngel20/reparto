<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserSectionPermission extends Model
{
    protected $fillable = [
        'user_id',
        'section',
        'can_view',
        'can_edit',
        'can_create',
        'can_update',
        'can_delete',
        'can_payment',
        'can_real_deposit',
    ];

    protected function casts(): array
    {
        return [
            'can_view' => 'boolean',
            'can_edit' => 'boolean',
            'can_create' => 'boolean',
            'can_update' => 'boolean',
            'can_delete' => 'boolean',
            'can_payment' => 'boolean',
            'can_real_deposit' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
