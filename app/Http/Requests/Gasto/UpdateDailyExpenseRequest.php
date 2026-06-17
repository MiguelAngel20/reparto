<?php

namespace App\Http\Requests\Gasto;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDailyExpenseRequest extends FormRequest
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
            'concept' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Indica el nombre del gasto.',
            'amount.required' => 'Indica la cantidad del gasto.',
            'amount.min' => 'La cantidad debe ser mayor a cero.',
        ];
    }
}
