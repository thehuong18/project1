<?php

namespace App\Http\Controllers;

use App\Models\Review;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    /**
     * List reviews for a product.
     *
     * @group Review Management
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'per_page'   => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Review::query();
        if (!empty($validated['product_id'])) {
            $query->where('product_id', $validated['product_id']);
        }

        $reviews = $query->latest()
            ->paginate($validated['per_page'] ?? 50);

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách đánh giá thành công.',
            'data' => $reviews->items(),
            'pagination' => [
                'current_page' => $reviews->currentPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
                'last_page' => $reviews->lastPage(),
            ],
            'errors' => null,
        ]);
    }

    /**
     * Get review summary (avg_rating, count) grouped by product_id.
     *
     * @group Review Management
     */
    public function summary(): JsonResponse
    {
        $summaries = Review::selectRaw('product_id, ROUND(AVG(rating), 1) as avg_rating, COUNT(*) as review_count')
            ->groupBy('product_id')
            ->get()
            ->keyBy('product_id');

        return response()->json([
            'success' => true,
            'message' => 'Lấy tổng hợp đánh giá thành công.',
            'data' => $summaries,
            'errors' => null,
        ]);
    }

    /**
     * Create a new review. One review per user per product per order.
     *
     * @group Review Management
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->all();
        if (empty($data['order_id'])) {
            $data['order_id'] = 'DIRECT-' . \Illuminate\Support\Str::random(8);
        }

        $validator = \Illuminate\Support\Facades\Validator::make($data, [
            'order_id'    => ['sometimes', 'nullable', 'string', 'max:100'],
            'product_id'  => ['required', 'integer', 'min:1'],
            'user_id'     => ['required', 'integer', 'min:1'],
            'user_name'   => ['required', 'string', 'max:100'],
            'user_avatar' => ['sometimes', 'nullable', 'string', 'max:500'],
            'rating'      => ['required', 'integer', 'min:1', 'max:5'],
            'comment'     => ['required', 'string', 'max:2000'],
        ]);

        $validated = $validator->validate();

        try {
            $review = Review::create($validated);
        } catch (UniqueConstraintViolationException) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn đã đánh giá sản phẩm này trong đơn hàng này rồi.',
                'data' => null,
                'errors' => ['review' => ['Đánh giá đã tồn tại.']],
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Cảm ơn bạn đã đánh giá sản phẩm!',
            'data' => $review,
            'errors' => null,
        ], 201);
    }

    /**
     * Check if a user has already reviewed a specific product in a specific order.
     *
     * @group Review Management
     */
    public function check(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id'   => ['required', 'string'],
            'product_id' => ['required', 'integer', 'min:1'],
            'user_id'    => ['required', 'integer', 'min:1'],
        ]);

        $reviewed = Review::where('order_id', $validated['order_id'])
            ->where('product_id', $validated['product_id'])
            ->where('user_id', $validated['user_id'])
            ->exists();

        return response()->json([
            'success' => true,
            'message' => $reviewed ? 'Đã đánh giá sản phẩm này.' : 'Chưa đánh giá.',
            'data' => ['reviewed' => $reviewed],
            'errors' => null,
        ]);
    }
}
