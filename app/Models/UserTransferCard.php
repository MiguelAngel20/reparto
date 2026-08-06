<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserTransferCard extends Model
{
    protected $fillable = [
        'user_id',
        'holder_name',
        'card_number',
        'clabe',
        'bank_name',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return array{
     *     id: int,
     *     holder_name: string,
     *     card_number: string|null,
     *     card_number_formatted: string|null,
     *     clabe: string|null,
     *     clabe_formatted: string|null,
     *     bank_name: string,
     *     created_at: string|null
     * }
     */
    public function toDisplayArray(): array
    {
        $cardNumber = $this->card_number ? (string) $this->card_number : null;
        $clabe = $this->clabe ? (string) $this->clabe : null;

        return [
            'id' => $this->id,
            'holder_name' => $this->holder_name,
            'card_number' => $cardNumber,
            'card_number_formatted' => $cardNumber ? trim(chunk_split($cardNumber, 4, ' ')) : null,
            'clabe' => $clabe,
            'clabe_formatted' => $clabe ? trim(chunk_split($clabe, 4, ' ')) : null,
            'bank_name' => $this->bank_name,
            'created_at' => $this->created_at?->format('d/m/Y'),
        ];
    }
}
