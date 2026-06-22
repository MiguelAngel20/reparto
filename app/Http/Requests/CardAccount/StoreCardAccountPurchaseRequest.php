<?php

namespace App\Http\Requests\CardAccount;

use Illuminate\Foundation\Http\FormRequest;

class StoreCardAccountPurchaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'holder_name' => ['nullable', 'string', 'max:120'],
            'name' => ['required', 'string', 'max:120'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'description' => ['nullable', 'string', 'max:500'],
            'movement_date' => ['required', 'date', 'before_or_equal:today'],
        ];
    }

    public function messages(): array
    {
        return [
            'movement_date.required' => 'Indica la fecha de la compra.',
            'movement_date.before_or_equal' => 'La fecha no puede ser futura.',
        ];
    }
}
