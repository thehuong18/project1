<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'email' => ['nullable', 'email', 'max:100'],
            'phone' => ['nullable', 'string', 'max:20'],
            'phone_number' => ['nullable', 'string', 'max:20'],
            'identifier' => ['nullable', 'string'],
            'password' => ['required', 'string', 'min:6'],
        ];
    }
}
