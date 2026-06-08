<?php

namespace App\Http\Requests\Reparto;

use Illuminate\Foundation\Http\FormRequest;

class CloseCashSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('counted_amount') && $this->input('counted_amount') === '') {
            $this->merge(['counted_amount' => null]);
        }
    }

    public function rules(): array
    {
        return [
            'counted_amount' => ['required', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'counted_amount.required' => 'Indica cuánto efectivo contaste en caja.',
            'counted_amount.min' => 'El monto contado no puede ser negativo.',
        ];
    }
}
