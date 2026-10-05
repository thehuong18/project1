<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Services\OrderService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class OrderController extends Controller
{
    public function __construct(
        protected OrderService $orderService
    ) {}

    /**
     * Create an order from items or user's cart.
     *
     * @group Order Management
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->all();
        $phoneInput = $data['phone'] ?? $data['shipping_phone'] ?? null;
        $nameInput = $data['name'] ?? $data['shipping_name'] ?? $data['full_name'] ?? null;
        $addressInput = $data['address'] ?? $data['shipping_address'] ?? null;

        $data['phone'] = $phoneInput;
        $data['shipping_phone'] = $phoneInput;
        $data['name'] = $nameInput;
        $data['shipping_name'] = $nameInput;
        $data['address'] = $addressInput;
        $data['shipping_address'] = $addressInput;

        $validator = Validator::make($data, [
            'user_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'shipping_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'phone' => ['required', 'string', 'regex:/^(0|\+84)[0-9]{8,11}$/'],
            'shipping_phone' => ['sometimes', 'nullable', 'string'],
            'address' => ['sometimes', 'nullable', 'string'],
            'shipping_address' => ['sometimes', 'nullable', 'string'],
            'to_district_id' => ['sometimes', 'nullable'],
            'to_ward_code' => ['sometimes', 'nullable'],
            'shipping_fee' => ['sometimes', 'numeric', 'min:0'],
            'discount_amount' => ['sometimes', 'numeric', 'min:0'],
            'payment_method' => ['sometimes', 'string', 'in:cod,momo'],
            'coupon_id' => ['sometimes', 'nullable', 'integer', 'exists:coupons,id'],
            'coupon_code' => ['sometimes', 'nullable', 'string'],
            'note' => ['sometimes', 'nullable', 'string'],
            'items' => ['sometimes', 'array'],
            'items.*.product_id' => ['required_with:items', 'integer', 'min:1'],
            'items.*.product_name' => ['sometimes', 'nullable', 'string'],
            'items.*.name' => ['sometimes', 'nullable', 'string'],
            'items.*.price' => ['required_with:items', 'numeric', 'min:0'],
            'items.*.quantity' => ['required_with:items', 'integer', 'min:1'],
            'items.*.size' => ['sometimes', 'nullable', 'string'],
            'items.*.selectedSize' => ['sometimes', 'nullable', 'string'],
            'items.*.color' => ['sometimes', 'nullable', 'string'],
            'items.*.selectedColor' => ['sometimes', 'nullable', 'string'],
            'items.*.sku' => ['sometimes', 'nullable', 'string'],
            'items.*.image' => ['sometimes', 'nullable', 'string'],
            'items.*.product_image' => ['sometimes', 'nullable', 'string'],
        ]);

        $validated = $validator->validate();

        try {
            $result = $this->orderService->createOrder($validated);

            return response()->json([
                'success' => true,
                'message' => 'Đặt hàng thành công.',
                'data' => $result['order']->load(['items', 'coupon']),
                'pay_url' => $result['pay_url'],
                'errors' => null,
            ], 201);
        } catch (Exception $e) {
            $code = $e->getCode();
            $statusCode = is_numeric($code) && (int) $code >= 400 && (int) $code < 600 ? (int) $code : 422;

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'data' => null,
                'errors' => ['order' => [$e->getMessage()]],
            ], $statusCode);
        }
    }

    /**
     * List orders (supports admin & user scoping).
     *
     * @group Order Management
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'status' => ['sometimes', 'nullable', 'string'],
            'search' => ['sometimes', 'nullable', 'string'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $result = $this->orderService->listOrders($validated);
        $orders = $result['orders'];

        return response()->json([
            'success' => true,
            'message' => 'Lấy danh sách đơn hàng thành công.',
            'data' => $orders->items(),
            'stats' => $result['stats'],
            'pagination' => [
                'current_page' => $orders->currentPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
                'last_page' => $orders->lastPage(),
            ],
            'errors' => null,
        ]);
    }

    /**
     * Get order statistics for Admin.
     */
    public function stats(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->orderService->getOrderStats(),
        ]);
    }

    public function salesSummary(): JsonResponse
    {
        $sales = OrderItem::query()
            ->whereHas('order', function ($query): void {
                $query->whereIn('order_status', ['delivered', 'paid'])
                    ->orWhere('payment_status', 'paid');
            })
            ->selectRaw('product_id, SUM(quantity) as quantity_sold')
            ->groupBy('product_id')
            ->pluck('quantity_sold', 'product_id');

        return response()->json([
            'success' => true,
            'data' => $sales,
        ]);
    }

    /**
     * Show an order by ID.
     *
     * @group Order Management
     */
    public function show(Order $order): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Lấy thông tin đơn hàng thành công.',
            'data' => $order->load(['items', 'coupon']),
            'errors' => null,
        ]);
    }

    /**
     * Update order status or payment status (Admin).
     *
     * @group Order Management
     */
    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $validated = $request->validate([
            'order_status' => ['sometimes', 'string', 'in:pending,processing,shipping,delivered,cancelled,refund_pending,refunded'],
            'payment_status' => ['sometimes', 'string', 'in:unpaid,pending,paid,failed,refunded,refund_pending'],
            'ghn_code' => ['sometimes', 'nullable', 'string', 'max:100'],
            'note' => ['sometimes', 'nullable', 'string'],
            'refund_reason' => ['sometimes', 'nullable', 'string'],
        ]);

        $updatedOrder = $this->orderService->updateOrderStatus($order, $validated);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật trạng thái đơn hàng thành công.',
            'data' => $updatedOrder,
            'errors' => null,
        ]);
    }

    /**
     * Create GHN shipping order and persist ghn_code.
     *
     * @group Order Management
     */
    public function createGhnShipping(Request $request, Order $order): JsonResponse
    {
        $validated = $request->validate([
            'to_district_id' => ['sometimes', 'integer'],
            'to_ward_code' => ['sometimes', 'string'],
        ]);

        try {
            $result = $this->orderService->createGhnShipping($order, $validated);

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo vận đơn GHN thành công: ' . $result['ghn_code'],
                'data' => [
                    'order' => $result['order'],
                    'ghn_code' => $result['ghn_code'],
                    'ghn_details' => $result['ghn_details'],
                ],
                'errors' => null,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Tạo đơn GHN thất bại: ' . $e->getMessage(),
                'data' => null,
                'errors' => ['ghn' => [$e->getMessage()]],
            ], 422);
        }
    }

    /**
     * Mark an order as paid (called by payment-service upon successful payment).
     */
    public function markPaid(Request $request, $order): JsonResponse
    {
        $paymentServiceSecret = (string) config('services.payment_service.secret');
        abort_unless(
            $paymentServiceSecret !== ''
                && hash_equals($paymentServiceSecret, (string) $request->header('X-Payment-Service-Secret')),
            403,
            'Only the payment service can mark an order as paid.',
        );

        $orderModel = $order instanceof Order
            ? $order
            : Order::where('id', $order)->orWhere('order_number', $order)->orWhere('order_code', $order)->first();

        if (!$orderModel) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy đơn hàng.',
            ], 404);
        }

        $orderModel->update([
            'payment_status' => 'paid',
            'order_status' => 'pending',
            'status' => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => "Đơn hàng #{$orderModel->id} đã được cập nhật thanh toán thành công.",
            'data' => $orderModel->fresh(),
        ]);
    }
}