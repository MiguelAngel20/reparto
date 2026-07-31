<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashSession extends Model
{
    public const STATUS_OPEN = 'open';

    public const STATUS_CLOSED = 'closed';

    public const TYPE_LIVE = 'live';

    public const TYPE_MANUAL = 'manual';

    protected $fillable = [
        'user_id',
        'session_type',
        'capture_date',
        'initial_amount',
        'counted_amount',
        'cash_difference',
        'started_at',
        'ended_at',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'capture_date' => 'date',
            'initial_amount' => 'decimal:2',
            'counted_amount' => 'decimal:2',
            'cash_difference' => 'decimal:2',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(DeliveryOrder::class);
    }

    public function isOpen(): bool
    {
        return $this->status === self::STATUS_OPEN;
    }

    public function isManual(): bool
    {
        return $this->session_type === self::TYPE_MANUAL;
    }

    public function isLive(): bool
    {
        return $this->session_type === self::TYPE_LIVE;
    }

    /** Fecha contable de la jornada (día en que se inició). */
    public function businessDate(): string
    {
        $raw = $this->getRawOriginal('capture_date');

        if ($raw) {
            return substr((string) $raw, 0, 10);
        }

        return $this->started_at?->toDateString() ?? now()->toDateString();
    }

    /**
     * Rango de fechas en que pueden registrarse servicios propios y gastos de esta jornada.
     *
     * @return array{0: string, 1: string}
     */
    public function activityDateRange(): array
    {
        $start = $this->businessDate();

        if ($this->isOpen()) {
            return [$start, $start];
        }

        $end = $this->ended_at?->toDateString() ?? $start;

        return [$start, $end];
    }

    /**
     * Fecha contable para gastos/servicios creados mientras hay jornada en vivo abierta.
     */
    public static function activityBookingDateForUser(int $userId): string
    {
        $session = self::openLiveForUser($userId);

        if ($session !== null) {
            return $session->businessDate();
        }

        return now()->toDateString();
    }

    public function scopeLive(Builder $query): Builder
    {
        return $query->where('session_type', self::TYPE_LIVE);
    }

    public function scopeManual(Builder $query): Builder
    {
        return $query->where('session_type', self::TYPE_MANUAL);
    }

    public static function openLiveForUser(int $userId): ?self
    {
        return self::query()
            ->live()
            ->where('user_id', $userId)
            ->where('status', self::STATUS_OPEN)
            ->latest('started_at')
            ->first();
    }

    public static function openManualForUser(int $userId): ?self
    {
        return self::query()
            ->manual()
            ->where('user_id', $userId)
            ->where('status', self::STATUS_OPEN)
            ->latest('started_at')
            ->first();
    }

    /** @deprecated Use openLiveForUser() */
    public static function openForUser(int $userId): ?self
    {
        return self::openLiveForUser($userId);
    }

    /** Una sola jornada por día (manual o en vivo). */
    public static function dayRegisteredForUser(int $userId, string $date): bool
    {
        return self::sessionForUserOnDate($userId, $date) !== null;
    }

    public static function sessionForUserOnDate(int $userId, string $date): ?self
    {
        return self::query()
            ->where('user_id', $userId)
            ->where(function (Builder $query) use ($date) {
                $query->whereDate('capture_date', $date)
                    ->orWhere(fn (Builder $q) => $q->live()->whereDate('started_at', $date));
            })
            ->first();
    }

    public static function dayRegisteredLabelForUser(int $userId, string $date): ?string
    {
        $session = self::sessionForUserOnDate($userId, $date);

        if (! $session) {
            return null;
        }

        $formatted = $session->capture_date?->format('d/m/Y')
            ?? $session->started_at?->format('d/m/Y')
            ?? $date;

        if ($session->isManual()) {
            if ($session->isOpen()) {
                return "Tienes captura manual en curso del {$formatted}.";
            }

            return "Ya existe captura manual del {$formatted}.";
        }

        if ($session->isOpen()) {
            return "Ya tienes una jornada en curso del {$formatted}.";
        }

        return "Ya iniciaste jornada el {$formatted}.";
    }

    /** @deprecated Use dayRegisteredForUser() */
    public static function manualExistsForUserOnDate(int $userId, string $date): bool
    {
        return self::dayRegisteredForUser($userId, $date);
    }
}
