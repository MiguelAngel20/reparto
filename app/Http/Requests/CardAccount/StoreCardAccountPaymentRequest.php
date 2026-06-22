<?php

namespace App\Http\Requests\CardAccount;

use Illuminate\Foundation\Http\FormRequest;

class StoreCardAccountPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'description' => ['nullable', 'string', 'max:500'],
            'movement_date' => ['required', 'date', 'before_or_equal:today'],
        ];
    }

    public function messages(): array
    {
        return [
            'movement_date.required' => 'Indica la fecha del abono.',
            'movement_date.before_or_equal' => 'La fecha no puede ser futura.',
        ];
    }
}
