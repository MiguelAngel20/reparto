<?php

namespace App\Http\Requests\Reparto;

use Illuminate\Foundation\Http\FormRequest;

class FinalizePersonalServiceSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        if ($this->input('spent_amount') === '' || $this->input('spent_amount') === null) {
            $this->merge(['spent_amount' => null]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'spent_amount' => ['nullable', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Indica el nombre del pedido.',
            'amount.required' => 'Indica el monto del servicio.',
            'amount.min' => 'El monto del servicio debe ser mayor a cero.',
            'spent_amount.min' => 'El monto gastado no puede ser negativo.',
        ];
    }
}
