<?php

namespace Database\Seeders;

use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Database\Seeder;

class OrderSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Đơn hàng đã giao thành công (delivered) - Nguyễn Văn An
        $order1 = Order::updateOrCreate(
            ['order_code' => 'STR-260901-001'],
            [
                'order_number' => 'STR-260901-001',
                'user_id' => 2, // customer@striker.vn
                'shipping_name' => 'Nguyễn Văn An',
                'shipping_phone' => '0977777777',
                'phone' => '0977777777',
                'shipping_address' => 'Số 123 Đường Cầu Giấy, Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội',
                'subtotal' => 4290000,
                'shipping_fee' => 30000,
                'discount_amount' => 100000,
                'total_amount' => 4220000,
                'order_status' => 'delivered',
                'status' => 'delivered',
                'payment_status' => 'paid',
                'payment_method' => 'momo',
                'ghn_code' => 'GHN-STR-88101',
                'note' => 'Giao trong giờ hành chính giúp tôi.',
                'created_at' => now()->subDays(5),
                'updated_at' => now()->subDays(2),
            ]
        );

        OrderItem::where('order_id', $order1->id)->delete();
        OrderItem::create([
            'order_id' => $order1->id,
            'product_id' => 1,
            'variant_id' => 1,
            'product_name' => 'Nike Phantom GX Elite FG',
            'sku' => 'STR-NK-PGX-01-41-VOLT',
            'unit_price' => 4290000,
            'quantity' => 1,
            'subtotal' => 4290000,
            'variant_attributes' => ['size' => '41', 'color' => 'Volt'],
        ]);

        // 2. Đơn hàng đang giao (shipping) - Trần Minh Hoàng
        $order2 = Order::updateOrCreate(
            ['order_code' => 'STR-260902-002'],
            [
                'order_number' => 'STR-260902-002',
                'user_id' => 3, // hoang.tran@gmail.com
                'shipping_name' => 'Trần Minh Hoàng',
                'shipping_phone' => '0988776655',
                'phone' => '0988776655',
                'shipping_address' => 'Tòa Landmark 81, 720A Điện Biên Phủ, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh',
                'subtotal' => 3890000,
                'shipping_fee' => 30000,
                'discount_amount' => 0,
                'total_amount' => 3920000,
                'order_status' => 'shipping',
                'status' => 'shipping',
                'payment_status' => 'unpaid',
                'payment_method' => 'cod',
                'ghn_code' => 'GHN-STR-77202',
                'note' => 'Gọi trước khi giao 15 phút.',
                'created_at' => now()->subDays(2),
                'updated_at' => now()->subDay(),
            ]
        );

        OrderItem::where('order_id', $order2->id)->delete();
        OrderItem::create([
            'order_id' => $order2->id,
            'product_id' => 2,
            'variant_id' => 2,
            'product_name' => 'Adidas Predator Accuracy.1 FG',
            'sku' => 'STR-AD-PRED-02-42-WHITE',
            'unit_price' => 3890000,
            'quantity' => 1,
            'subtotal' => 3890000,
            'variant_attributes' => ['size' => '42', 'color' => 'White'],
        ]);

        // 3. Đơn hàng chờ xử lý (pending) - Lê Quốc Bảo
        $order3 = Order::updateOrCreate(
            ['order_code' => 'STR-260903-003'],
            [
                'order_number' => 'STR-260903-003',
                'user_id' => 4, // baole.striker@gmail.com
                'shipping_name' => 'Lê Quốc Bảo',
                'shipping_phone' => '0912345678',
                'phone' => '0912345678',
                'shipping_address' => 'Số 45 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
                'subtotal' => 1190000,
                'shipping_fee' => 30000,
                'discount_amount' => 0,
                'total_amount' => 1220000,
                'order_status' => 'pending',
                'status' => 'pending',
                'payment_status' => 'paid',
                'payment_method' => 'momo',
                'note' => 'Đã thanh toán qua MoMo.',
                'created_at' => now()->subHours(4),
                'updated_at' => now()->subHours(4),
            ]
        );

        OrderItem::where('order_id', $order3->id)->delete();
        OrderItem::create([
            'order_id' => $order3->id,
            'product_id' => 3,
            'variant_id' => 3,
            'product_name' => 'Áo đấu Academy Dri-FIT Jersey',
            'sku' => 'STR-NK-JERSEY-03-L-GREEN',
            'unit_price' => 1190000,
            'quantity' => 1,
            'subtotal' => 1190000,
            'variant_attributes' => ['size' => 'L', 'color' => 'Green'],
        ]);

        // 4. Đơn hàng đã giao thành công (delivered) - Phạm Thu Hương
        $order4 = Order::updateOrCreate(
            ['order_code' => 'STR-260904-004'],
            [
                'order_number' => 'STR-260904-004',
                'user_id' => 5, // huong.pham@gmail.com
                'shipping_name' => 'Phạm Thu Hương',
                'shipping_phone' => '0903332211',
                'phone' => '0903332211',
                'shipping_address' => '128 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh',
                'subtotal' => 3150000,
                'shipping_fee' => 0,
                'discount_amount' => 0,
                'total_amount' => 3150000,
                'order_status' => 'delivered',
                'status' => 'delivered',
                'payment_status' => 'paid',
                'payment_method' => 'momo',
                'ghn_code' => 'GHN-STR-63910',
                'note' => 'Giao hàng tận tay.',
                'created_at' => now()->subDays(8),
                'updated_at' => now()->subDays(6),
            ]
        );

        OrderItem::where('order_id', $order4->id)->delete();
        OrderItem::create([
            'order_id' => $order4->id,
            'product_id' => 4,
            'variant_id' => 4,
            'product_name' => 'Puma Future Ultimate FG',
            'sku' => 'STR-PM-FUT-04-40-BLUE',
            'unit_price' => 3150000,
            'quantity' => 1,
            'subtotal' => 3150000,
            'variant_attributes' => ['size' => '40', 'color' => 'Blue'],
        ]);
    }
}

