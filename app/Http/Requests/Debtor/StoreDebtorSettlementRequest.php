<?php

namespace App\Http\Requests\Debtor;

use Illuminate\Foundation\Http\FormRequest;

class StoreDebtorSettlementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'movement_date' => ['required', 'date', 'before_or_equal:today'],
            'name' => ['required', 'string', 'min:2', 'max:120'],
        ];
    }

    public function messages(): array
    {
        return [
            'movement_date.required' => 'La fecha es obligatoria.',
            'movement_date.before_or_equal' => 'La fecha no puede ser futura.',
            'name.required' => 'El nombre es obligatorio.',
            'name.min' => 'El nombre debe tener al menos 2 caracteres.',
        ];
    }
}
