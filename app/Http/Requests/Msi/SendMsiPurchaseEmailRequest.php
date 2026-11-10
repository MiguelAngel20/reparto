<?php

namespace App\Http\Requests\Msi;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class SendMsiPurchaseEmailRequest extends FormRequest
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
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'email' => ['nullable', 'email', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'user_id.exists' => 'El usuario seleccionado no existe.',
            'email.email' => 'Escribe un correo válido.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $hasUser = filled($this->input('user_id'));
            $hasEmail = filled($this->input('email'));

            if (! $hasUser && ! $hasEmail) {
                $validator->errors()->add('email', 'Selecciona un usuario o escribe un correo.');
            }
        });
    }
}
