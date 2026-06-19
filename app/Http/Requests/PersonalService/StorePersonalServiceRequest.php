<?php

namespace App\Http\Requests\PersonalService;

use Illuminate\Foundation\Http\FormRequest;

class StorePersonalServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'description' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Indica el nombre del pedido.',
            'amount.required' => 'Indica el monto del servicio.',
            'amount.min' => 'El monto debe ser mayor a cero.',
        ];
    }
}
