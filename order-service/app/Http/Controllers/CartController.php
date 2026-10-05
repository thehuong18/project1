<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\CartItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    /**
     * Get a user's cart and its items.
     *
     * @group Cart Management
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate(['user_id' => ['required', 'integer', 'min:1']]);
        $cart = Cart::firstOrCreate(['user_id' => $validated['user_id']]);

        return response()->json([
            'success' => true,
            'message' => 'Lấy giỏ hàng thành công.',
            'data' => $cart->load('items'),
            'errors' => null,
        ]);
    }

    /**
     * Add a product to a user's cart, or increase its quantity.
     *
     * @group Cart Management
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'min:1'],
            'product_id' => ['required', 'integer', 'min:1'],
            'quantity' => ['sometimes', 'integer', 'min:1'],
            'price' => ['required', 'numeric', 'min:0'],
        ]);
        $cart = Cart::firstOrCreate(['user_id' => $validated['user_id']]);
        $item = CartItem::firstOrNew([
            'cart_id' => $cart->id,
            'product_id' => $validated['product_id'],
        ]);
        $item->quantity = ($item->exists ? $item->quantity : 0) + ($validated['quantity'] ?? 1);
        $item->price = $validated['price'];
        $item->variant_id = $validated['product_id'];
        $item->save();

        return response()->json([
            'success' => true,
            'message' => 'Thêm sản phẩm vào giỏ hàng thành công.',
            'data' => $item,
            'errors' => null,
        ], 201);
    }

    /**
     * Update the quantity of a cart item.
     *
     * @group Cart Management
     */
    public function update(Request $request, CartItem $cartItem): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'min:1'],
            'quantity' => ['required', 'integer', 'min:1'],
        ]);
        $this->ensureOwnership($cartItem, $validated['user_id']);
        $cartItem->update(['quantity' => $validated['quantity']]);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật số lượng thành công.',
            'data' => $cartItem->fresh(),
            'errors' => null,
        ]);
    }

    /**
     * Remove an item from a user's cart.
     *
     * @group Cart Management
     */
    public function destroy(Request $request, CartItem $cartItem): JsonResponse
    {
        $validated = $request->validate(['user_id' => ['required', 'integer', 'min:1']]);
        $this->ensureOwnership($cartItem, $validated['user_id']);
        $cartItem->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa sản phẩm khỏi giỏ hàng.',
            'data' => null,
            'errors' => null,
        ]);
    }

    private function ensureOwnership(CartItem $cartItem, int $userId): void
    {
        abort_unless($cartItem->cart()->where('user_id', $userId)->exists(), 404, 'Mục giỏ hàng không tồn tại.');
    }
}