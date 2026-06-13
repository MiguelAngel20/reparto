<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeliveryOrder extends Model
{
    public const STATUS_IN_PROGRESS = 'in_progress';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_CANCELLED = 'cancelled';

    public const TYPE_SERVICE_ONLY = 'service_only';

    public const TYPE_CASH_OUT = 'cash_out';

    public const TYPE_CASH_PICKUP_PAID = 'cash_pickup_paid';

    public const TYPE_TRANSFER = 'transfer';

    public const TYPE_CASH_DEPOSIT = 'cash_deposit';

    public const PAYMENT_CASH = 'cash';

    public const PAYMENT_TRANSFER = 'transfer';

    public const PAYMENT_MIXED = 'mixed';

    protected $fillable = [
        'cash_session_id',
        'user_id',
        'name',
        'service_cost',
        'user_percentage',
        'user_commission',
        'clikio_commission',
        'user_extra',
        'order_type',
        'product_cost',
        'cash_spent',
        'cash_received',
        'clikio_extra',
        'discount',
        'client_payment_mode',
        'cash_collected',
        'transfer_discount',
        'box_adjustment',
        'started_at',
        'completed_at',
        'duration_seconds',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'service_cost' => 'decimal:2',
            'user_percentage' => 'decimal:2',
            'user_commission' => 'decimal:2',
            'clikio_commission' => 'decimal:2',
            'user_extra' => 'decimal:2',
            'product_cost' => 'decimal:2',
            'cash_spent' => 'decimal:2',
            'cash_received' => 'decimal:2',
            'clikio_extra' => 'decimal:2',
            'discount' => 'decimal:2',
            'cash_collected' => 'decimal:2',
            'transfer_discount' => 'decimal:2',
            'box_adjustment' => 'decimal:2',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function cashSession(): BelongsTo
    {
        return $this->belongsTo(CashSession::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(DeliveryOrderItem::class)->orderBy('sort_order');
    }

    public function isInProgress(): bool
    {
        return $this->status === self::STATUS_IN_PROGRESS;
    }

    public static function typeLabels(): array
    {
        return [
            self::TYPE_CASH_OUT => 'Compra en efectivo',
            self::TYPE_SERVICE_ONLY => 'Solo servicio',
        ];
    }

    public static function paymentModeLabels(): array
    {
        return [
            self::PAYMENT_CASH => 'Efectivo',
            self::PAYMENT_TRANSFER => 'Transferencia',
            self::PAYMENT_MIXED => 'Mixto',
        ];
    }

    public static function activeForUser(int $userId): ?self
    {
        return self::query()
            ->where('user_id', $userId)
            ->where('status', self::STATUS_IN_PROGRESS)
            ->latest('started_at')
            ->first();
    }

    /** @return \Illuminate\Database\Eloquent\Collection<int, self> */
    public static function activeOrdersForUser(int $userId)
    {
        return self::query()
            ->where('user_id', $userId)
            ->where('status', self::STATUS_IN_PROGRESS)
            ->orderBy('started_at')
            ->orderBy('id')
            ->get();
    }

    public static function hasActiveOrdersForUser(int $userId): bool
    {
        return self::query()
            ->where('user_id', $userId)
            ->where('status', self::STATUS_IN_PROGRESS)
            ->exists();
    }
}
