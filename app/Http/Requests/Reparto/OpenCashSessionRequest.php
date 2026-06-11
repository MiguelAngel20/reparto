<?php

namespace App\Http\Requests\Reparto;

use App\Models\CashSession;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class OpenCashSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        // Vacío significa iniciar la jornada con $0
        if ($this->input('initial_amount') === null || $this->input('initial_amount') === '') {
            $this->merge(['initial_amount' => 0]);
        }
    }

    public function rules(): array
    {
        return [
            'initial_amount' => ['required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'initial_amount.required' => 'Indica el monto inicial de la caja.',
            'initial_amount.min' => 'El monto inicial no puede ser negativo.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $user = $this->user();
            if (! $user) {
                return;
            }

            $today = now()->toDateString();
            if (CashSession::dayRegisteredForUser($user->id, $today)) {
                $message = CashSession::dayRegisteredLabelForUser($user->id, $today)
                    ?? 'Ya registraste este día. Podrás iniciar jornada mañana.';
                $validator->errors()->add('initial_amount', $message);
            }
        });
    }
}
