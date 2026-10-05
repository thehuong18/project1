import api from './api'

export interface GHNProvince {
  ProvinceID: number
  ProvinceName: string
  Code?: string
  NameExtension?: string[]
}

export interface GHNDistrict {
  DistrictID: number
  ProvinceID: number
  DistrictName: string
  Code?: string
  NameExtension?: string[]
}

export interface GHNWard {
  WardCode: string
  DistrictID: number
  WardName: string
  NameExtension?: string[]
}

export interface GHNFeeData {
  total: number
  service_fee: number
  insurance_fee: number
  pick_station_fee?: number
  coupon_value?: number
  r2s_fee?: number
}

export const DEFAULT_SHIPPING_FEE: GHNFeeData = {
  total: 30000,
  service_fee: 30000,
  insurance_fee: 0,
}

// In-memory caches to speed up repeated lookups
let provincesCache: GHNProvince[] | null = null
const districtsCacheByProvince: Record<number, GHNDistrict[]> = {}
const wardsCacheByDistrict: Record<number, GHNWard[]> = {}

export async function fetchProvinces(): Promise<GHNProvince[]> {
  if (provincesCache && provincesCache.length > 0) {
    return provincesCache
  }
  try {
    const response = await api.get('/shipping/provinces')
    const list: GHNProvince[] = response.data?.data ?? []
    if (list.length > 0) {
      provincesCache = list
    }
    return list
  } catch {
    return provincesCache ?? []
  }
}

export async function fetchDistricts(provinceId: number): Promise<GHNDistrict[]> {
  if (!provinceId) return []
  if (districtsCacheByProvince[provinceId]) {
    return districtsCacheByProvince[provinceId]
  }
  try {
    const response = await api.get('/shipping/districts', {
      params: { province_id: provinceId },
    })
    const list: GHNDistrict[] = response.data?.data ?? []
    if (list.length > 0) {
      districtsCacheByProvince[provinceId] = list
    }
    return list
  } catch {
    return districtsCacheByProvince[provinceId] ?? []
  }
}

export async function fetchWards(districtId: number): Promise<GHNWard[]> {
  if (!districtId) return []
  if (wardsCacheByDistrict[districtId]) {
    return wardsCacheByDistrict[districtId]
  }
  try {
    const response = await api.get('/shipping/wards', {
      params: { district_id: districtId },
    })
    const list: GHNWard[] = response.data?.data ?? []
    if (list.length > 0) {
      wardsCacheByDistrict[districtId] = list
    }
    return list
  } catch {
    return wardsCacheByDistrict[districtId] ?? []
  }
}

/**
 * Chuẩn hóa chuỗi tiếng Việt địa giới hành chính:
 * - Chuyển Unicode sang chuẩn NFC
 * - Loại bỏ các tiền tố hành chính: Tỉnh, Thành phố, TP, TP., Quận, Q, Q., Huyện, H, H., Thị xã, TX, TX., Phường, P, P., Xã, Thị trấn, TT, TT.
 * - Loại bỏ ký tự đặc biệt, dấu câu, khoảng trắng thừa
 */
