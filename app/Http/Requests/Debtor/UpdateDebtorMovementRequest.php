<?php

namespace App\Http\Requests\Debtor;

use App\Models\DebtorMovement;
use Illuminate\Foundation\Http\FormRequest;

class UpdateDebtorMovementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $movement = $this->route('movement');
        $isSettlement = $movement instanceof DebtorMovement
            && $movement->type === DebtorMovement::TYPE_SETTLEMENT;

        return [
            'movement_date' => ['required', 'date', 'before_or_equal:today'],
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'amount' => $isSettlement
                ? ['nullable', 'numeric', 'min:0.01']
                : ['required', 'numeric', 'min:0.01'],
        ];
    }

    public function messages(): array
    {
        return [
            'movement_date.required' => 'La fecha es obligatoria.',
            'movement_date.before_or_equal' => 'La fecha no puede ser futura.',
            'name.required' => 'El nombre es obligatorio.',
            'amount.required' => 'El monto es obligatorio.',
            'amount.min' => 'El monto debe ser mayor a 0.',
        ];
    }
}
