<?php

namespace App\Http\Requests\Contact;

use Illuminate\Foundation\Http\FormRequest;

class StoreContactRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:500'],
            'maps_url' => ['nullable', 'url', 'max:2000'],
            'image' => ['nullable', 'image', 'max:5120'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Indica el nombre del restaurante o contacto.',
            'phone.required' => 'Indica un teléfono.',
            'maps_url.url' => 'La URL de Maps no es válida.',
            'image.image' => 'La imagen debe ser PNG, JPG o similar.',
            'image.max' => 'La imagen no puede superar 5 MB.',
        ];
    }
}
