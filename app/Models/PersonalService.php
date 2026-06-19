<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PersonalService extends Model
{
    protected $fillable = [
        'user_id',
        'service_date',
        'name',
        'amount',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'service_date' => 'date',
            'amount' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
