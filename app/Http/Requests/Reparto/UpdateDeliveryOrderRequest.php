<?php

namespace App\Http\Requests\Reparto;

use App\Models\DeliveryOrder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDeliveryOrderRequest extends FormRequest
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
    }

    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:255'],
            'service_cost' => ['nullable', 'numeric', 'min:0'],
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
            'client_payment_mode' => ['nullable', Rule::in([
                DeliveryOrder::PAYMENT_CASH,
                DeliveryOrder::PAYMENT_TRANSFER,
            ])],
            'cash_collected' => ['nullable', 'numeric', 'min:0'],
            'box_adjustment' => ['nullable', 'numeric'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['nullable', 'array'],
            'items.*.description' => ['nullable', 'string', 'max:255'],
            'items.*.price' => ['nullable', 'numeric', 'min:0'],
            'items.*.is_completed' => ['nullable', 'boolean'],
        ];
    }
}
