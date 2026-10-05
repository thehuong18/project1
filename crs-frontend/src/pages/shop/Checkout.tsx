import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Loader2,
  ShieldCheck,
  Tag,
  Ticket,
  Truck,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { useApp } from '../../context/AppContext'
import { CouponModal } from '../../components/CouponModal'
import { CheckoutAddressCard } from '../../components/CheckoutAddressCard'
import { AddressBookModal } from '../../components/AddressBookModal'
import { createOrder as apiCreateOrder, getMomoPayUrl } from '../../services/orders'
import {
  calculateShippingFee,
  resolveLocationToGhnIds,
} from '../../services/shipping'
import type { Address, Order } from '../../types'
import { formatVND } from '../../utils'

export function Checkout() {
  const {
    cart,
    cartSubtotal,
    appliedCoupon,
    removeCoupon,
    addOrder,
    refreshOrders,
    removePurchasedItems,
    user,
    setCartDrawerOpen,
  } = useApp()

  const navigate = useNavigate()
  // Danh sách sản phẩm được chọn thanh toán
  const itemsToCheckout = useMemo(
    () => cart.filter((item) => item.selected !== false),
    [cart]
  )

  useEffect(() => {
    if (!user) {
      toast.error('Vui lòng đăng nhập tài khoản để thực hiện thanh toán!')
      navigate('/login', { state: { from: '/checkout' } })
      return
    }

    if (itemsToCheckout.length === 0) {
      toast.error('Giỏ hàng trống! Vui lòng chọn sản phẩm trước khi thanh toán.')
      setCartDrawerOpen(true)
      navigate('/shop')
    }
  }, [user, itemsToCheckout.length, navigate, setCartDrawerOpen])

  // Address State
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(
    user?.addresses?.find((a) => a.isDefault) || user?.addresses?.[0] || null
  )
  const [addressModalOpen, setAddressModalOpen] = useState(false)

  useEffect(() => {
    if (user?.addresses && user.addresses.length > 0) {
      if (!selectedAddress || !user.addresses.some((a) => a.id === selectedAddress.id)) {
        setSelectedAddress(user.addresses.find((a) => a.isDefault) || user.addresses[0])
      }
    } else if (user?.addresses && user.addresses.length === 0) {
      setSelectedAddress(null)
    }
  }, [user?.addresses, selectedAddress])

  // Form State - Chỉ hỗ trợ 'momo' và 'cod'
  const [note, setNote] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'momo' | 'cod'>('cod')

  // Shipping & Modal State
  const [ghnShippingFee, setGhnShippingFee] = useState<number | null>(null)
  const [calculatingFee, setCalculatingFee] = useState(false)
  const [couponModalOpen, setCouponModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Tính phí ship GHN khớp chuẩn bảng giá cước vận chuyển của GHN
  const calculateFeeForAddress = useCallback(
    async (addr: Address | null, _subtotal: number) => {
      if (!addr || !addr.province?.trim() || !addr.district?.trim() || !addr.ward?.trim()) {
        setGhnShippingFee(null)
        return
      }

      setCalculatingFee(true)

      try {
        const locationIds = await resolveLocationToGhnIds(addr)

        if (!locationIds || !locationIds.districtId || !locationIds.wardCode) {
          setGhnShippingFee(null)
          return
        }

        const totalWeight = Math.max(300, itemsToCheckout.reduce((sum, item) => sum + ((item.quantity || 1) * 300), 0))

        const feeData = await calculateShippingFee({
          to_district_id: locationIds.districtId,
          to_ward_code: locationIds.wardCode,
          weight: totalWeight,
          insurance_value: 0, // Cước vận chuyển chuẩn GHN, không cộng dồn phụ phí bảo hiểm
        })

        if (feeData && typeof feeData.total === 'number') {
          setGhnShippingFee(feeData.service_fee ?? feeData.total)
        } else {
          setGhnShippingFee(null)
        }
      } catch (err: any) {
        console.error('❌ Lỗi API tính phí GHN:', err?.response?.data || err?.message || err)
        setGhnShippingFee(null)
      } finally {
        setCalculatingFee(false)
      }
    },
    [itemsToCheckout]
  )

  useEffect(() => {
    calculateFeeForAddress(selectedAddress, cartSubtotal)
  }, [selectedAddress, cartSubtotal, calculateFeeForAddress])

  // Tính toán giảm giá & Tổng tiền
  const rawShippingFee = ghnShippingFee ?? 0

  const { discountAmount, shippingDiscount, effectiveShippingFee } = useMemo(() => {
    let discount = 0
    let shipDiscount = 0

    if (appliedCoupon) {
      if (appliedCoupon.discountType === 'freeship') {
        shipDiscount = Math.min(rawShippingFee, appliedCoupon.discountValue)
      } else if (appliedCoupon.discountType === 'fixed') {
        discount = Math.min(cartSubtotal, appliedCoupon.discountValue)
      }
    }

    return {
      discountAmount: discount,
      shippingDiscount: shipDiscount,
      effectiveShippingFee: Math.max(0, rawShippingFee - shipDiscount),
    }
  }, [appliedCoupon, rawShippingFee, cartSubtotal])

  const finalCalculatedTotal = Math.max(0, cartSubtotal + effectiveShippingFee - discountAmount)

  // Xử lý submit đơn hàng
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAddress) {
      toast.error('Vui lòng chọn hoặc thêm địa chỉ nhận hàng trước khi thanh toán!')
      setAddressModalOpen(true)
      return
    }

    setSubmitting(true)

    const fullAddress = [
      selectedAddress.street,
      selectedAddress.ward,
      selectedAddress.district,
      selectedAddress.province,
    ].filter(Boolean).join(', ')

    const orderId = `STR-${Date.now().toString().slice(-6)}`
    const today = new Date()
    const dateString = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`
    const isMoMo = paymentMethod === 'momo'

    const newOrder: Order = {
      id: orderId,
      date: dateString,
      status: 'pending',
      paymentStatus: 'unpaid',
      total: finalCalculatedTotal,
      subtotal: cartSubtotal,
      shippingFee: effectiveShippingFee,
      discountAmount: discountAmount + shippingDiscount,
      appliedCouponCode: appliedCoupon?.code,
      itemsCount: itemsToCheckout.reduce((acc, item) => acc + item.quantity, 0),
      itemsList: itemsToCheckout.map((item) => ({
        id: item.id,
        name: item.name,
        brand: item.brand,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
        selectedSize: item.selectedSize,
        selectedColor: item.selectedColor,
      })),
      customer: {
        name: selectedAddress.fullName,
        phone: selectedAddress.phone,
        email: user?.email || '',
        address: selectedAddress.street,
        city: selectedAddress.province,
        district: selectedAddress.district,
        ward: selectedAddress.ward,
        note: note.trim(),
      },
      paymentMethod,
      userId: user?.id,
      userEmail: user?.email,
    }

    let momoRedirectUrl: string | null = null

    // Format phone chuẩn 10 số bắt đầu bằng 0
    let formattedPhone = (selectedAddress.phone || user?.phone || '').trim().replace(/\s+/g, '')
    if (formattedPhone.startsWith('+84')) {
      formattedPhone = '0' + formattedPhone.slice(3)
    } else if (formattedPhone.startsWith('84') && formattedPhone.length === 11) {
      formattedPhone = '0' + formattedPhone.slice(2)
    }

    // Lấy districtId và wardCode cho GHN
    const districtId = selectedAddress.districtId ?? selectedAddress.district_id
    const wardCode = selectedAddress.wardCode ?? selectedAddress.ward_code

    let finalDistrictId = districtId ? Number(districtId) : undefined
    let finalWardCode = wardCode ? String(wardCode) : undefined

    if (!finalDistrictId || !finalWardCode) {
      try {
        const resolved = await resolveLocationToGhnIds(selectedAddress)
        if (resolved) {
          if (!finalDistrictId && resolved.districtId) finalDistrictId = Number(resolved.districtId)
          if (!finalWardCode && resolved.wardCode) finalWardCode = String(resolved.wardCode)
        }
      } catch {
        // ignore
      }
    }

    if (user?.id) {
      try {
        const createResult = await apiCreateOrder({
          name: selectedAddress.fullName,
          phone: formattedPhone,
          address: fullAddress,
          to_district_id: finalDistrictId,
          to_ward_code: finalWardCode,
          payment_method: paymentMethod, // 'cod' hoặc 'momo'
          user_id: Number(user.id),
          shipping_name: selectedAddress.fullName,
          shipping_address: fullAddress,
          shipping_fee: effectiveShippingFee,
          discount_amount: discountAmount + shippingDiscount,
          coupon_code: appliedCoupon?.code,
          note: note.trim() || undefined,
          items: itemsToCheckout.map((item) => ({
            product_id: item.id,
            product_name: item.name,
            price: item.price,
            quantity: item.quantity,
            selectedSize: item.selectedSize,
            selectedColor: item.selectedColor,
            sku: item.sku || `STR-${item.id}`,
            image: item.image || (item as any).image_url || '',
          })),
        })

        // Lấy payUrl từ response createOrder hoặc fetch riêng từ start-momo
        if (isMoMo) {
          if (createResult?.payUrl) {
            momoRedirectUrl = createResult.payUrl
          } else {
            const createdOrderId = createResult?.order?.id || createResult?.order?.order_id
            if (createdOrderId) {
              momoRedirectUrl = await getMomoPayUrl(createdOrderId)
            }
          }
        }

        await refreshOrders()
      } catch (err: any) {
        console.log('Lỗi validation:', err?.response?.data?.errors || err?.response?.data)
        console.error('Tạo đơn hàng lỗi chi tiết:', {
          status: err?.response?.status,
          data: err?.response?.data,
          message: err?.message,
        })
        toast.error(err?.response?.data?.message || 'Không thể khởi tạo đơn hàng trên hệ thống. Vui lòng thử lại!')
        setSubmitting(false)
        return
      }
    }


    // Xóa ngay các sản phẩm đã đặt mua khỏi giỏ hàng
    removePurchasedItems(itemsToCheckout)
    addOrder(newOrder)
    setSubmitting(false)

    if (isMoMo) {
      if (momoRedirectUrl) {
        toast.success('Đang chuyển hướng tới cổng thanh toán MoMo...', { duration: 3000 })
        window.location.href = momoRedirectUrl
        return
      } else {
        toast.success('🎉 Đặt hàng thành công!', {
          description: `Đơn hàng MoMo #${orderId} đã được tạo. Vui lòng hoàn tất thanh toán trong Lịch sử đơn hàng.`,
          duration: 5000,
        })
        navigate('/orders')
      }
    } else {
      toast.success('🎉 Đặt hàng thành công!', {
        description: `Mã đơn hàng COD của bạn là ${orderId}. Phí giao hàng GHN: ${effectiveShippingFee.toLocaleString('vi-VN')}đ`,
        duration: 5000,
      })
      navigate('/orders')
    }
  }

  if (!user) return null
  if (itemsToCheckout.length === 0) return null

  return (
    <section className="min-h-screen bg-[#0B0E17] px-5 py-10 text-white lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setCartDrawerOpen(true)
              navigate('/shop')
            }}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 transition hover:text-white"
          >
            <ChevronLeft size={16} /> Quay lại giỏ hàng
          </button>

          <span className="text-[11px] font-mono text-lime-400 font-bold flex items-center">
            <ShieldCheck size={14} className="inline mr-1" /> SECURE CHECKOUT · GHN & MOMO
          </span>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Thanh toán đơn hàng
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Kiểm tra địa chỉ giao hàng, phương thức vận chuyển GHN và xác nhận đơn hàng
          </p>
        </div>

        <form
          onSubmit={handleSubmitOrder}
          className="grid gap-10 lg:grid-cols-[1fr_420px] items-start"
        >
          <div className="space-y-8">
            {/* Section 1: Address Card */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-md space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-lime-400 font-black text-slate-950 text-xs">
                    01
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-white">Địa chỉ nhận hàng</h2>
                    <p className="text-xs text-slate-400">
                      Thông tin người nhận và tính phí vận chuyển GHN Express
                    </p>
                  </div>
                </div>
              </div>

              <CheckoutAddressCard
                selectedAddress={selectedAddress}
                onOpenAddressBook={() => setAddressModalOpen(true)}
              />

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-slate-300">
                  Ghi chú giao hàng (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Giao giờ hành chính, gọi trước khi đến..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-xs text-left text-white outline-none placeholder:text-slate-500 focus:border-lime-400"
                />
              </div>
            </div>

            {/* Section 2: GHN Shipping */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-md space-y-4">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-lime-400 font-black text-slate-950 text-xs">
                  02
                </span>
                <div>
                  <h2 className="text-lg font-black text-white">Phương thức vận chuyển</h2>
                  <p className="text-xs text-slate-400">
                    Tự động tính phí trực tiếp qua API Giao Hàng Nhanh (GHN)
                  </p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-lime-400/60 bg-gradient-to-r from-lime-400/10 via-slate-900 to-slate-900/90 p-5 shadow-lg shadow-lime-400/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lime-400 text-slate-950 shadow-md">
                      <Truck size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <b className="text-sm font-bold text-white">
                          Giao hàng tiêu chuẩn (GHN Express)
                        </b>
                        <span className="rounded-md bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                          Đối tác chính thức
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        Thời gian giao dự kiến: <strong className="text-slate-200">2 - 3 ngày làm việc</strong>
                      </p>

                      {selectedAddress && (
                        <p className="mt-1.5 text-[11px] text-lime-300/90 font-medium">
                          📍 Điểm nhận: {selectedAddress.ward}, {selectedAddress.district}, {selectedAddress.province}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
                    {calculatingFee ? (
                      <div className="flex items-center sm:justify-end gap-1.5 text-xs text-lime-400">
                        <Loader2 size={14} className="animate-spin" />
                        <span>Đang tính phí GHN...</span>
                      </div>
                    ) : selectedAddress && ghnShippingFee !== null ? (
                      <div>
                        {shippingDiscount > 0 ? (
                          <div className="space-y-0.5">
                            <span className="font-mono text-xs line-through text-slate-500 block">
                              {rawShippingFee.toLocaleString('vi-VN')}đ
                            </span>
                            <span className="font-mono text-base font-black text-lime-300">
                              {effectiveShippingFee === 0
                                ? 'Miễn phí'
                                : `${effectiveShippingFee.toLocaleString('vi-VN')}đ`}
                            </span>
                          </div>
                        ) : (
                          <span className="font-mono text-base font-black text-lime-300">
                            {rawShippingFee.toLocaleString('vi-VN')}đ
                          </span>
                        )}
                        <span className="block text-[10px] text-slate-400">
                          Phí API GHN chuẩn
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-amber-300/90 font-medium">
                        {!selectedAddress
                          ? 'Vui lòng chọn địa chỉ để tính phí'
                          : 'Chưa đủ thông tin Quận/Phường'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Payment Method (MoMo & COD Only) */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-md space-y-4">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-lime-400 font-black text-slate-950 text-xs">
                  03
                </span>
                <div>
                  <h2 className="text-lg font-black text-white">Phương thức thanh toán</h2>
                  <p className="text-xs text-slate-400">Bảo mật 100% qua Cổng MoMo & GHN COD</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    id: 'cod' as const,
                    title: 'Thanh toán khi nhận hàng (COD)',
                    desc: 'Kiểm tra hàng rồi thanh toán tiền mặt trực tiếp cho shipper GHN',
                    badge: 'Mặc định · Tiền mặt',
                    badgeColor: 'bg-lime-400/20 text-lime-300 border-lime-400/30',
                    iconBg: 'bg-lime-400 text-slate-950',
                    icon: Wallet,
                  },
                  {
                    id: 'momo' as const,
                    title: 'Thanh toán qua Ví MoMo / Thẻ ATM',
                    desc: 'Cổng thanh toán MoMo & Thẻ ATM nội địa (NAPAS) - không yêu cầu mã CVC',
                    badge: 'Ví điện tử MoMo',
                    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
                    iconBg: 'bg-gradient-to-br from-[#A50064] to-[#D82D8B] text-white',
                    customIcon: (
                      <span className="font-black text-sm tracking-tighter">MoMo</span>
                    ),
                  },
                ].map((item) => {
                  const isSelected = paymentMethod === item.id
                  const IconComp = item.icon
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPaymentMethod(item.id)}
                      className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition cursor-pointer relative overflow-hidden ${isSelected
                        ? item.id === 'momo'
                          ? 'border-pink-500/80 bg-pink-500/10 shadow-lg shadow-pink-500/10'
                          : 'border-lime-400 bg-lime-400/10 shadow-lg shadow-lime-400/5'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                    >
                      <div
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl shadow-md ${item.iconBg}`}
                      >
                        {item.customIcon ? item.customIcon : IconComp && <IconComp size={18} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <b className="text-xs font-bold text-white">{item.title}</b>
                          {isSelected && (
                            <Check
                              size={15}
                              className={item.id === 'momo' ? 'text-pink-400' : 'text-lime-400'}
                            />
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">{item.desc}</p>
                        <div className="mt-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${item.badgeColor}`}
                          >
                            {item.badge}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right Summary Column */}
          <aside className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-xl shadow-2xl sticky top-24">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-400">
                Order Review
              </span>
              <h2 className="mt-1 text-xl font-black text-white">Đơn hàng của bạn</h2>
            </div>

            <div className="max-h-64 space-y-3 overflow-y-auto border-y border-white/10 py-4 pr-1">
              {itemsToCheckout.map((item) => (
                <div
                  key={item.cartItemId}
                  className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-2.5"
                >
                  <img
                    src={
                      item.image?.startsWith('http') || item.image?.startsWith('data:')
                        ? item.image
                        : item.image?.startsWith('/storage/')
                        ? `${import.meta.env.VITE_STORAGE_URL || 'http://localhost:8000'}${item.image}`
                        : item.image
                        ? `${import.meta.env.VITE_STORAGE_URL || 'http://localhost:8000'}/storage/${item.image}`
                        : 'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=300&q=80'
                    }
                    alt={item.name}
                    className="h-14 w-14 shrink-0 rounded-xl object-cover border border-white/10 bg-slate-900"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=300&q=80'
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-xs font-bold text-white">{item.name}</h3>
                    <p className="text-[11px] text-slate-400">
                      Size: {item.selectedSize} · {item.selectedColor} · x{item.quantity}
                    </p>
                  </div>
                  <span className="font-mono text-xs font-black text-lime-300 shrink-0">
                    {formatVND(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Voucher Section */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Mã khuyến mãi
              </span>

              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-2xl border border-lime-400/40 bg-lime-400/10 p-3.5 text-xs">
                  <div className="flex items-center gap-2.5">
                    <Tag size={16} className="text-lime-300 shrink-0" />
                    <div>
                      <span className="font-mono font-black text-lime-300">
                        {appliedCoupon.code}
                      </span>
                      <p className="text-[10px] text-slate-300">{appliedCoupon.title}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="text-[11px] font-medium text-rose-400 hover:underline cursor-pointer ml-2"
                  >
                    Gỡ bỏ
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCouponModalOpen(true)}
                  className="flex w-full items-center justify-between rounded-2xl border border-dashed border-white/20 bg-white/[0.03] p-3.5 text-xs text-slate-300 transition hover:border-lime-400/50 hover:bg-lime-400/5 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Ticket size={16} className="text-lime-400" />
                    <span>Chọn mã ưu đãi / Giảm giá</span>
                  </span>
                  <span className="text-lime-400 font-bold">Chọn voucher →</span>
                </button>
              )}
            </div>

            {/* Breakdown */}
            <div className="space-y-2 border-t border-white/10 pt-4 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Tạm tính</span>
                <span className="font-mono text-white font-bold">
                  {formatVND(cartSubtotal)}
                </span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between font-semibold text-emerald-400">
                  <span>Giảm giá Voucher ({appliedCoupon?.code})</span>
                  <span className="font-mono">
                    -{formatVND(discountAmount)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  Phí giao hàng GHN
                  {calculatingFee && <Loader2 size={11} className="animate-spin text-lime-400" />}
                </span>
                <span className="font-mono font-bold">
                  {calculatingFee ? (
                    <span className="text-lime-300 text-[11px]">Đang tính...</span>
                  ) : !selectedAddress ? (
                    <span className="text-amber-300/90 text-[11px]">Chưa chọn địa chỉ</span>
                  ) : ghnShippingFee === null ? (
                    <span className="text-amber-300/90 text-[11px]">Chưa tính được phí</span>
                  ) : effectiveShippingFee === 0 ? (
                    <span className="text-lime-300 font-bold">Miễn phí (Freeship)</span>
                  ) : (
                    <span className="text-white">
                      {formatVND(effectiveShippingFee)}
                    </span>
                  )}
                </span>
              </div>

              <div className="flex justify-between border-t border-white/10 pt-3 text-base">
                <span className="font-black text-white">Tổng thanh toán</span>
                <b className="font-mono text-xl font-black text-lime-300">
                  {formatVND(finalCalculatedTotal)}
                </b>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || calculatingFee || !selectedAddress}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-xs font-black uppercase tracking-wider transition shadow-xl ${!selectedAddress
                ? 'bg-white/10 text-slate-400 cursor-not-allowed border border-white/10'
                : paymentMethod === 'momo'
                  ? 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white shadow-pink-600/30 cursor-pointer disabled:opacity-70'
                  : 'bg-lime-400 text-slate-950 hover:bg-lime-300 shadow-lime-400/20 cursor-pointer disabled:opacity-70'
                }`}
            >
              {submitting ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : !selectedAddress ? (
                <span>Vui lòng chọn địa chỉ nhận hàng</span>
              ) : (
                <>
                  {paymentMethod === 'momo'
                    ? 'THANH TOÁN QUA VÍ MOMO'
                    : 'XÁC NHẬN ĐẶT HÀNG (COD)'}{' '}
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <p className="text-center text-[11px] text-slate-500">
              🔒 Thông tin thanh toán & vận chuyển bảo mật an toàn 100%.
            </p>
          </aside>
        </form>
      </div>

      <AddressBookModal
        isOpen={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        selectedAddressId={selectedAddress?.id}
        onSelectAddress={(addr) => setSelectedAddress(addr)}
      />

      <CouponModal
        isOpen={couponModalOpen}
        onClose={() => setCouponModalOpen(false)}
      />
    </section>
  )
}