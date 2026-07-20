<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PersonalService extends Model
{
    public const STATUS_IN_PROGRESS = 'in_progress';

    public const STATUS_COMPLETED = 'completed';

    protected $fillable = [
        'user_id',
        'service_date',
        'status',
        'name',
        'amount',
        'spent_amount',
        'description',
        'started_at',
    ];

    protected function casts(): array
    {
        return [
            'service_date' => 'date',
            'amount' => 'decimal:2',
            'spent_amount' => 'decimal:2',
            'started_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(PersonalServiceItem::class)->orderBy('sort_order');
    }

    public function scopeCompleted(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_COMPLETED);
    }

    public function scopeInProgress(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_IN_PROGRESS);
    }

    public function isInProgress(): bool
    {
        return $this->status === self::STATUS_IN_PROGRESS;
    }

    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    public function clientCharge(): float
    {
        return round((float) ($this->spent_amount ?? 0) + (float) $this->amount, 2);
    }

    /** @return \Illuminate\Database\Eloquent\Collection<int, self> */
    public static function activeServicesForUser(int $userId)
    {
        return self::query()
            ->where('user_id', $userId)
            ->where('status', self::STATUS_IN_PROGRESS)
            ->orderBy('started_at')
            ->orderBy('id')
            ->get();
    }
}
