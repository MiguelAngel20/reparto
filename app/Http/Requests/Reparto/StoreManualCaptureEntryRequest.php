<?php

namespace App\Http\Requests\Reparto;

use App\Models\DeliveryOrder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreManualCaptureEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        foreach (['user_extra', 'clikio_extra', 'discount'] as $field) {
            if ($this->has($field) && $this->input($field) === '') {
                $this->merge([$field => null]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'service_cost' => ['required', 'numeric', 'min:0'],
            'client_payment_mode' => ['required', Rule::in([
                DeliveryOrder::PAYMENT_CASH,
                DeliveryOrder::PAYMENT_TRANSFER,
            ])],
            'user_extra' => ['nullable', 'numeric', 'min:0'],
            'clikio_extra' => ['nullable', 'numeric', 'min:0'],
            'discount' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Indica el nombre del pedido.',
            'service_cost.required' => 'Indica el monto del servicio.',
        ];
    }
}
