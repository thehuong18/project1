import api from './api'
import type { Coupon } from '../types'

export async function fetchCoupons(params: Record<string, string | number> = {}) {
  const response = await api.get('/coupons', { params })
  return response.data?.data ?? response.data
}

export async function createCoupon(payload: Partial<Coupon>) {
  const response = await api.post('/coupons', payload)
  return response.data?.data ?? response.data
}

export async function updateCoupon(id: string | number, payload: Partial<Coupon>) {
  const response = await api.patch(`/coupons/${id}`, payload)
  return response.data?.data ?? response.data
}

export async function deleteCoupon(id: string | number) {
  const response = await api.delete(`/coupons/${id}`)
  return response.data?.data ?? response.data
}

export async function applyCoupon(code: string, subtotal: number, shippingFee = 30000) {
  const response = await api.post('/coupons/apply', { code, subtotal, shipping_fee: shippingFee })
  return response.data?.data ?? response.data
}
