import { useState, useMemo, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Sparkles, Tag, Ticket, X } from 'lucide-react'
import { toast } from 'sonner'
import { fetchCoupons } from '../services/coupons'
import { useApp } from '../context/AppContext'
import type { Coupon } from '../types'
import { formatVND } from '../utils'

interface CouponModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectCoupon?: (coupon: Coupon) => void
}

const normalizeCoupon = (raw: any): Coupon => ({
  id: String(raw.id ?? raw.code),
  code: String(raw.code ?? ''),
  title: String(raw.title ?? raw.code ?? ''),
  description: String(raw.description ?? ''),
  discountType: raw.discountType ?? (raw.type === 'freeship' ? 'freeship' : raw.type === 'percent' ? 'percent' : 'fixed'),
  discountValue: Number(raw.discountValue ?? raw.value ?? 0),
  minOrderValue: Number(raw.minOrderValue ?? raw.min_order_amount ?? 0),
  maxDiscount: raw.maxDiscount != null ? Number(raw.maxDiscount) : raw.max_discount_amount != null ? Number(raw.max_discount_amount) : undefined,
  totalUsageLimit: Number(raw.totalUsageLimit ?? raw.usage_limit ?? 100),
  usageCount: Number(raw.usageCount ?? raw.used_count ?? 0),
  expiresAt: String(raw.expiresAt ?? raw.expires_at ?? ''),
  isActive: Boolean(raw.isActive ?? raw.is_active ?? true),
})

