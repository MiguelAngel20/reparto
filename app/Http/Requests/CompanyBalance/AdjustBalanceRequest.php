<?php

namespace App\Http\Requests\CompanyBalance;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdjustBalanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'direction' => ['required', Rule::in(['company_owes', 'user_owes'])],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'direction.required' => 'Indica si el saldo correcto es a tu favor o a favor de la empresa.',
            'amount.required' => 'Indica el monto del saldo correcto.',
            'amount.min' => 'El monto debe ser mayor a cero.',
        ];
    }
}
