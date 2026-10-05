import api from './api'
import type { Review } from '../types'

/** Map DB review fields → frontend Review type */
export function mapDbReview(raw: Record<string, any>): Review {
  return {
    id: String(raw.id),
    productId: Number(raw.product_id),
    orderId: raw.order_id ? String(raw.order_id) : undefined,
    userName: raw.user_name ?? 'Người dùng',
    userAvatar: raw.user_avatar ?? undefined,
    rating: Number(raw.rating),
    comment: raw.comment ?? '',
    date: raw.created_at
      ? new Date(raw.created_at).toLocaleDateString('vi-VN')
      : new Date().toLocaleDateString('vi-VN'),
  }
}

export async function fetchReviews(productId: number): Promise<Review[]> {
  const response = await api.get('/reviews', { params: { product_id: productId } })
  const data: any[] = response.data?.data ?? response.data ?? []
  return data.map(mapDbReview)
}

export interface ReviewSummaryItem {
  product_id: number
  avg_rating: string | number
  review_count: number
}

export async function fetchReviewSummaries(): Promise<Record<number, ReviewSummaryItem>> {
  try {
    const response = await api.get('/reviews/summary')
    return response.data?.data ?? {}
  } catch {
    return {}
  }
}

export interface CreateReviewPayload {
  order_id: string
  product_id: number
  user_id: number
  user_name: string
  user_avatar?: string
  rating: number
  comment: string
}

export async function createReview(payload: CreateReviewPayload): Promise<Review> {
  const response = await api.post('/reviews', payload)
  return mapDbReview(response.data?.data ?? response.data)
}

export async function checkReviewed(
  orderId: string,
  productId: number,
  userId: number
): Promise<boolean> {
  try {
    const response = await api.get('/reviews/check', {
      params: { order_id: orderId, product_id: productId, user_id: userId },
    })
    return Boolean(response.data?.data?.reviewed ?? false)
  } catch {
    return false
  }
}
