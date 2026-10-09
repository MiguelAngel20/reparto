<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DebtorMovement extends Model
{
    public const TYPE_DEBT = 'debt';

    public const TYPE_PAYMENT = 'payment';

    public const TYPE_SETTLEMENT = 'settlement';

    protected $fillable = [
        'debtor_id',
        'user_id',
        'type',
        'name',
        'amount',
        'movement_date',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'movement_date' => 'date',
        ];
    }

    public function debtor(): BelongsTo
    {
        return $this->belongsTo(Debtor::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isDebt(): bool
    {
        return $this->type === self::TYPE_DEBT;
    }

    public function reducesBalance(): bool
    {
        return in_array($this->type, [self::TYPE_PAYMENT, self::TYPE_SETTLEMENT], true);
    }

    /**
     * @return array<string, string>
     */
    public static function typeLabels(): array
    {
        return [
            self::TYPE_DEBT => 'Deuda',
            self::TYPE_PAYMENT => 'Abono',
            self::TYPE_SETTLEMENT => 'Liquidación',
        ];
    }
}
