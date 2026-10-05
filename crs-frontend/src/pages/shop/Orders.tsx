import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  MapPin,
  Package,
  RotateCcw,
  ShoppingBag,
  Star,
  Tag,
  Truck,
  X,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useApp } from '../../context/AppContext'
import { getMomoPayUrl } from '../../services/orders'
import { ReviewModal } from '../../components/ReviewModal'
import type { Order, OrderStatus } from '../../types'

const formatImgUrl = (url?: string): string => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return 'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=300&q=80'
  }
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url
  }
  if (url.startsWith('/storage/')) {
    return `${import.meta.env.VITE_STORAGE_URL || 'http://localhost:8000'}${url}`
  }
  if (url.startsWith('/')) {
    return `${import.meta.env.VITE_STORAGE_URL || 'http://localhost:8000'}/storage${url}`
  }
  return `${import.meta.env.VITE_STORAGE_URL || 'http://localhost:8000'}/storage/${url}`
}

const statusConfig: Record<
  OrderStatus,
  { label: string; bg: string; text: string; border: string; step: number }
> = {
  pending: {
    label: 'Chờ xử lý',
    bg: 'bg-amber-500/15',
    text: 'text-amber-300',
    border: 'border-amber-500/30',
    step: 1,
  },
  processing: {
    label: 'Chờ lấy hàng',
    bg: 'bg-indigo-500/15',
    text: 'text-indigo-300',
    border: 'border-indigo-500/30',
    step: 2,
  },
  shipping: {
    label: 'Đang giao hàng',
    bg: 'bg-sky-500/15',
    text: 'text-sky-300',
    border: 'border-sky-500/30',
    step: 3,
  },
  delivered: {
    label: 'Đã giao thành công',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    border: 'border-emerald-500/30',
    step: 4,
  },
  paid: {
    label: 'Đã thanh toán',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
    border: 'border-emerald-500/30',
    step: 4,
  },
  cancelled: {
    label: 'Đã hủy',
    bg: 'bg-rose-500/15',
    text: 'text-rose-300',
    border: 'border-rose-500/30',
    step: 0,
  },
}

