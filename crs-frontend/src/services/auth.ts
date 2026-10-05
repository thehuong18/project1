import api from './api'
import type { Address, User } from '../types'

export function mapDbAddress(raw: Record<string, any>): Address {
  return {
    id: String(raw.id ?? ''),
    fullName: raw.recipient_name ?? raw.full_name ?? raw.name ?? '',
    phone: raw.phone ?? '',
    province: raw.province ?? raw.city ?? '',
    district: raw.district ?? '',
    ward: raw.ward ?? '',
    detailAddress: raw.street_address ?? raw.detail_address ?? raw.street ?? raw.address ?? '',
    street: raw.street_address ?? raw.detail_address ?? raw.street ?? raw.address ?? '',
    isDefault: Boolean(raw.is_default ?? raw.isDefault ?? false),
    provinceId: raw.province_id ? Number(raw.province_id) : undefined,
    districtId: raw.district_id ? Number(raw.district_id) : undefined,
    wardCode: raw.ward_code ? String(raw.ward_code) : undefined,
    province_id: raw.province_id ? Number(raw.province_id) : undefined,
    district_id: raw.district_id ? Number(raw.district_id) : undefined,
    ward_code: raw.ward_code ? String(raw.ward_code) : undefined,
  }
}

export type LoginCredentials = {
  login?: string
  email?: string
  phone?: string
  password?: string
}

export async function login(identifierOrPayload: string | LoginCredentials, password?: string) {
  let payload: Record<string, any>
  if (typeof identifierOrPayload === 'string') {
    const isEmail = identifierOrPayload.includes('@')
    payload = {
      login: identifierOrPayload,
      email: isEmail ? identifierOrPayload : undefined,
      phone: !isEmail ? identifierOrPayload : undefined,
      password: password,
    }
  } else {
    payload = identifierOrPayload
  }
  const response = await api.post('/auth/login', payload)
  return response.data
}

export type RegisterPayload = {
  name: string
  email?: string
  phone?: string
  password?: string
}

export async function register(
  nameOrPayload: string | RegisterPayload,
  identifierOrEmail?: string,
  password?: string
) {
  let payload: Record<string, any>
  if (typeof nameOrPayload === 'string') {
    if (identifierOrEmail && identifierOrEmail.includes('@')) {
      payload = {
        name: nameOrPayload,
        email: identifierOrEmail,
        password: password,
      }
    } else {
      payload = {
        name: nameOrPayload,
        phone: identifierOrEmail,
        password: password,
      }
    }
  } else {
    payload = nameOrPayload
  }
  const response = await api.post('/auth/register', payload)
  return response.data
}

export async function verifyEmail(email: string, otp: string) {
  const response = await api.post('/auth/verify-email', { email, otp_code: otp, otp })
  return response.data
}

export async function resendOtp(email: string) {
  const response = await api.post('/auth/resend-otp', { email })
  return response.data
}

export async function forgotPassword(email: string) {
  const response = await api.post('/auth/forgot-password/send-otp', { email })
  return response.data
}

export async function sendResetOtp(email: string) {
  const response = await api.post('/auth/forgot-password/send-otp', { email })
  return response.data
}

export async function verifyResetOtp(email: string, otp: string) {
  const response = await api.post('/auth/forgot-password/verify-otp', { email, otp })
  return response.data
}


export async function fetchAddresses(userId?: string | number): Promise<Address[]> {
  const response = await api.get('/auth/addresses', { params: userId ? { user_id: userId } : {} })
  const list = response.data?.data ?? response.data ?? []
  return Array.isArray(list) ? list.map(mapDbAddress) : []
}

