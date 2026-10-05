<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderItem;
use Exception;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class OrderService
{
    public function __construct(
        protected CouponService $couponService,
        protected CatalogService $catalogService,
        protected GhnService $ghnService
    ) {}

    /**
     * Create an order from items or user's cart.
     *
     * @param array $validated
     * @return array{order: Order, pay_url: string|null}
     * @throws Exception
     */
    public function createOrder(array $validated): array
    {
        $userId = !empty($validated['user_id']) ? (int) $validated['user_id'] : null;

        // 1. Transaction to persist Order, OrderItems, PaymentTransaction, and update Coupon/Cart
        $orderData = DB::transaction(function () use ($validated, $userId): array {
            $cart = $userId ? Cart::where('user_id', $userId)->with('items')->lockForUpdate()->first() : null;

            // Determine items to order
            $orderItemsData = [];
            if (!empty($validated['items'])) {
                $orderItemsData = $validated['items'];
            } elseif ($cart && $cart->items->isNotEmpty()) {
                foreach ($cart->items as $ci) {
                    $orderItemsData[] = [
                        'product_id' => $ci->product_id,
                        'product_name' => $ci->product_name ?? ('Sản phẩm #' . $ci->product_id),
                        'price' => (float) $ci->price,
                        'quantity' => (int) $ci->quantity,
                        'size' => $ci->size ?? null,
                        'color' => $ci->color ?? null,
                        'sku' => $ci->sku ?? ('PRODUCT-' . $ci->product_id),
                    ];
                }
            }

            if (empty($orderItemsData)) {
                throw new Exception('Không thể tạo đơn hàng từ danh sách sản phẩm trống.', 422);
            }

            // Calculate subtotal
            $subtotal = collect($orderItemsData)->sum(function ($item) {
                $p = (float) ($item['price'] ?? 0);
                $q = (int) ($item['quantity'] ?? 1);
                return $p * $q;
            });

            $shippingFee = (float) ($validated['shipping_fee'] ?? 30000);
            $discountAmount = (float) ($validated['discount_amount'] ?? 0);
            $couponId = $validated['coupon_id'] ?? null;
            $couponCode = $validated['coupon_code'] ?? null;
            $coupon = null;

            // Validate and apply coupon via CouponService
            if (!empty($couponCode) || !empty($couponId)) {
                $couponCalculation = $this->couponService->validateAndCalculate(
                    $couponCode,
                    $couponId,
                    $subtotal,
                    $shippingFee,
                    true // lockForUpdate
                );

                $coupon = $couponCalculation['coupon'];
                $discountAmount = $couponCalculation['discount_amount'];
                $shippingFee = $couponCalculation['shipping_fee'];
                $couponId = $couponCalculation['coupon_id'];

                if ($coupon) {
                    $this->couponService->incrementUsage($coupon);
                }
            }

            $totalAmount = max(0, $subtotal + $shippingFee - ($coupon && $coupon->type === 'freeship' ? 0 : $discountAmount));

            // Create Order record
            $orderNumber = 'ORD-' . now()->format('Ymd') . '-' . Str::upper(Str::random(6));
            $shippingName = $validated['name'] ?? $validated['shipping_name'] ?? 'Khách hàng';
            $shippingAddress = $validated['shipping_address'] ?? $validated['address'] ?? '';
            $phone = $validated['phone'] ?? $validated['shipping_phone'] ?? '';

            $order = Order::create([
                'user_id' => $userId,
                'order_number' => $orderNumber,
                'order_code' => $orderNumber,
                'coupon_id' => $couponId,
                'shipping_name' => $shippingName,
                'shipping_phone' => $phone,
                'shipping_address' => $shippingAddress,
                'to_district_id' => !empty($validated['to_district_id']) ? (int) $validated['to_district_id'] : null,
                'to_ward_code' => !empty($validated['to_ward_code']) ? (string) $validated['to_ward_code'] : null,
                'phone' => $phone,
                'subtotal' => $subtotal,
                'shipping_fee' => $shippingFee,
                'discount_amount' => $discountAmount,
                'total_amount' => $totalAmount,
                'order_status' => 'pending',
                'status' => 'pending',
                'payment_status' => 'unpaid',
                'payment_method' => $validated['payment_method'] ?? 'cod',
                'note' => $validated['note'] ?? null,
            ]);

            // Save snapshots into Order Items
            foreach ($orderItemsData as $item) {
                $pid = (int) $item['product_id'];
                $name = $item['product_name'] ?? $item['name'] ?? ('Product #' . $pid);
                $price = (float) $item['price'];
                $qty = (int) $item['quantity'];
                $size = $item['size'] ?? $item['selectedSize'] ?? null;
                $color = $item['color'] ?? $item['selectedColor'] ?? null;
                $sku = $item['sku'] ?? ('STR-' . $pid . ($size ? '-' . $size : '') . ($color ? '-' . Str::upper($color) : ''));
                $image = $item['image'] ?? $item['product_image'] ?? null;

                $order->items()->create([
                    'product_id' => $pid,
                    'variant_id' => $pid,
                    'product_name' => $name,
                    'image' => $image,
                    'variant_attributes' => [
                        'size' => $size,
                        'color' => $color,
                    ],
                    'sku' => $sku,
                    'unit_price' => $price,
                    'quantity' => $qty,
                    'subtotal' => $price * $qty,
                ]);
            }

            // Clean up user's cart
            if ($cart) {
                $cart->items()->delete();
            }

            return [
                'order' => $order,
                'items' => $orderItemsData,
            ];
        });

        $order = $orderData['order'];
        $orderedItems = $orderData['items'] ?? [];

        // 2. External Call: Deduct stock from Catalog Service (Outside Transaction)
        $this->catalogService->deductStock($orderedItems);

        return [
            'order' => $order,
            'pay_url' => null,
        ];
    }

    /**
     * List orders with filtering, search, and pagination.
     *
     * @param array $filters
     * @return array{orders: LengthAwarePaginator, stats: array}
     */
    public function listOrders(array $filters = []): array
    {
        $orders = Order::with(['user', 'items', 'coupon'])
            ->when($filters['user_id'] ?? null, fn ($q, $uid) => $q->where('user_id', $uid))
            ->when($filters['status'] ?? null, function ($q, $st): void {
                if ($st !== 'all' && $st !== 'ALL') {
                    $q->where(function ($sub) use ($st) {
                        $sub->where('order_status', $st)
                            ->orWhere('status', $st);
                    });
                }
            })
            ->when($filters['search'] ?? null, function ($q, $search): void {
                $q->where(function ($sub) use ($search): void {
                    $sub->where('order_number', 'like', "%{$search}%")
                        ->orWhere('order_code', 'like', "%{$search}%")
                        ->orWhere('id', 'like', "%{$search}%")
                        ->orWhere('shipping_name', 'like', "%{$search}%")
                        ->orWhere('shipping_phone', 'like', "%{$search}%")
                        ->orWhere('ghn_code', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();

        return [
            'orders' => $orders,
            'stats' => $this->getOrderStats(),
        ];
    }

    /**
     * Get order statistics for Admin dashboard.
     *
     * @return array
     */
    public function getOrderStats(): array
    {
        $pendingCount = Order::where(function ($q) {
            $q->where('order_status', 'pending')->orWhere('status', 'pending');
        })->count();

        $processingCount = Order::where(function ($q) {
            $q->where('order_status', 'processing')->orWhere('status', 'processing');
        })->count();

        $revenue = Order::where(function ($q) {
            $q->whereIn('order_status', ['delivered', 'paid'])
              ->orWhereIn('status', ['delivered', 'paid']);
        })->where(function ($q) {
            $q->whereNotIn('order_status', ['cancelled'])
              ->whereNotIn('status', ['cancelled']);
        })->sum('total_amount');

        return [
            'total' => Order::count(),
            'revenue' => (float) $revenue,
            'pending' => $pendingCount,
            'processing' => $processingCount,
            'shipping' => Order::where(function ($q) {
                $q->where('order_status', 'shipping')->orWhere('status', 'shipping');
            })->count(),
            'delivered' => Order::where(function ($q) {
                $q->whereIn('order_status', ['delivered', 'paid'])->orWhereIn('status', ['delivered', 'paid']);
            })->count(),
            'cancelled' => Order::where(function ($q) {
                $q->where('order_status', 'cancelled')->orWhere('status', 'cancelled');
            })->count(),
        ];
    }

    /**
     * Update order status or payment status.
     *
     * @param Order $order
     * @param array $data
     * @return Order
     */
    public function updateOrderStatus(Order $order, array $data): Order
    {
        if (isset($data['order_status'])) {
            $newStatus = $data['order_status'];
            if ($newStatus === 'cancelled') {
                $currentStatus = $order->order_status ?: $order->status;
                if (in_array($currentStatus, ['processing', 'shipping', 'delivered']) || !empty($order->ghn_code)) {
                    throw new Exception('Không thể hủy đơn hàng khi đơn đã ở trạng thái Chờ lấy hàng hoặc Đang giao hàng.', 422);
                }
            }
            $order->order_status = $newStatus;
            $order->status = $newStatus;
        }
        if (isset($data['payment_status'])) {
            $order->payment_status = $data['payment_status'];
        }
        if (isset($data['note'])) {
            $order->note = $data['note'];
        }
        if (isset($data['ghn_code'])) {
            $order->ghn_code = trim($data['ghn_code']);
        }

        $order->save();

        return $order->fresh()->load('items');
    }

    /**
     * Create GHN shipping order and persist ghn_code.
     *
     * @param Order $order
     * @param array $customData
     * @return array{order: Order, ghn_code: string, ghn_details: array}
     * @throws Exception
     */
    public function createGhnShipping(Order $order, array $customData = []): array
    {
        $ghnResponse = $this->ghnService->createShippingOrder($order, $customData);
        $ghnOrderCode = $ghnResponse['order_code'] ?? null;

        if (!$ghnOrderCode) {
            throw new Exception('Không nhận được mã vận đơn từ GHN API.', 422);
        }

        $order->update([
            'ghn_code' => $ghnOrderCode,
            'order_status' => 'processing',
            'status' => 'processing',
        ]);

        return [
            'order' => $order->fresh()->load('items'),
            'ghn_code' => $ghnOrderCode,
            'ghn_details' => $ghnResponse,
        ];
    }
}