export function CouponModal({ isOpen, onClose, onSelectCoupon }: CouponModalProps) {
  const { cartSubtotal, appliedCoupon, applyCoupon, user, orders } = useApp()
  const [manualCode, setManualCode] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [apiCoupons, setApiCoupons] = useState<Coupon[]>([])

  useEffect(() => {
    if (isOpen) {
      fetchCoupons()
        .then((res) => {
          const list = Array.isArray(res) ? res : res?.data ?? []
          setApiCoupons(list.map(normalizeCoupon))
        })
        .catch(() => {
          setApiCoupons([])
        })
    }
  }, [isOpen])

  // Load dynamic active coupons from API or fallback to localStorage
  const availableCoupons: Coupon[] = useMemo(() => {
    if (apiCoupons.length > 0) {
      return apiCoupons.filter((c) => c.isActive !== false)
    }
    const stored = localStorage.getItem('crs_admin_vouchers')
    if (stored) {
      try {
        const parsed: unknown = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeCoupon).filter((c) => c.isActive !== false)
        }
      } catch {
        return []
      }
    }
    return []
  }, [apiCoupons])

  // Format expiry display
  const formatExpiryDisplay = (expiresAt?: string) => {
    if (!expiresAt) return ''
    try {
      if (expiresAt.includes('T') || (expiresAt.includes('-') && expiresAt.split('-')[0].length === 4)) {
        const d = new Date(expiresAt)
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('vi-VN')
        }
      }
      if (expiresAt.includes('/')) return expiresAt
    } catch {
      return expiresAt
    }
    return expiresAt
  }

  // Helper check voucher expiration
  const isVoucherExpired = (expiresAt?: string) => {
    if (!expiresAt) return false
    try {
      if (expiresAt.includes('/')) {
        const [d, m, y] = expiresAt.split('/')
        const expDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 23, 59, 59)
        return expDate.getTime() < Date.now()
      }
      const expDate = new Date(expiresAt)
      if (isNaN(expDate.getTime())) return false
      return expDate.getTime() < Date.now()
    } catch {
      return false
    }
  }

  const handleApply = async (coupon: Coupon) => {
    const result = await applyCoupon(coupon.code)
    if (result.success) {
      if (onSelectCoupon) onSelectCoupon(coupon)
      onClose()
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode.trim()) {
      toast.error('Vui lòng nhập mã giảm giá')
      return
    }
    const result = await applyCoupon(manualCode.trim())
    if (result.success) {
      setManualCode('')
      onClose()
    }
  }

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success(`Đã sao chép mã "${code}" vào bộ nhớ tạm!`)
    setTimeout(() => setCopiedCode(null), 2500)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0B0E17]/85 backdrop-blur-md"
          />

          {/* Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#131823] text-white shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-lime-400 to-emerald-500 text-slate-950 shadow-lg shadow-lime-500/20">
                  <Ticket size={20} className="stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-white">
                    Striker Vouchers
                  </h2>
                  <p className="text-xs text-slate-400">
                    Chọn hoặc nhập mã ưu đãi tốt nhất cho đơn hàng
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Manual Code Input Bar */}
            <div className="border-b border-white/5 bg-[#0B0E17]/60 px-6 py-4">
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Tag
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    placeholder="Nhập mã khuyến mãi khác..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-xs uppercase tracking-wider text-left text-white outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-500 focus:border-lime-400 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-xl bg-lime-400 px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-lime-300 cursor-pointer"
                >
                  Áp dụng
                </button>
              </form>
            </div>

            {/* Voucher List */}
            <div className="flex-1 space-y-3.5 overflow-y-auto p-6">
              {availableCoupons.map((coupon) => {
                const isSelected = appliedCoupon?.code === coupon.code
                const isExpired = isVoucherExpired(coupon.expiresAt)
                const isOutOfUsage =
                  typeof coupon.totalUsageLimit === 'number' &&
                  typeof coupon.usageCount === 'number' &&
                  coupon.usageCount >= coupon.totalUsageLimit

                // Check if user already used this voucher
                const isUsedByUser = Boolean(
                  user &&
                  orders.some(
                    (o) =>
                      (String(o.userId) === String(user.id) || o.customer?.email === user.email) &&
                      o.appliedCouponCode?.toUpperCase() === coupon.code.toUpperCase()
                  )
                )

                const isConditionMet = cartSubtotal >= (coupon.minOrderValue || 0)
                const isAvailable = !isExpired && !isOutOfUsage && !isUsedByUser
                const isEligible = isAvailable && isConditionMet
                const missingAmount = (coupon.minOrderValue || 0) - cartSubtotal

                return (
                  <motion.div
                    key={coupon.id}
                    layout
                    whileHover={isAvailable ? { scale: 1.01 } : {}}
                    className={`relative flex flex-col justify-between gap-3 rounded-2xl border p-4 transition sm:flex-row sm:items-center ${
                      !isAvailable
                        ? 'border-white/5 bg-slate-950/40 opacity-50'
                        : isSelected
                        ? 'border-lime-400/80 bg-lime-400/10 shadow-lg shadow-lime-400/5'
                        : isEligible
                        ? 'border-white/10 bg-white/5 hover:border-white/20'
                        : 'border-white/5 bg-slate-950/40 opacity-70'
                    }`}
                  >
                    {/* Left info */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black tracking-wider text-lime-300">
                          {coupon.code}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleCopy(coupon.code)}
                          title="Sao chép mã"
                          className="text-slate-400 transition hover:text-white cursor-pointer"
                        >
                          {copiedCode === coupon.code ? (
                            <Check size={14} className="text-lime-400" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>

                      <h3 className="text-sm font-bold text-white">{coupon.title}</h3>
                      <p className="text-xs text-slate-400">{coupon.description}</p>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
                        <span className="text-slate-500">
                          {isExpired
                            ? 'Đã hết hạn'
                            : isOutOfUsage
                            ? 'Đã hết lượt dùng'
                            : isUsedByUser
                            ? 'Bạn đã sử dụng mã này'
                            : `HSD: ${formatExpiryDisplay(coupon.expiresAt)}`}
                        </span>

                        {isAvailable && !isEligible && cartSubtotal > 0 && (
                          <span className="font-semibold text-amber-300">
                            (Mua thêm {formatVND(missingAmount)} để dùng)
                          </span>
                        )}
                        {isEligible && cartSubtotal > 0 && (
                          <span className="flex items-center gap-1 font-semibold text-emerald-400">
                            <Sparkles size={12} /> Đủ điều kiện áp dụng
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right button */}
                    <div className="flex shrink-0 items-center justify-end gap-2 sm:flex-col sm:justify-center">
                      {isSelected ? (
                        <div className="flex items-center gap-1.5 rounded-xl border border-lime-400 bg-lime-400/20 px-4 py-2 text-xs font-bold text-lime-300">
                          <Check size={15} /> Đang dùng
                        </div>
                      ) : !isAvailable ? (
                        <button
                          disabled
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-500 cursor-not-allowed"
                        >
                          {isExpired ? 'Đã hết hạn' : isOutOfUsage ? 'Đã hết lượt' : 'Đã sử dụng'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApply(coupon)}
                          disabled={!isEligible && cartSubtotal > 0}
                          className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                            isEligible || cartSubtotal === 0
                              ? 'bg-lime-400 text-slate-950 hover:bg-lime-300 shadow-md cursor-pointer'
                              : 'cursor-not-allowed border border-white/10 bg-white/5 text-slate-500'
                          }`}
                        >
                          {isEligible || cartSubtotal === 0 ? 'Áp dụng ngay' : 'Chưa đủ điều kiện'}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-white/10 bg-slate-950/80 px-6 py-4 text-xs text-slate-400">
              <span>
                Tạm tính giỏ hàng:{' '}
                <b className="text-white">{(Number(cartSubtotal ?? 0)).toLocaleString('vi-VN')}đ</b>
              </span>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/10 px-4 py-2 font-bold text-white transition hover:bg-white/10 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