export function normalizeVietnameseLocation(name: string): string {
  if (!name) return ''
  return name
    .normalize('NFC')
    .toLowerCase()
    .replace(/^(tỉnh|thành phố|tp\.|tp|quận|q\.|q|huyện|h\.|h|thị xã|tx\.|tx|phường|p\.|p|xã|thị trấn|tt\.|tt)\s*/gi, '')
    .replace(/[.,\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Bỏ dấu tiếng Việt phục vụ so khớp mềm
 */
export function removeVietnameseDiacritics(str: string): string {
  if (!str) return ''
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim()
}

/**
 * Thuật toán so khớp địa chỉ đa tầng (Multi-pass Matching):
 * 1. Khớp mã trực tiếp (Code/WardCode/DistrictID)
 * 2. Khớp chuỗi gốc chính xác
 * 3. Khớp tên đã chuẩn hóa tiền tố chính xác
 * 4. Khớp qua danh sách mở rộng (NameExtension) của GHN
 * 5. Khớp qua chuỗi không dấu
 * 6. Khớp chứa chuỗi an toàn (chỉ áp dụng khi độ dài chuỗi tìm kiếm >= 2 ký tự)
 */
export function matchGhnLocation<T extends Record<string, any>>(
  userInput: string,
  list: T[],
  nameField: keyof T,
  codeField?: keyof T,
  extensionField: keyof T = 'NameExtension' as keyof T
): T | undefined {
  if (!userInput || !Array.isArray(list) || list.length === 0) return undefined

  const rawInput = userInput.trim().toLowerCase()
  const cleanInput = normalizeVietnameseLocation(userInput)
  const noAccentsInput = removeVietnameseDiacritics(cleanInput)

  // Pass 1: Khớp chính xác theo mã code
  if (codeField) {
    const codeMatch = list.find(
      (item) => String(item[codeField] ?? '').trim().toLowerCase() === rawInput
    )
    if (codeMatch) return codeMatch
  }

  // Pass 2: Khớp chính xác theo tên gốc
  const rawMatch = list.find(
    (item) => String(item[nameField] ?? '').trim().toLowerCase() === rawInput
  )
  if (rawMatch) return rawMatch

  // Pass 3: Khớp theo tên đã chuẩn hóa (bỏ tiền tố Quận/Huyện/TP)
  const normalizedMatch = list.find(
    (item) => normalizeVietnameseLocation(String(item[nameField] ?? '')) === cleanInput
  )
  if (normalizedMatch) return normalizedMatch

  // Pass 4: Khớp trong mảng tên thay thế
  for (const item of list) {
    const exts = item[extensionField] as unknown
    if (Array.isArray(exts)) {
      for (const ext of exts as unknown[]) {
        const rawExt = String(ext ?? '').trim().toLowerCase()
        const cleanExt = normalizeVietnameseLocation(String(ext ?? ''))
        if (rawExt === rawInput || cleanExt === cleanInput) {
          return item
        }
      }
    }
  }

  // Pass 5: Khớp bỏ dấu tiếng Việt
  const noAccentMatch = list.find((item) => {
    const cleanItemName = normalizeVietnameseLocation(String(item[nameField] ?? ''))
    return removeVietnameseDiacritics(cleanItemName) === noAccentsInput
  })
  if (noAccentMatch) return noAccentMatch

  // Pass 6: Substring / Contains match (an toàn, tránh match nhầm các quận 1, 10, 11)
  if (cleanInput.length >= 2) {
    // 6a: Mục GHN chứa toàn bộ input hoặc input chứa mục GHN
    const substringMatch = list.find((item) => {
      const cleanItemName = normalizeVietnameseLocation(String(item[nameField] ?? ''))
      return cleanItemName.includes(cleanInput) || cleanInput.includes(cleanItemName)
    })
    if (substringMatch) return substringMatch

    // 6b: Extension contains match (Nếu từ khóa có chiều dài từ 2 ký tự trở lên và các pass trên đều trượt, nó sẽ kiểm tra xem từ khóa có nằm lọt thỏm bên trong tên địa danh hay không (hoặc ngược lại).)
    for (const item of list) {
      const exts = item[extensionField] as unknown
      if (Array.isArray(exts)) {
        for (const ext of exts as unknown[]) {
          const cleanExt = normalizeVietnameseLocation(String(ext ?? ''))
          if (cleanExt.includes(cleanInput) || cleanInput.includes(cleanExt)) {
            return item
          }
        }
      }
    }
  }

  return undefined
}

/**
 * Tự động phân giải ID GHN (district_id và ward_code) từ địa chỉ text hoặc ID có sẵn.
 * Yêu cầu: Phải có đủ Tỉnh/Thành, Quận/Huyện và Phường/Xã mới phân giải.
 */
export async function resolveLocationToGhnIds(addr: {
  province?: string
  district?: string
  ward?: string
  provinceId?: number
  districtId?: number
  wardCode?: string
  province_id?: number
  district_id?: number
  ward_code?: string
}): Promise<{ districtId: number; wardCode: string } | null> {
  const existingDistrictId = Number(addr.district_id || addr.districtId || 0)
  const existingWardCode = String(addr.ward_code || addr.wardCode || '').trim()

  if (existingDistrictId > 0 && existingWardCode) {
    return { districtId: existingDistrictId, wardCode: existingWardCode }
  }

  // Bắt buộc phải có đủ Tỉnh/Thành, Quận/Huyện, Phường/Xã
  if (!addr.province?.trim() || !addr.district?.trim() || !addr.ward?.trim()) {
    return null
  }

  try {
    const provList = await fetchProvinces()
    const matchedProv = matchGhnLocation(addr.province, provList, 'ProvinceName', 'Code')
    if (!matchedProv) return null

    const distList = await fetchDistricts(matchedProv.ProvinceID)
    const matchedDist = matchGhnLocation(addr.district, distList, 'DistrictName', 'Code')
    if (!matchedDist) return null

    const wardList = await fetchWards(matchedDist.DistrictID)
    const matchedWard = matchGhnLocation(addr.ward, wardList, 'WardName', 'WardCode')
    if (!matchedWard) return null

    return {
      districtId: matchedDist.DistrictID,
      wardCode: String(matchedWard.WardCode),
    }
  } catch (error: any) {
    console.error('Lỗi phân giải địa giới GHN:', error?.response?.data || error)
    return null
  }
}

/**
 * Tính phí vận chuyển GHN:
 * - Truyền payload khớp 100% với validation của Backend (to_district_id: int, to_ward_code: string)
 * - Chỉ gọi khi có đủ to_district_id và to_ward_code
 * - Trả về dữ liệu phí ship thật từ GHN API
 */
export async function calculateShippingFee(payload: {
  to_district_id: number
  to_ward_code: string
  weight?: number
  insurance_value?: number
  length?: number
  width?: number
  height?: number
}): Promise<GHNFeeData> {
  const districtId = Number(payload.to_district_id)
  const wardCode = String(payload.to_ward_code ?? '').trim()

  if (!districtId || !wardCode) {
    throw new Error('Chưa chọn đủ Quận/Huyện và Phường/Xã hợp lệ.')
  }

  const backendPayload = {
    to_district_id: districtId,
    to_ward_code: wardCode,
    weight: Math.max(100, Number(payload.weight ?? 500)),
    insurance_value: Math.max(0, Number(payload.insurance_value ?? 0)),
    length: Math.max(5, Number(payload.length ?? 20)),
    width: Math.max(5, Number(payload.width ?? 15)),
    height: Math.max(5, Number(payload.height ?? 10)),
  }

  const response = await api.post('/shipping/fee', backendPayload)
  return response.data?.data
}
