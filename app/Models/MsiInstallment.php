<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MsiInstallment extends Model
{
    protected $fillable = [
        'msi_purchase_id',
        'number',
        'due_date',
        'amount',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'due_date' => 'date',
            'paid_at' => 'date',
        ];
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(MsiPurchase::class, 'msi_purchase_id');
    }

    public function isPaid(): bool
    {
        return $this->paid_at !== null;
    }
}
