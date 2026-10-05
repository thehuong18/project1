<?php

namespace App\Services;

use App\Models\Coupon;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Str;

class CouponService
{
    /**
     * Validate a coupon and calculate the discount amount.
     *
     * @param string|null $couponCode
     * @param int|null $couponId
     * @param float $subtotal
     * @param float $shippingFee
     * @param bool $lockForUpdate
     * @return array{coupon: Coupon|null, discount_amount: float, shipping_fee: float, coupon_id: int|null}
     * @throws Exception
     */
    public function validateAndCalculate(
        ?string $couponCode,
        ?int $couponId,
        float $subtotal,
        float $shippingFee = 30000,
        bool $lockForUpdate = false
    ): array {
        if (empty($couponCode) && empty($couponId)) {
            return [
                'coupon' => null,
                'discount_amount' => 0.0,
                'shipping_fee' => $shippingFee,
                'coupon_id' => null,
            ];
        }

        $couponQuery = Coupon::query()->where('is_active', true);
        if ($lockForUpdate) {
            $couponQuery->lockForUpdate();
        }

        if (!empty($couponId)) {
            $coupon = $couponQuery->where('id', $couponId)->first();
        } else {
            $coupon = $couponQuery->where('code', Str::upper(trim($couponCode)))->first();
        }

        if (!$coupon) {
            throw new Exception('Mã giảm giá không tồn tại hoặc đã bị vô hiệu hóa.', 422);
        }

        // Check expiration
        if ($coupon->expires_at && Carbon::parse($coupon->expires_at)->endOfDay()->isPast()) {
            throw new Exception('Mã giảm giá này đã hết hạn sử dụng.', 422);
        }

        // Check usage limit
        if ($coupon->usage_limit && $coupon->used_count >= $coupon->usage_limit) {
            throw new Exception('Mã giảm giá này đã hết lượt sử dụng.', 422);
        }

        // Check minimum order amount
        if ($subtotal < (float) $coupon->min_order_amount) {
            throw new Exception('Đơn hàng tối thiểu ' . number_format($coupon->min_order_amount, 0, ',', '.') . 'đ để sử dụng mã này.', 422);
        }

        // Calculate discount based on coupon type
        $discountAmount = 0.0;
        $adjustedShippingFee = $shippingFee;

        if ($coupon->type === 'fixed') {
            $discountAmount = min($subtotal > 0 ? $subtotal : (float) $coupon->value, (float) $coupon->value);
        } elseif ($coupon->type === 'percent') {
            $rawDiscount = ($subtotal * (float) $coupon->value) / 100;
            $discountAmount = ($coupon->max_discount_amount && (float) $coupon->max_discount_amount > 0)
                ? min($rawDiscount, (float) $coupon->max_discount_amount)
                : $rawDiscount;
        } elseif ($coupon->type === 'freeship') {
            $freeshipDiscount = min($shippingFee, (float) ($coupon->value > 0 ? $coupon->value : $shippingFee));
            $discountAmount = $freeshipDiscount;
            $adjustedShippingFee = max(0.0, $shippingFee - $freeshipDiscount);
        }

        return [
            'coupon' => $coupon,
            'discount_amount' => (float) $discountAmount,
            'shipping_fee' => (float) $adjustedShippingFee,
            'coupon_id' => $coupon->id,
        ];
    }

    /**
     * Increment coupon usage count.
     */
    public function incrementUsage(Coupon $coupon): void
    {
        $coupon->increment('used_count');
    }
}
