<?php

namespace App\Http\Requests\Debtor;

use Illuminate\Foundation\Http\FormRequest;

class StoreDebtorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:120'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'El nombre del deudor es obligatorio.',
            'name.min' => 'El nombre debe tener al menos 2 caracteres.',
        ];
    }
}