export function Orders() {
  const { orders, ordersLoading, refreshOrders, addToCart, user, cancelOrder, setCartDrawerOpen } = useApp()
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null)
  const [payingOrderId, setPayingOrderId] = useState<string | number | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const handlePayMoMo = async (orderId: string | number) => {
    try {
      setPayingOrderId(orderId)
      const payUrl = await getMomoPayUrl(orderId)
      if (payUrl) {
        window.location.href = payUrl
      } else {
        toast.error('Không thể khởi tạo cổng thanh toán MoMo.')
      }
    } catch {
      toast.error('Lỗi kết nối cổng thanh toán MoMo.')
    } finally {
      setPayingOrderId(null)
    }
  }

  useEffect(() => {
    const payment = searchParams.get('payment') || searchParams.get('status')
    if (payment === 'success') {
      toast.success('🎉 Thanh toán MoMo thành công! Đơn hàng đã được xác nhận.')
      void refreshOrders()
      setSearchParams({}, { replace: true })
    } else if (payment === 'failed') {
      toast.error('❌ Giao dịch MoMo không thành công hoặc đã bị hủy. Bạn có thể thanh toán lại.')
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, refreshOrders])

  const [reviewTarget, setReviewTarget] = useState<{
    orderId: string
    productId: number
    productName: string
    productImage?: string
  } | null>(null)

  const [reviewedKeys, setReviewedKeys] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('crs_reviewed_items')
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })

  const isProductReviewedInOrder = (orderId: string, productId: number): boolean => {
    return Boolean(reviewedKeys[`${orderId}-${productId}`])
  }

  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'processing' | 'shipping' | 'delivered' | 'cancelled'
  >('all')

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'pending') return order.status === 'pending'
    if (statusFilter === 'processing') return (order as any).status === 'processing'
    if (statusFilter === 'shipping') return order.status === 'shipping'
    if (statusFilter === 'delivered') return order.status === 'delivered' || order.status === 'paid'
    if (statusFilter === 'cancelled') return order.status === 'cancelled'
    return true
  })

  const handleConfirmCancelOrder = async () => {
    if (!cancelModalOrder) return
    await cancelOrder(cancelModalOrder.id)
    if (selectedOrder && selectedOrder.id === cancelModalOrder.id) {
      setSelectedOrder({ ...selectedOrder, status: 'cancelled' })
    }
    toast.success(`Đã hủy đơn hàng ${cancelModalOrder.id} thành công!`)
    setCancelModalOrder(null)
  }

  const handleReorder = (order: Order) => {
    order.itemsList.forEach((item) => {
      void addToCart(
        {
          id: item.id,
          name: item.name,
          brand: item.brand,
          price: item.price,
          image: item.image,
          stock: 10,
          category: 'Dụng cụ thể thao',
          description: '',
          colors: [item.selectedColor ?? 'Mặc định'],
          sizes: [item.selectedSize ?? '41'],
        },
        item.quantity,
        { size: item.selectedSize, color: item.selectedColor }
      )
    })
    toast.success(
      `Đã thêm ${order.itemsList.length} sản phẩm của đơn ${order.id} vào giỏ hàng!`
    )
    setSelectedOrder(null)
    setCartDrawerOpen(true)
  }


  return (
    <section className="min-h-screen bg-slate-950 px-5 py-12 text-white lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Page Intro */}
        <div className="mb-10">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-400">
            {user?.name ? `${user.name.toUpperCase()}'S ORDERS` : 'MY ORDERS'}
          </span>
          <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
            Lịch sử <em>đơn hàng.</em>
          </h1>
          <p className="mt-2 text-xs text-slate-400">
            Theo dõi trạng thái xử lý, vận chuyển và đánh giá các đơn hàng của bạn.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { key: 'all', label: `Tất cả (${orders.length})` },
            {
              key: 'pending',
              label: `Chờ xử lý (${
                orders.filter((o) => o.status === 'pending').length
              })`,
            },
            {
              key: 'processing',
              label: `Chờ lấy hàng (${
                orders.filter((o) => (o as any).status === 'processing').length
              })`,
            },
            {
              key: 'shipping',
              label: `Đang giao (${
                orders.filter((o) => o.status === 'shipping').length
              })`,
            },
            {
              key: 'delivered',
              label: `Đã giao (${
                orders.filter(
                  (o) => o.status === 'delivered' || o.status === 'paid'
                ).length
              })`,
            },
            {
              key: 'cancelled',
              label: `Đã hủy (${
                orders.filter((o) => o.status === 'cancelled').length
              })`,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as typeof statusFilter)}
              className={`shrink-0 rounded-2xl px-5 py-2.5 text-xs font-bold transition ${
                statusFilter === tab.key
                  ? 'bg-lime-400 text-slate-950 shadow-md shadow-lime-400/20'
                  : 'border border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {ordersLoading && orders.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 rounded-3xl border border-white/5 bg-slate-900/50 animate-pulse"
              />
            ))}
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const config = statusConfig[order.status] || statusConfig.pending
              const needsPayment =
                order.paymentMethod === 'momo' &&
                order.paymentStatus !== 'paid' &&
                order.status !== 'cancelled'
              const isDelivered =
                order.status === 'delivered' || order.status === 'paid'

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900 to-slate-950 p-5 sm:p-6 shadow-xl transition hover:border-lime-400/40"
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      {/* Thumbnail or fallback icon */}
                      {order.itemsList && order.itemsList[0]?.image ? (
                        <Link to={`/product/${order.itemsList[0].id}`} className="block shrink-0">
                          <img
                            src={formatImgUrl(order.itemsList[0].image)}
                            alt={order.itemsList[0].name}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-800 hover:border-lime-400/50 transition cursor-pointer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=300&q=80'
                            }}
                          />
                        </Link>
                      ) : (
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/5 border border-white/10 text-lime-400">
                          <Package size={20} />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <b className="font-mono text-sm sm:text-base text-white">{order.id}</b>
                        <p className="text-xs text-slate-400">{order.date}</p>
                        {/* Product name preview */}
                        {order.itemsList && order.itemsList[0] && (
                          <p className="text-sm text-white truncate mt-1">
                            {order.itemsList[0].name}
                            {order.itemsList.length > 1 && (
                              <> và {order.itemsList.length - 1} sản phẩm khác</>
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {order.paymentMethod === 'momo' && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-mono font-bold ${
                            order.paymentStatus === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                          }`}
                        >
                          {order.paymentStatus === 'paid'
                            ? '● Đã thanh toán MoMo'
                            : '○ Chờ thanh toán MoMo'}
                        </span>
                      )}
                      {order.paymentMethod === 'cod' && (
                        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          {order.paymentStatus === 'paid'
                            ? '● Đã thanh toán COD'
                            : '○ COD - Thanh toán khi nhận hàng'}
                        </span>
                      )}

                      <span
                        className={`rounded-full border px-3 py-1 font-mono text-xs font-bold ${config.bg} ${config.text} ${config.border}`}
                      >
                        {config.label}
                      </span>
                    </div>
                  </div>

                  {/* GHN Tracking Bar if created */}
                  {(order.ghn_code || order.ghnTrackingCode) && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-500/30 bg-sky-950/30 px-3.5 py-2 text-xs">
                      <div className="flex items-center gap-2 text-sky-300">
                        <Truck size={15} className="text-sky-400 shrink-0" />
                        <span>Mã vận đơn GHN Express:</span>
                        <b className="font-mono text-white font-bold">{order.ghn_code || order.ghnTrackingCode}</b>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            const code = order.ghn_code || order.ghnTrackingCode || ''
                            navigator.clipboard.writeText(code)
                            toast.success(`Đã sao chép mã vận đơn GHN: ${code}`)
                          }}
                          className="flex items-center gap-1 rounded-lg bg-sky-500/20 px-2 py-1 font-mono text-[11px] font-bold text-sky-300 hover:bg-sky-500/30 hover:text-white transition cursor-pointer"
                        >
                          <Copy size={12} /> Copy
                        </button>
                        <a
                          href={`https://donhang.ghn.vn/?order_code=${order.ghn_code || order.ghnTrackingCode}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 rounded-lg bg-sky-400 px-2.5 py-1 text-[11px] font-bold text-slate-950 hover:bg-sky-300 transition shadow-sm"
                        >
                          Tra cứu GHN <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Order Representative Product (Single Primary Item) */}
                  {order.itemsList && order.itemsList.length > 0 && (() => {
                    const primaryItem = order.itemsList[0]
                    const itemReviewed = isProductReviewedInOrder(
                      order.id,
                      primaryItem.id
                    )

                    return (
                      <div className="border-t border-white/10 my-4 pt-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3 text-xs">
                          <div className="flex items-center gap-3 min-w-0">
                            <Link to={`/product/${primaryItem.id}`} className="block shrink-0">
                              <img
                                src={formatImgUrl(primaryItem.image)}
                                alt=""
                                className="h-14 w-14 shrink-0 rounded-xl object-cover border border-white/10 bg-slate-900 hover:border-lime-400/50 transition cursor-pointer"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=300&q=80'
                                }}
                              />
                            </Link>
                            <div className="min-w-0">
                              <Link to={`/product/${primaryItem.id}`} className="block group">
                                <h4 className="truncate font-bold text-white text-sm group-hover:text-lime-400 transition cursor-pointer">
                                  {primaryItem.name}
                                </h4>
                              </Link>
                              <p className="text-slate-400 text-xs">
                                Phân loại: Size {primaryItem.selectedSize ?? '41'} ·{' '}
                                {primaryItem.selectedColor ?? 'Mặc định'} · x{primaryItem.quantity}
                              </p>
                              <span className="font-mono font-bold text-lime-300">
                                {(primaryItem.price * primaryItem.quantity).toLocaleString(
                                  'vi-VN'
                                )}
                                đ
                              </span>
                            </div>
                          </div>

                          {/* Per-Item Review Action if Delivered */}
                          {isDelivered && (
                            <div className="flex items-center sm:justify-end shrink-0">
                              {itemReviewed ? (
                                <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-300 font-bold flex items-center gap-1.5 shadow-sm">
                                  <CheckCircle2 size={13} /> ✓ Đã đánh giá
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReviewTarget({
                                      orderId: order.id,
                                      productId: primaryItem.id,
                                      productName: primaryItem.name,
                                      productImage: primaryItem.image,
                                    })
                                  }
                                  className="flex items-center gap-1.5 rounded-xl border border-amber-400/50 bg-amber-400/10 px-3.5 py-2 font-bold text-amber-300 hover:bg-amber-400 hover:text-slate-950 transition shadow-sm cursor-pointer"
                                >
                                  <Star size={13} className="fill-current" /> Viết đánh giá
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  {/* Order Footer & Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4 text-xs">
                    <div className="text-slate-400">
                      Tổng thanh toán:{' '}
                      <b className="font-mono text-base font-black text-lime-300">
                        {order.total.toLocaleString('vi-VN')}đ
                      </b>
                      {order.appliedCouponCode && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-emerald-400">
                          <Tag size={12} /> Voucher {order.appliedCouponCode}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Button Thanh toán MoMo if pending */}
                      {needsPayment && (
                        <button
                          type="button"
                          onClick={() => handlePayMoMo(order.id)}
                          disabled={payingOrderId === order.id}
                          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2.5 font-black text-white hover:brightness-110 transition shadow-lg shadow-pink-500/20 cursor-pointer disabled:opacity-50"
                        >
                          <CreditCard size={15} />{' '}
                          {payingOrderId === order.id ? 'Đang kết nối...' : 'Thanh toán MoMo'}
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 font-bold text-white transition hover:border-lime-400 hover:text-lime-300 cursor-pointer"
                      >
                        Chi tiết đơn hàng
                      </button>

                      {/* Cancel Order Button: Chỉ cho phép hủy khi đang Chờ xử lý & chưa tạo vận đơn GHN */}
                      {order.status === 'pending' && !order.ghn_code && !order.ghnTrackingCode && (
                        <button
                          type="button"
                          onClick={() => setCancelModalOrder(order)}
                          className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 font-bold text-rose-400 transition hover:bg-rose-500 hover:text-white cursor-pointer"
                        >
                          <XCircle size={14} /> Hủy đơn
                        </button>
                      )}

                      <button
                        onClick={() => handleReorder(order)}
                        className="flex items-center gap-1.5 rounded-xl bg-white/10 border border-white/15 px-4 py-2.5 font-bold text-white transition hover:bg-lime-400 hover:text-slate-950 hover:border-transparent"
                      >
                        <RotateCcw size={14} /> Mua lại
                      </button>
                    </div>

                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          /* Empty Orders — specific to current user */
          <div className="grid min-h-[380px] place-items-center rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
            <div className="space-y-4 max-w-sm">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/5 text-3xl">
                📦
              </div>
              <h3 className="text-xl font-black text-white">
                Bạn chưa có đơn hàng nào
              </h3>
              <p className="text-xs text-slate-400">
                {statusFilter === 'all'
                  ? 'Tài khoản này chưa có đơn hàng nào. Hãy khám phá và mua sắm ngay!'
                  : 'Bạn chưa có đơn hàng nào thuộc trạng thái này.'}
              </p>
              <Link
                to="/shop"
                className="inline-flex rounded-xl bg-lime-400 px-6 py-3 text-xs font-black text-slate-950 hover:bg-lime-300"
              >
                Khám phá cửa hàng
              </Link>
            </div>
          </div>
        )}

        {/* Order Details Modal with Animated Progress Tracker */}
        <AnimatePresence>
          {selectedOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedOrder(null)}
                className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900 text-white shadow-2xl"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
                  <div>
                    <span className="font-mono text-xs font-bold text-lime-400 uppercase tracking-wider">
                      ORDER DETAILS
                    </span>
                    <h2 className="text-xl font-black text-white">
                      {selectedOrder.id}
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Progress Tracker */}
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Tiến trình vận đơn
                    </span>

                    {selectedOrder.status === 'cancelled' ? (
                      <div className="mt-4 flex items-center gap-3 text-rose-400">
                        <XCircle size={24} />
                        <span className="font-bold text-sm">
                          Đơn hàng này đã bị hủy
                        </span>
                      </div>
                    ) : (
                      <div className="mt-6 grid grid-cols-4 gap-2 text-center text-xs">
                        {[
                          { step: 1, title: 'Đã đặt hàng', icon: ShoppingBag },
                          { step: 2, title: 'Chờ lấy hàng', icon: Clock },
                          { step: 3, title: 'Đang giao', icon: Truck },
                          { step: 4, title: 'Đã nhận', icon: CheckCircle2 },
                        ].map((s) => {
                          const currentStep =
                            statusConfig[selectedOrder.status]?.step || 1
                          const isDone = currentStep >= s.step
                          const isCurrent = currentStep === s.step
                          const IconComp = s.icon

                          return (
                            <div
                              key={s.step}
                              className="flex flex-col items-center gap-2"
                            >
                              <div
                                className={`grid h-10 w-10 place-items-center rounded-2xl transition shadow-md ${
                                  isDone
                                    ? 'bg-lime-400 text-slate-950 font-black'
                                    : 'border border-white/10 bg-white/5 text-slate-500'
                                } ${
                                  isCurrent
                                    ? 'ring-2 ring-lime-400 ring-offset-2 ring-offset-slate-950'
                                    : ''
                                }`}
                              >
                                <IconComp size={18} />
                              </div>
                              <span
                                className={`text-[11px] font-bold ${
                                  isDone ? 'text-white' : 'text-slate-500'
                                }`}
                              >
                                {s.title}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* GHN Dedicated Tracking Card in Modal */}
                  {(selectedOrder.ghn_code || selectedOrder.ghnTrackingCode) && (
                    <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-950 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                            <Truck size={20} />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400">
                              ĐỐI TÁC VẬN CHUYỂN GHN EXPRESS
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-base font-black text-white">
                                {selectedOrder.ghn_code || selectedOrder.ghnTrackingCode}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const code = selectedOrder.ghn_code || selectedOrder.ghnTrackingCode || ''
                                  navigator.clipboard.writeText(code)
                                  toast.success(`Đã sao chép mã vận đơn GHN: ${code}`)
                                }}
                                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-sky-300 transition cursor-pointer"
                                title="Sao chép mã vận đơn"
                              >
                                <Copy size={14} />
                              </button>
                            </div>
                          </div>
                        </div>

                        <a
                          href={`https://donhang.ghn.vn/?order_code=${selectedOrder.ghn_code || selectedOrder.ghnTrackingCode}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl bg-sky-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-sky-300 transition shadow-md shadow-sky-400/20"
                        >
                          Tra cứu hành trình trên GHN <ExternalLink size={14} />
                        </a>
                      </div>

                      <div className="rounded-xl bg-slate-950/80 border border-white/5 p-3 text-xs text-slate-300 flex items-start gap-2.5">
                        <span className="text-sky-400 text-base leading-none">●</span>
                        <div>
                          <b className="text-white">Trạng thái vận chuyển: </b>
                          {selectedOrder.status === 'processing'
                            ? 'Shop đã chuẩn bị xong đơn hàng — Chờ lấy hàng (Bưu tá GHN đang đến nhận bưu kiện).'
                            : selectedOrder.status === 'shipping'
                            ? 'Bưu tá GHN đang vận chuyển kiện hàng đến địa chỉ nhận của bạn.'
                            : selectedOrder.status === 'delivered' || selectedOrder.status === 'paid'
                            ? 'Kiện hàng đã được giao thành công tới tay bạn.'
                            : selectedOrder.status === 'cancelled'
                            ? 'Đơn giao hàng đã bị hủy.'
                            : 'Đơn hàng đang được cập nhật từ hệ thống GHN.'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Customer & Shipping Info */}
                  <div className="grid sm:grid-cols-2 gap-4 text-xs">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-200">
                        <MapPin size={14} className="text-lime-400" /> Địa chỉ nhận
                        hàng
                      </div>
                      <p className="font-bold text-white">
                        {selectedOrder.customer.name}
                      </p>
                      <p className="text-slate-400">
                        {selectedOrder.customer.phone}
                      </p>
                      <p className="text-slate-300">
                        {selectedOrder.customer.address},{' '}
                        {selectedOrder.customer.district},{' '}
                        {selectedOrder.customer.city}
                      </p>
                      {selectedOrder.customer.note && (
                        <p className="text-slate-400 italic pt-1">
                          "Ghi chú: {selectedOrder.customer.note}"
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-1.5">
                      <span className="font-bold text-slate-200">
                        Thông tin thanh toán
                      </span>
                      <p className="text-slate-300">
                        Phương thức:{' '}
                        <b className="text-white uppercase">
                          {selectedOrder.paymentMethod === 'momo'
                            ? 'Ví điện tử MoMo'
                            : 'Thanh toán khi nhận hàng (COD)'}
                        </b>
                      </p>
                      <p className="text-slate-300">
                        Trạng thái:{' '}
                        <b
                          className={
                            selectedOrder.paymentStatus === 'paid'
                              ? 'text-lime-300'
                              : 'text-amber-300'
                          }
                        >
                          {selectedOrder.paymentStatus === 'paid'
                            ? 'Đã thanh toán'
                            : selectedOrder.paymentStatus === 'unpaid'
                            ? 'Chưa thanh toán (Thu COD khi giao)'
                            : 'Chờ thanh toán'}
                        </b>
                      </p>
                      <p className="text-slate-300">
                        Ngày đặt: <b className="text-white">{selectedOrder.date}</b>
                      </p>
                      {selectedOrder.appliedCouponCode && (
                        <p className="text-emerald-400 font-semibold">
                          Mã Voucher: {selectedOrder.appliedCouponCode}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Sản phẩm trong đơn ({selectedOrder.itemsList.length})
                    </span>
                    <div className="space-y-2">
                      {selectedOrder.itemsList.map((item, idx) => {
                        const isModalDelivered = selectedOrder.status === 'delivered' || selectedOrder.status === 'paid'
                        const itemReviewed = isProductReviewedInOrder(selectedOrder.id, item.id)

                        return (
                          <div
                            key={idx}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Link to={`/product/${item.id}`} className="block shrink-0">
                                <img
                                  src={formatImgUrl(item.image)}
                                  alt=""
                                  className="h-12 w-12 rounded-xl object-cover border border-white/10 bg-slate-900 shrink-0 hover:border-lime-400/50 transition cursor-pointer"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src =
                                      'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=300&q=80'
                                  }}
                                />
                              </Link>
                              <div className="min-w-0">
                                <Link to={`/product/${item.id}`} className="block group">
                                  <h4 className="font-bold text-white truncate group-hover:text-lime-400 transition cursor-pointer">{item.name}</h4>
                                </Link>
                                <p className="text-slate-400">
                                  Size: {item.selectedSize ?? '41'} ·{' '}
                                  {item.selectedColor ?? 'Mặc định'} · x{item.quantity}
                                </p>
                                <span className="font-mono font-bold text-lime-300">
                                  {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                                </span>
                              </div>
                            </div>

                            {isModalDelivered && (
                              <div className="flex items-center sm:justify-end shrink-0">
                                {itemReviewed ? (
                                  <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-300 font-bold flex items-center gap-1.5 shadow-sm">
                                    <CheckCircle2 size={13} /> ✓ Đã đánh giá
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReviewTarget({
                                        orderId: selectedOrder.id,
                                        productId: item.id,
                                        productName: item.name,
                                        productImage: item.image,
                                      })
                                    }
                                    className="flex items-center gap-1.5 rounded-xl border border-amber-400/50 bg-amber-400/10 px-3.5 py-2 font-bold text-amber-300 hover:bg-amber-400 hover:text-slate-950 transition shadow-sm cursor-pointer"
                                  >
                                    <Star size={13} className="fill-current" /> Viết đánh giá
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Summary Totals */}
                  <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Tạm tính tiền hàng:</span>
                      <span className="font-mono text-white">
                        {selectedOrder.subtotal.toLocaleString('vi-VN')}đ
                      </span>
                    </div>

                    {selectedOrder.discountAmount > 0 && (
                      <div className="flex justify-between font-semibold text-emerald-400">
                        <span>Giảm giá Voucher:</span>
                        <span className="font-mono">
                          -{selectedOrder.discountAmount.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-400">
                      <span>Phí giao hàng:</span>
                      <span className="font-mono">
                        {selectedOrder.shippingFee === 0
                          ? 'Miễn phí'
                          : `${selectedOrder.shippingFee.toLocaleString('vi-VN')}đ`}
                      </span>
                    </div>

                    <div className="flex justify-between border-t border-white/10 pt-2 text-sm font-black">
                      <span className="text-white">Tổng cộng thanh toán:</span>
                      <span className="font-mono text-base text-lime-300">
                        {selectedOrder.total.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-white/10 bg-slate-950 px-6 py-4">
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="rounded-xl border border-white/10 px-5 py-2.5 text-xs font-bold text-white hover:bg-white/10"
                  >
                    Đóng
                  </button>

                  <div className="flex items-center gap-2">
                    {selectedOrder.status === 'pending' &&
                      !selectedOrder.ghn_code &&
                      !selectedOrder.ghnTrackingCode && (
                      <button
                        type="button"
                        onClick={() => setCancelModalOrder(selectedOrder)}
                        className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500 hover:text-white transition cursor-pointer"
                      >
                        <XCircle size={14} /> Hủy đơn hàng này
                      </button>
                    )}

                      {selectedOrder.paymentMethod === 'momo' &&
                        selectedOrder.paymentStatus !== 'paid' &&
                        selectedOrder.status !== 'cancelled' && (
                          <button
                            type="button"
                            onClick={() => handlePayMoMo(selectedOrder.id)}
                            disabled={payingOrderId === selectedOrder.id}
                            className="flex items-center gap-1.5 rounded-xl bg-pink-500 px-5 py-2.5 text-xs font-black text-white hover:bg-pink-600 transition shadow-md shadow-pink-500/20 cursor-pointer disabled:opacity-50"
                          >
                            <CreditCard size={14} />{' '}
                            {payingOrderId === selectedOrder.id ? 'Đang kết nối...' : 'Thanh toán MoMo'}
                          </button>
                        )}

                      <button
                        onClick={() => handleReorder(selectedOrder)}
                        className="flex items-center gap-2 rounded-xl bg-lime-400 px-6 py-2.5 text-xs font-black text-slate-950 hover:bg-lime-300 shadow-md shadow-lime-400/20"
                      >
                        <RotateCcw size={14} /> Mua lại đơn này
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Cancel Order Confirmation Modal */}
          <AnimatePresence>
            {cancelModalOrder && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setCancelModalOrder(null)}
                  className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900 p-6 sm:p-7 text-white shadow-2xl space-y-4"
                >
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <XCircle size={24} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-white">Xác nhận hủy đơn hàng</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Bạn có chắc chắn muốn hủy đơn hàng{' '}
                      <b className="text-white font-mono">{cancelModalOrder.id}</b>?
                      Sau khi hủy, trạng thái đơn sẽ chuyển sang <b className="text-rose-400">"Đã hủy"</b> và không thể hoàn tác.
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setCancelModalOrder(null)}
                      className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white"
                    >
                      Giữ lại đơn
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmCancelOrder}
                      className="rounded-xl bg-rose-500 px-5 py-2.5 text-xs font-black uppercase text-white hover:bg-rose-600 transition shadow-lg shadow-rose-500/25 cursor-pointer"
                    >
                      Xác nhận hủy
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Review Modal per Product Item */}
          {reviewTarget && (
            <ReviewModal
              isOpen={Boolean(reviewTarget)}
              orderId={reviewTarget.orderId}
              productId={reviewTarget.productId}
              productName={reviewTarget.productName}
              productImage={reviewTarget.productImage}
              onClose={() => setReviewTarget(null)}
              onSuccess={() => {
                const key = `${reviewTarget.orderId}-${reviewTarget.productId}`
                setReviewedKeys((prev) => {
                  const next = { ...prev, [key]: true }
                  localStorage.setItem('crs_reviewed_items', JSON.stringify(next))
                  return next
                })
                void refreshOrders()
              }}
            />
          )}
        </div>
      </section>
    )
  }