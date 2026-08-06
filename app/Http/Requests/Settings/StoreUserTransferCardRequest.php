<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserTransferCardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        $cardNumber = is_string($this->card_number)
            ? preg_replace('/\D+/', '', $this->card_number)
            : $this->card_number;
        $clabe = is_string($this->clabe)
            ? preg_replace('/\D+/', '', $this->clabe)
            : $this->clabe;

        $this->merge([
            'holder_name' => is_string($this->holder_name) ? trim($this->holder_name) : $this->holder_name,
            'card_number' => $cardNumber !== null && $cardNumber !== '' ? $cardNumber : null,
            'clabe' => $clabe !== null && $clabe !== '' ? $clabe : null,
            'bank_name' => is_string($this->bank_name) ? trim($this->bank_name) : $this->bank_name,
        ]);
    }

    public function rules(): array
    {
        return [
            'holder_name' => ['required', 'string', 'min:2', 'max:255'],
            'card_number' => ['nullable', 'required_without:clabe', 'string', 'digits_between:10,19'],
            'clabe' => ['nullable', 'required_without:card_number', 'string', 'digits:18'],
            'bank_name' => ['required', 'string', 'min:2', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'holder_name.required' => 'El nombre del titular es obligatorio.',
            'holder_name.min' => 'El nombre del titular debe tener al menos 2 caracteres.',
            'card_number.required_without' => 'Indica el número de tarjeta o la CLABE.',
            'card_number.digits_between' => 'El número de tarjeta debe tener entre 10 y 19 dígitos.',
            'clabe.required_without' => 'Indica la CLABE o el número de tarjeta.',
            'clabe.digits' => 'La CLABE debe tener exactamente 18 dígitos.',
            'bank_name.required' => 'El nombre del banco es obligatorio.',
            'bank_name.min' => 'El nombre del banco debe tener al menos 2 caracteres.',
        ];
    }
}
