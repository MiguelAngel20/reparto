<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CardAccountMovement extends Model
{
    public const TYPE_PURCHASE = 'purchase';

    public const TYPE_PAYMENT = 'payment';

    protected $fillable = [
        'card_account_id',
        'user_id',
        'type',
        'name',
        'amount',
        'description',
        'movement_date',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'movement_date' => 'date',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(CardAccount::class, 'card_account_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isPurchase(): bool
    {
        return $this->type === self::TYPE_PURCHASE;
    }

    public function isPayment(): bool
    {
        return $this->type === self::TYPE_PAYMENT;
    }

    /**
     * @return array<string, string>
     */
    public static function typeLabels(): array
    {
        return [
            self::TYPE_PURCHASE => 'Compra',
            self::TYPE_PAYMENT => 'Abono',
        ];
    }
}
