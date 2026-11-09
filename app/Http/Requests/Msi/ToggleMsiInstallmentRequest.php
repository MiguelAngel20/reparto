<?php

namespace App\Http\Requests\Msi;

use Illuminate\Foundation\Http\FormRequest;

class ToggleMsiInstallmentRequest extends FormRequest
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
            'paid' => ['required', 'boolean'],
            'paid_at' => ['nullable', 'date'],
        ];
    }
}
