import type { Coupon } from '../types'


export const BASE_SHIPPING_FEE = 30000

export type OrderCalculation = {
  subtotal: number
  shippingFee: number
  discountAmount: number
  finalTotal: number
  freeShippingQualified: boolean
  remainingForFreeShipping: number
  isValid: boolean
  errorReason?: string
}

export function calculateOrderTotals(subtotal: number, coupon: Coupon | null): OrderCalculation {
  let baseShip = subtotal > 0 ? BASE_SHIPPING_FEE : 0
  let discountAmount = 0
  let isValid = true
  let errorReason: string | undefined
  let freeShippingQualified = false

  if (coupon) {
    if (subtotal < (coupon.minOrderValue ?? 0)) {
      isValid = false
      errorReason = `Đơn hàng tối thiểu ${(Number(coupon.minOrderValue ?? 0)).toLocaleString('vi-VN')}đ để sử dụng mã ${coupon.code}`
    } else {
      if (coupon.discountType === 'fixed') {
        discountAmount = Math.min(subtotal, coupon.discountValue)
      } else if (coupon.discountType === 'percent') {
        const rawDiscount = (subtotal * coupon.discountValue) / 100
        discountAmount = coupon.maxDiscount ? Math.min(rawDiscount, coupon.maxDiscount) : rawDiscount
      } else if (coupon.discountType === 'freeship') {
        const shipReduction = Math.min(baseShip, coupon.discountValue)
        baseShip = Math.max(0, baseShip - shipReduction)
        discountAmount = shipReduction
        if (baseShip === 0) {
          freeShippingQualified = true
        }
      }
    }
  }

  const finalTotal = Math.max(0, subtotal - discountAmount)

  return {
    subtotal,
    shippingFee: baseShip,
    discountAmount,
    finalTotal,
    freeShippingQualified,
    remainingForFreeShipping: 0,
    isValid,
    errorReason,
  }
}
