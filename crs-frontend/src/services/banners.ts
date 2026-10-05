import api from './api'
import type { BannerSlide } from '../types'

export async function fetchBanners(params: Record<string, string | number | boolean> = {}): Promise<BannerSlide[]> {
  const response = await api.get('/banners', { params })
  const list = response.data?.data ?? response.data ?? []
  return Array.isArray(list) ? list.map(mapDbBanner) : []
}

export async function createBanner(payload: Partial<BannerSlide>): Promise<BannerSlide> {
  const response = await api.post('/banners', payload)
  return mapDbBanner(response.data?.data ?? response.data)
}

export async function updateBanner(id: string | number, payload: Partial<BannerSlide>): Promise<BannerSlide> {
  const response = await api.patch(`/banners/${id}`, payload)
  return mapDbBanner(response.data?.data ?? response.data)
}

export async function deleteBanner(id: string | number): Promise<void> {
  await api.delete(`/banners/${id}`)
}

export function mapDbBanner(raw: Record<string, any>): BannerSlide {
  return {
    id: raw.id,
    title: raw.title ?? '',
    subtitle: raw.subtitle ?? '',
    tag: raw.tag ?? '',
    image: raw.image ?? '',
    link: raw.link ?? '',
    order: raw.order ? Number(raw.order) : 1,
    isActive: Boolean(raw.is_active ?? raw.isActive ?? true),
  }
}
