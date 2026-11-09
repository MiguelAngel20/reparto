<?php

namespace App\Http\Requests\Msi;

use Illuminate\Foundation\Http\FormRequest;

class StoreMsiPurchaseRequest extends FormRequest
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
            'name' => ['required', 'string', 'min:2', 'max:160'],
            'original_amount' => ['required', 'numeric', 'min:0.01', 'max:9999999.99'],
            'months_total' => ['required', 'integer', 'min:1', 'max:48'],
            'first_due_date' => ['required', 'date'],
            'debt_start_date' => ['nullable', 'date'],
            'months_already_paid' => ['nullable', 'integer', 'min:0', 'max:48'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Escribe el nombre o descripción de la compra.',
            'original_amount.required' => 'Indica el monto original.',
            'months_total.required' => 'Indica a cuántos meses sin intereses.',
            'first_due_date.required' => 'Indica la fecha del primer pago.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->input('months_already_paid') === '' || $this->input('months_already_paid') === null) {
            $this->merge(['months_already_paid' => 0]);
        }
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $months = (int) $this->input('months_total', 0);
            $alreadyPaid = (int) $this->input('months_already_paid', 0);

            if ($months > 0 && $alreadyPaid > $months) {
                $validator->errors()->add(
                    'months_already_paid',
                    'Los meses ya pagados no pueden ser más que el total de MSI.',
                );
            }
        });
    }
}