export async function createAddress(
  userIdOrAddress: number | string | Omit<Address, 'id'>,
  addressData?: Omit<Address, 'id'>
): Promise<Address> {
  let userId: number | undefined
  let address: Omit<Address, 'id'> | any

  if (typeof userIdOrAddress === 'number' || (typeof userIdOrAddress === 'string' && !isNaN(Number(userIdOrAddress)))) {
    userId = Number(userIdOrAddress)
    address = addressData
  } else {
    address = userIdOrAddress
    userId = address.user_id ? Number(address.user_id) : undefined
  }

  // Fallback lấy userId từ localStorage nếu chưa truyền
  if (!userId) {
    try {
      const stored = localStorage.getItem('crs_user')
      if (stored) {
        const u = JSON.parse(stored)
        if (u?.id) userId = Number(u.id)
      }
    } catch {
      // ignore
    }
  }

  const payload = {
    user_id: userId,
    recipient_name: address.fullName ?? address.recipient_name ?? address.name ?? '',
    phone: address.phone ?? '',
    province: address.province ?? '',
    district: address.district ?? '',
    ward: address.ward ?? '',
    street_address: address.detailAddress ?? address.street ?? address.street_address ?? address.address ?? '',
    is_default: Boolean(address.isDefault ?? address.is_default ?? false),
    province_id: address.province_id || address.provinceId,
    district_id: address.district_id || address.districtId,
    ward_code: address.ward_code || address.wardCode,
  }

  const response = await api.post('/auth/addresses', payload)
  const mapped = mapDbAddress(response.data?.data ?? response.data)
  return {
    ...mapped,
    province_id: mapped.province_id || address.province_id || address.provinceId,
    district_id: mapped.district_id || address.district_id || address.districtId,
    ward_code: mapped.ward_code || address.ward_code || address.wardCode,
    provinceId: mapped.provinceId || address.provinceId || address.province_id,
    districtId: mapped.districtId || address.districtId || address.district_id,
    wardCode: mapped.wardCode || address.wardCode || address.ward_code,
  }
}

export async function updateAddress(id: string | number, address: Partial<Address>): Promise<Address> {
  const payload: Record<string, any> = {}
  if (address.fullName !== undefined) payload.recipient_name = address.fullName
  if (address.phone !== undefined) payload.phone = address.phone
  if (address.province !== undefined) payload.province = address.province
  if (address.district !== undefined) payload.district = address.district
  if (address.ward !== undefined) payload.ward = address.ward
  if (address.street !== undefined || address.detailAddress !== undefined) {
    payload.street_address = address.street ?? address.detailAddress
  }
  if (address.isDefault !== undefined) payload.is_default = address.isDefault
  if (address.provinceId !== undefined || address.province_id !== undefined) {
    payload.province_id = address.provinceId ?? address.province_id
  }
  if (address.districtId !== undefined || address.district_id !== undefined) {
    payload.district_id = address.districtId ?? address.district_id
  }
  if (address.wardCode !== undefined || address.ward_code !== undefined) {
    payload.ward_code = address.wardCode ?? address.ward_code
  }

  const response = await api.put(`/auth/addresses/${id}`, payload)
  const mapped = mapDbAddress(response.data?.data ?? response.data)
  return {
    ...mapped,
    province_id: mapped.province_id || address.province_id || address.provinceId,
    district_id: mapped.district_id || address.district_id || address.districtId,
    ward_code: mapped.ward_code || address.ward_code || address.wardCode,
    provinceId: mapped.provinceId || address.provinceId || address.province_id,
    districtId: mapped.districtId || address.districtId || address.district_id,
    wardCode: mapped.wardCode || address.wardCode || address.ward_code,
  }
}

export async function deleteAddress(id: string): Promise<void> {
  await api.delete(`/auth/addresses/${id}`)
}

export async function setDefaultAddress(id: string): Promise<void> {
  await api.patch(`/auth/addresses/${id}/default`)
}

export async function updateProfile(data: Partial<User>): Promise<User> {
  const response = await api.patch('/auth/profile', data)
  return response.data?.data ?? response.data
}

export async function fetchUsers(params: Record<string, any> = {}) {
  const response = await api.get('/users', { params })
  return response.data
}

export async function toggleUserStatus(id: string | number, isActive?: boolean) {
  const payload = isActive !== undefined ? { is_active: isActive } : {}
  const response = await api.patch(`/users/${id}/status`, payload)
  return response.data?.data ?? response.data
}
