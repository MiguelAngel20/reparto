<?php

namespace App\Http\Requests\CardAccount;

use Illuminate\Foundation\Http\FormRequest;

class StoreCardAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'holder_name' => ['required', 'string', 'max:120'],
            'account_holder_name' => ['nullable', 'string', 'max:120'],
            'bank_type' => ['nullable', 'string', 'max:80'],
            'account_number' => ['nullable', 'string', 'max:40'],
            'initial_real_balance' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'holder_name.required' => 'Indica quién usa la tarjeta.',
        ];
    }
}
