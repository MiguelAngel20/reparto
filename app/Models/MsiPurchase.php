<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MsiPurchase extends Model
{
    public const STATUS_ACTIVE = 'active';

    public const STATUS_PAID = 'paid';

    protected $fillable = [
        'msi_account_id',
        'user_id',
        'name',
        'original_amount',
        'months_total',
        'monthly_amount',
        'first_due_date',
        'debt_start_date',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'original_amount' => 'decimal:2',
            'monthly_amount' => 'decimal:2',
            'first_due_date' => 'date',
            'debt_start_date' => 'date',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(MsiAccount::class, 'msi_account_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function installments(): HasMany
    {
        return $this->hasMany(MsiInstallment::class)->orderBy('number');
    }
}
