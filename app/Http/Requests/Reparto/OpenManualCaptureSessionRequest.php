<?php

namespace App\Http\Requests\Reparto;

use App\Models\CashSession;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class OpenManualCaptureSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'capture_date' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'capture_date.required' => 'Selecciona la fecha del día a capturar.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $user = $this->user();
            if (! $user) {
                return;
            }

            if (CashSession::openManualForUser($user->id)) {
                $validator->errors()->add(
                    'capture_date',
                    'Tienes una captura manual en curso. Finalízala antes de iniciar otra.',
                );

                return;
            }

            $date = $this->input('capture_date');
            if ($date && CashSession::dayRegisteredForUser($user->id, $date)) {
                $message = CashSession::dayRegisteredLabelForUser($user->id, $date)
                    ?? 'Ya existe una jornada para esa fecha.';
                $validator->errors()->add('capture_date', $message);
            }
        });
    }
}
