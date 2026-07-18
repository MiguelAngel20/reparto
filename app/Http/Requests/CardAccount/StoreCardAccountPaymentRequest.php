<?php

namespace App\Http\Requests\CardAccount;

use App\Models\CardAccountMovement;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'payment_method' => [
                'required',
                Rule::in([
                    CardAccountMovement::PAYMENT_METHOD_CASH,
                    CardAccountMovement::PAYMENT_METHOD_TRANSFER,
                ]),
            ],
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
