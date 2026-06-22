<?php

namespace App\Http\Requests\Reparto;

use App\Models\DeliveryOrder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class FinalizeDeliveryOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null
            && $this->route('order')?->user_id === $this->user()->id;
    }

    protected function prepareForValidation(): void
    {
        foreach (['product_cost', 'cash_spent', 'cash_received', 'user_extra', 'clikio_extra', 'discount', 'cash_collected', 'box_adjustment'] as $field) {
            if ($this->has($field) && $this->input($field) === '') {
                $this->merge([$field => null]);
            }
        }

        if ($this->input('client_payment_mode') !== DeliveryOrder::PAYMENT_CASH) {
            $this->merge(['client_payment_mode' => DeliveryOrder::PAYMENT_CASH]);
        }

        if ($this->has('items') && is_array($this->input('items'))) {
            $items = array_values(array_filter(
                $this->input('items'),
                fn ($item) => trim((string) ($item['description'] ?? '')) !== '',
            ));
            $this->merge(['items' => $items]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'service_cost' => ['required', 'numeric', 'min:0'],
            'order_type' => ['required', Rule::in([
                DeliveryOrder::TYPE_CASH_OUT,
                DeliveryOrder::TYPE_SERVICE_ONLY,
            ])],
            'product_cost' => ['nullable', 'numeric', 'min:0'],
            'cash_spent' => ['nullable', 'numeric', 'min:0'],
            'cash_received' => ['nullable', 'numeric', 'min:0'],
            'user_extra' => ['nullable', 'numeric', 'min:0'],
            'clikio_extra' => ['nullable', 'numeric', 'min:0'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'client_payment_mode' => ['sometimes', Rule::in([
                DeliveryOrder::PAYMENT_CASH,
            ])],
            'cash_collected' => ['nullable', 'numeric', 'min:0'],
            'box_adjustment' => ['nullable', 'numeric'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['nullable', 'array'],
            'items.*.description' => ['required_with:items', 'string', 'max:255'],
            'items.*.price' => ['nullable', 'numeric', 'min:0'],
            'items.*.is_completed' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'El nombre del pedido es obligatorio.',
            'service_cost.required' => 'Indica el costo del servicio.',
            'order_type.required' => 'Selecciona el tipo de pedido.',
        ];
    }
}
