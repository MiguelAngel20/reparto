<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($this->user()?->id),
            ],
            'company_name' => ['required', 'string', 'max:255'],
            'percentage' => ['required', 'numeric', 'min:0', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'El nombre es obligatorio.',
            'name.min' => 'El nombre debe tener al menos 2 caracteres.',
            'email.required' => 'El correo electrónico es obligatorio.',
            'email.email' => 'Ingresa un correo electrónico válido.',
            'email.unique' => 'Este correo ya está en uso por otra cuenta.',
            'company_name.required' => 'La empresa es obligatoria.',
            'company_name.max' => 'El nombre de empresa es demasiado largo.',
            'percentage.required' => 'El porcentaje es obligatorio.',
            'percentage.numeric' => 'El porcentaje debe ser un número válido.',
            'percentage.min' => 'El porcentaje no puede ser menor a 0.',
            'percentage.max' => 'El porcentaje no puede ser mayor a 100.',
        ];
    }
}
