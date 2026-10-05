<?php

namespace App\Http\Controllers;

use App\Models\Address;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AddressController extends Controller
{
    public function index(): JsonResponse
    {
        $addresses = auth('api')->user()->addresses()->get();

        return response()->json(['success' => true, 'data' => $addresses]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'recipient_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:15'],
            'province' => ['required', 'string', 'max:255'],
            'district' => ['required', 'string', 'max:255'],
            'ward' => ['required', 'string', 'max:255'],
            'street_address' => ['required', 'string', 'max:255'],
            'is_default' => ['sometimes', 'boolean'],
        ]);

        $user = auth('api')->user();
        $validated['is_default'] = ($validated['is_default'] ?? false) || ! $user->addresses()->exists();

        if ($validated['is_default']) {
            $user->addresses()->update(['is_default' => false]);
        }

        $address = $user->addresses()->create($validated);

        return response()->json(['success' => true, 'data' => $address], 201);
    }

    public function update(Request $request, int $address): JsonResponse
    {
        $user = auth('api')->user();
        $record = $user->addresses()->findOrFail($address);
        $validated = $request->validate([
            'recipient_name' => ['sometimes', 'required', 'string', 'max:255'],
            'phone' => ['sometimes', 'required', 'string', 'max:15'],
            'province' => ['sometimes', 'required', 'string', 'max:255'],
            'district' => ['sometimes', 'required', 'string', 'max:255'],
            'ward' => ['sometimes', 'required', 'string', 'max:255'],
            'street_address' => ['sometimes', 'required', 'string', 'max:255'],
            'is_default' => ['sometimes', 'boolean'],
        ]);

        if ($validated['is_default'] ?? false) {
            $user->addresses()->where('id', '!=', $record->id)->update(['is_default' => false]);
        }

        $record->update($validated);

        return response()->json(['success' => true, 'data' => $record->fresh()]);
    }

    public function destroy(int $address): JsonResponse
    {
        auth('api')->user()->addresses()->findOrFail($address)->delete();

        return response()->json(['success' => true, 'data' => null]);
    }

    public function setDefault(int $address): JsonResponse
    {
        $user = auth('api')->user();
        $record = $user->addresses()->findOrFail($address);
        $user->addresses()->update(['is_default' => false]);
        $record->update(['is_default' => true]);

        return response()->json(['success' => true, 'data' => $record->fresh()]);
    }
}