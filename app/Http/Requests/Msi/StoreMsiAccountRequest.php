<?php

namespace App\Http\Requests\Msi;

use Illuminate\Foundation\Http\FormRequest;

class StoreMsiAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:120'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Escribe el nombre de la tarjeta.',
            'name.min' => 'El nombre debe tener al menos 2 caracteres.',
        ];
    }
}
