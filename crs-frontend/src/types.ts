export type Role = 'user' | 'admin'

export type ProductVariant = {
  id?: number
  sku: string
  price?: number
  sale_price?: number
  stock: number
  attributes: {
    size?: string
    color?: string
    [key: string]: any
  }
  is_active?: boolean
}

export type CategoryItem = {
  id: number | string
  name: string
  description?: string
  slug?: string
}

export type BrandItem = {
  id: number | string
  name: string
  description?: string
  logo?: string
}

export type Product = {
  id: number
  name: string
  sku?: string
  brand: string
  brand_id?: number
  category: string
  category_id?: number
  price: number
  oldPrice?: number
  image: string
  images?: string[]
  tag?: string
  rating?: number
  reviewsCount?: number
  stock: number
  description: string
  colors: string[]
  sizes: string[]
  variants?: ProductVariant[]
  isActive?: boolean
  is_active?: boolean
  status?: 'active' | 'inactive'
  is_deleted?: boolean
  isDeleted?: boolean
}

export type CartItem = Product & {
  cartItemId: string
  quantity: number
  selectedSize?: string
  selectedColor?: string
  selected?: boolean
}

export type CouponType = 'fixed' | 'percent' | 'freeship'

export type Coupon = {
  id: string
  code: string
  title: string
  description: string
  discountType: CouponType
  discountValue: number
  minOrderValue: number
  maxDiscount?: number
  expiresAt: string
  tag?: 'HOT' | 'NEW' | 'FREESHIP' | 'VIP' | 'FLASH'
  usageCount?: number
  totalUsageLimit?: number
  isActive?: boolean
  is_deleted?: boolean
  isDeleted?: boolean
}

export type OrderStatus = 'pending' | 'processing' | 'shipping' | 'delivered' | 'paid' | 'cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'unpaid'

export type OrderItem = {
  id: number
  name: string
  brand: string
  image: string
  price: number
  quantity: number
  selectedSize?: string
  selectedColor?: string
}

export type Address = {
  id: string
  fullName: string
  phone: string
  province: string
  district: string
  ward: string
  detailAddress?: string
  street?: string
  isDefault?: boolean
  provinceId?: number
  districtId?: number
  wardCode?: string
  province_id?: number
  district_id?: number
  ward_code?: string
}

export type User = {
  id: string | number
  name: string
  email: string
  phone?: string
  phone_number?: string
  role: Role
  avatar?: string
  addresses?: Address[]
  createdAt?: string
  current_password?: string
  password?: string
  new_password?: string
}

export type Order = {
  id: string
  date: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  total: number
  subtotal: number
  shippingFee: number
  discountAmount: number
  appliedCouponCode?: string
  ghnTrackingCode?: string
  ghn_code?: string
  itemsCount: number
  isReviewed?: boolean
  itemsList: OrderItem[]
  userId?: string | number
  userEmail?: string
  customer?: any
  customerInfo?: {
    name: string
    phone: string
    email: string
    address: string
  }
  paymentMethod?: string
  shippingAddress?: Address
  notes?: string
}

export type Customer = {
  id: string | number
  name: string
  email: string
  phone: string
  avatar?: string
  address?: string
  joinDate?: string
  tier?: string
  ordersCount: number
  totalSpent: number
  createdAt?: string
  registeredAt?: string
  status: 'active' | 'blocked'
}

export type BannerSlide = {
  id: string | number
  title: string
  subtitle?: string
  image: string
  link?: string
  order?: number
  tag?: string
  isActive: boolean
  is_active?: boolean
}

export type ShopSettings = {
  shopName: string
  logo?: string
  phone?: string
  hotline?: string
  email: string
  address: string
  workingHours: string
  warrantyPolicy?: string
  copyright?: string
}

export type Review = {
  id: string | number
  productId: number
  orderId?: string
  userId?: string | number
  userName: string
  userAvatar?: string
  rating: number
  comment: string
  date: string
  images?: string[]
}
