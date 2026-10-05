<?php

namespace Database\Seeders;

use App\Models\Coupon;
use Illuminate\Database\Seeder;

class CouponSeeder extends Seeder
{
    public function run(): void
    {
        $coupons = [
            [
                'code' => 'FREESHIP',
                'title' => 'Miễn phí vận chuyển toàn quốc',
                'description' => 'Miễn phí 100% phí giao hàng cho tất cả đơn hàng.',
                'type' => 'freeship',
                'value' => 30000,
                'min_order_amount' => 0,
                'max_discount_amount' => 30000,
                'usage_limit' => 1000,
                'used_count' => 0,
                'limit_per_user' => 10,
                'is_active' => true,
                'starts_at' => now()->subDay(),
                'expires_at' => now()->addYear(),
            ],
            [
                'code' => 'GIAM10',
                'title' => 'Giảm 10% đơn hàng',
                'description' => 'Giảm 10% cho đơn hàng từ 200.000đ, tối đa 100.000đ.',
                'type' => 'percent',
                'value' => 10,
                'min_order_amount' => 200000,
                'max_discount_amount' => 100000,
                'usage_limit' => 500,
                'used_count' => 0,
                'limit_per_user' => 5,
                'is_active' => true,
                'starts_at' => now()->subDay(),
                'expires_at' => now()->addYear(),
            ],
            [
                'code' => 'GIAM50K',
                'title' => 'Giảm ngay 50.000đ',
                'description' => 'Giảm ngay 50.000đ cho đơn hàng từ 500.000đ.',
                'type' => 'fixed',
                'value' => 50000,
                'min_order_amount' => 500000,
                'max_discount_amount' => 50000,
                'usage_limit' => 300,
                'used_count' => 0,
                'limit_per_user' => 3,
                'is_active' => true,
                'starts_at' => now()->subDay(),
                'expires_at' => now()->addYear(),
            ],
            [
                'code' => 'WELCOME',
                'title' => 'Ưu đãi thành viên mới',
                'description' => 'Giảm 15% tối đa 150.000đ cho đơn hàng đầu tiên.',
                'type' => 'percent',
                'value' => 15,
                'min_order_amount' => 0,
                'max_discount_amount' => 150000,
                'usage_limit' => 2000,
                'used_count' => 0,
                'limit_per_user' => 1,
                'is_active' => true,
                'starts_at' => now()->subDay(),
                'expires_at' => now()->addYear(),
            ],
            [
                'code' => 'STRIKER100K',
                'title' => 'Giảm 100.000đ',
                'description' => 'Áp dụng cho đơn hàng từ 500.000đ trở lên.',
                'type' => 'fixed',
                'value' => 100000,
                'min_order_amount' => 500000,
                'max_discount_amount' => 100000,
                'usage_limit' => 1000,
                'used_count' => 0,
                'limit_per_user' => 3,
                'is_active' => true,
                'starts_at' => now()->subDay(),
                'expires_at' => now()->addYear(),
            ],
            [
                'code' => 'WELCOME10',
                'title' => 'Giảm 10% Tối Đa 150K',
                'description' => 'Dành riêng cho khách hàng mới, áp dụng cho mọi đơn hàng.',
                'type' => 'percent',
                'value' => 10,
                'min_order_amount' => 0,
                'max_discount_amount' => 150000,
                'usage_limit' => 1000,
                'used_count' => 0,
                'limit_per_user' => 1,
                'is_active' => true,
                'starts_at' => now()->subDay(),
                'expires_at' => now()->addYear(),
            ],
            [
                'code' => 'GOAL628',
                'title' => 'Voucher GOAL628',
                'description' => 'Ưu đãi đặc biệt giảm 50.000đ cho đơn từ 300.000đ.',
                'type' => 'fixed',
                'value' => 50000,
                'min_order_amount' => 300000,
                'max_discount_amount' => 50000,
                'usage_limit' => 1000,
                'used_count' => 0,
                'limit_per_user' => 5,
                'is_active' => true,
                'starts_at' => now()->subDay(),
                'expires_at' => now()->addYear(),
            ],
        ];

        foreach ($coupons as $coupon) {
            Coupon::updateOrCreate(
                ['code' => $coupon['code']],
                $coupon
            );
        }
    }
}
