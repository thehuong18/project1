import api from './api'
import axios from 'axios'
import type { Order, OrderItem } from '../types'

export interface CreateOrderPayload {
  user_id?: number
  name: string
  phone: string
  address: string
  to_district_id?: number
  to_ward_code?: string
  shipping_name?: string
  shipping_address?: string
  shipping_fee?: number
  discount_amount?: number
  payment_method: 'cod' | 'momo' | string
  coupon_id?: number | string
  coupon_code?: string
  note?: string
  items?: Array<{
    product_id: number
    product_name?: string
    name?: string
    price: number
    quantity: number
    size?: string
    selectedSize?: string
    color?: string
    selectedColor?: string
    sku?: string
    image?: string
  }>
}

export async function createOrder(payload: CreateOrderPayload) {
  try {
    const response = await api.post('/orders', payload)
    return {
      order: response.data?.data ?? response.data,
      payUrl: response.data?.pay_url ?? response.data?.data?.pay_url,
      raw: response.data,
    }
  } catch (error: any) {
    if (error?.response?.data?.errors) {
      console.log('Lỗi validation:', error.response.data.errors)
    }
    throw error
  }
}

export async function getMomoPayUrl(orderId: number): Promise<string | null> {
  if (!Number.isSafeInteger(orderId) || orderId < 1) {
    return null
  }

  try {
    const response = await api.post('/payment/momo/start', { order_id: orderId })
    return response.data?.data?.pay_url ?? response.data?.pay_url ?? null
  } catch (error) {
    if (axios.isAxiosError<{ message?: string }>(error)) {
      console.error('MoMo không thể khởi tạo thanh toán:', error.response?.data?.message ?? error.message)
      throw new Error(error.response?.data?.message ?? 'Không thể khởi tạo thanh toán MoMo.')
    }
    throw error
  }
}

export async function fetchOrders(userId?: number) {
  const params: Record<string, any> = { per_page: 100 }
  if (userId) params.user_id = userId
  const response = await api.get('/orders', { params })
  return response.data?.data ?? response.data
}

export async function fetchSalesSummary(): Promise<Record<number, number>> {
  try {
    const response = await api.get('/orders/sales-summary')
    return response.data?.data ?? response.data ?? {}
  } catch {
    return {}
  }
}

export async function fetchAdminOrders(params?: { status?: string; search?: string; page?: number; per_page?: number }) {
  const response = await api.get('/orders', { params })
  return response.data?.data ?? response.data
}

export interface OrderStats {
  total: number
  revenue?: number
  pending: number
  processing?: number
  shipping: number
  delivered: number
  cancelled: number
}

export async function fetchOrderStats(): Promise<OrderStats> {
  try {
    const response = await api.get('/orders/stats')
    return response.data?.data ?? { total: 0, revenue: 0, pending: 0, shipping: 0, delivered: 0, cancelled: 0 }
  } catch {
    return { total: 0, revenue: 0, pending: 0, shipping: 0, delivered: 0, cancelled: 0 }
  }
}

export async function fetchOrderById(orderId: string) {
  const response = await api.get(`/orders/${orderId}`)
  return response.data?.data ?? response.data
}

export async function addCartItem(payload: { user_id: number; product_id: number; quantity: number; price: number }) {
  return api.post('/cart/items', payload)
}

export async function cancelOrder(orderId: string | number) {
  const response = await api.patch(`/orders/${orderId}/status`, { order_status: 'cancelled' })
  return response.data?.data ?? response.data
}

/** Map a raw order-service response to the frontend Order type */
export function mapBackendOrder(raw: Record<string, any>): Order {
  const items: OrderItem[] = (raw.items ?? raw.order_items ?? []).map((i: Record<string, any>) => {
    let img = i.image ?? i.product_image ?? i.product?.image ?? i.product?.image_url ?? (Array.isArray(i.images) ? i.images[0] : '') ?? ''
    if (img && typeof img === 'string' && !img.startsWith('http') && !img.startsWith('data:')) {
      img = img.startsWith('/') ? `${import.meta.env.VITE_STORAGE_URL || 'http://localhost:8000'}${img}` : `${import.meta.env.VITE_STORAGE_URL || 'http://localhost:8000'}/storage/${img}`
    }
    return {
      id: Number(i.product_id ?? i.id),
      name: i.product_name ?? i.name ?? `Sản phẩm #${i.product_id ?? i.id}`,
      brand: i.brand ?? '',
      image: img || 'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=300&q=80',
      price: Number(i.unit_price ?? i.price ?? 0),
      quantity: Number(i.quantity ?? 1),
      selectedSize: i.variant_attributes?.size ?? i.size ?? undefined,
      selectedColor: i.variant_attributes?.color ?? i.color ?? undefined,
    }
  })

  // Parse created_at → "dd/mm/yyyy"
  let date = raw.created_at
    ? new Date(raw.created_at).toLocaleDateString('vi-VN')
    : ''
  if (!date && raw.date) date = raw.date

  const orderCode = raw.order_code ?? raw.code ?? raw.order_number ?? String(raw.id)

  return {
    id: orderCode,
    backendId: Number.isSafeInteger(Number(raw.id)) && Number(raw.id) > 0 ? Number(raw.id) : undefined,
    date,
    status: raw.order_status ?? raw.status ?? 'pending',
    paymentStatus: raw.payment_status ?? 'unpaid',
    total: Number(raw.total_amount ?? raw.total ?? 0),
    subtotal: Number(raw.subtotal ?? 0),
    shippingFee: Number(raw.shipping_fee ?? 0),
    discountAmount: Number(raw.discount_amount ?? 0),
    appliedCouponCode: raw.coupon?.code ?? raw.coupon_code ?? undefined,
    itemsCount: items.length,
    itemsList: items,
    customer: {
      name: raw.shipping_name ?? raw.name ?? raw.customer?.name ?? '',
      phone: raw.shipping_phone ?? raw.phone ?? raw.customer?.phone ?? '',
      email: raw.user_email ?? raw.customer?.email ?? undefined,
      address: raw.shipping_address ?? raw.address ?? raw.customer?.address ?? '',
      city: raw.customer?.city ?? '',
      district: raw.customer?.district ?? '',
      ward: raw.customer?.ward ?? undefined,
      note: raw.note ?? raw.customer?.note ?? undefined,
    },
    paymentMethod: raw.payment_method ?? (raw.payment_transactions?.[0]?.gateway ?? 'cod'),
    ghn_code: raw.ghn_code ?? undefined,
    ghnTrackingCode: raw.ghn_code ?? undefined,
    userId: raw.user_id,
  }
}
