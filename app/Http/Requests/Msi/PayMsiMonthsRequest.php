<?php

namespace App\Http\Requests\Msi;

use Illuminate\Foundation\Http\FormRequest;

class PayMsiMonthsRequest extends FormRequest
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
            'months' => ['required', 'integer', 'min:1', 'max:48'],
            'paid_at' => ['nullable', 'date'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'months.required' => 'Indica cuántos meses quieres marcar como pagados.',
            'months.min' => 'Debes adelantar al menos 1 mes.',
        ];
    }
}
