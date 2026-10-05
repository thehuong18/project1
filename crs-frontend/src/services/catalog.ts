import api from './api'
import type { Product } from '../types'

export async function fetchProducts(params: Record<string, string | number> = {}) {
  const response = await api.get('/products', { params })
  return response.data?.data ?? response.data
}

export async function fetchCategories() {
  const response = await api.get('/categories')
  return response.data?.data ?? response.data
}

export async function fetchBrands() {
  const response = await api.get('/brands')
  return response.data?.data ?? response.data
}

export async function checkStock(items: Array<{ product_id: number; quantity: number }>) {
  const response = await api.post('/products/check-stock', { items })
  return response.data?.data ?? response.data
}

export async function createProduct(payload: Partial<Product>) {
  const response = await api.post('/products', payload)
  return response.data?.data ?? response.data
}

export async function updateProduct(id: number, payload: Partial<Product>) {
  const response = await api.patch(`/products/${id}`, payload)
  return response.data?.data ?? response.data
}

export async function deleteProduct(id: number) {
  const response = await api.delete(`/products/${id}`)
  return response.data?.data ?? response.data
}
