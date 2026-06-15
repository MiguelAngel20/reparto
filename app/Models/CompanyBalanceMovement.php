<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CompanyBalanceMovement extends Model
{
    public const TYPE_BALANCE_ENTRY = 'balance_entry';

    public const TYPE_SESSION_SETTLEMENT = 'session_settlement';

    public const TYPE_LIQUIDATION = 'liquidation';

    public const TYPE_ADJUSTMENT = 'adjustment';

    protected $fillable = [
        'user_id',
        'type',
        'amount',
        'balance_after',
        'cash_session_id',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'balance_after' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cashSession(): BelongsTo
    {
        return $this->belongsTo(CashSession::class);
    }
}
