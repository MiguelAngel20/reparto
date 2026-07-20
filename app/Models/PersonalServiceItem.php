<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PersonalServiceItem extends Model
{
    protected $fillable = [
        'personal_service_id',
        'description',
        'price',
        'is_completed',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'is_completed' => 'boolean',
        ];
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(PersonalService::class, 'personal_service_id');
    }
}
