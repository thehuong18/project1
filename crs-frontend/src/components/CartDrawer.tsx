import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Minus, Plus, ShoppingBag, Tag, Trash2, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import { CouponModal } from './CouponModal'
import { formatVND } from '../utils'


const getCartItemImageUrl = (item: any) => {
  const raw =
    item.image ||
    item.image_url ||
    (Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : '') ||
    ''
  if (!raw) return 'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=300&q=80'
  if (raw.startsWith('http') || raw.startsWith('data:')) return raw
  if (raw.startsWith('/storage/')) return `http://localhost:8000${raw}`
  return `http://localhost:8000/storage/${raw}`
}

//Ngăn kéo giỏ hàng trượt ra từ cạnh màn hình.
export function CartDrawer() {
  const {
    cartDrawerOpen,
    setCartDrawerOpen,
    cart,
    cartSubtotal,
    cartTotal,
    discountAmount,
    appliedCoupon,
    removeCoupon,
    updateCart,
    removeFromCart,
    toggleCartItem,
    toggleSelectAll,
    updateCartVariant,
    user,
  } = useApp()

  const [couponModalOpen, setCouponModalOpen] = useState(false)
  const navigate = useNavigate()

  const handleCheckout = () => {
    setCartDrawerOpen(false)
    if (!user) {
      toast.info('Vui lòng đăng nhập để tiến hành thanh toán!')
      navigate('/login', { state: { from: '/checkout' } })
    } else {
      navigate('/checkout')
    }
  }

  useEffect(() => {
    if (cartDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [cartDrawerOpen]);
  return (
    <>
      <AnimatePresence>
        {cartDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCartDrawerOpen(false)}
              className="fixed inset-0 z-[60] bg-[#0B0E17]/80 backdrop-blur-sm"
            />

            {/* Slide-out Drawer */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="fixed right-0 top-0 z-[60] flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#131823] p-6 text-white shadow-2xl"
            >

              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-lime-400 text-slate-950">
                    <ShoppingBag size={18} />
                  </div>
                  <h2 className="text-xl font-black">
                    Giỏ hàng <span className="text-lime-400">({cart.length})</span>
                  </h2>
                </div>
                <button
                  onClick={() => setCartDrawerOpen(false)}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto py-5">
                {cart.length === 0 ? (
                  <div className="grid h-full place-items-center text-center">
                    <div className="space-y-4">
                      <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-white/10 bg-white/5 text-4xl">
                        ⚽
                      </div>
                      <h3 className="text-lg font-black text-white">
                        Giỏ hàng của bạn đang trống
                      </h3>
                      <p className="text-xs text-slate-400 max-w-[220px] mx-auto">
                        Hãy chọn cho mình đôi giày hoặc áo đấu yêu thích ngay nhé!
                      </p>
                      <Link
                        onClick={() => setCartDrawerOpen(false)}
                        to="/shop"
                        className="inline-flex rounded-xl bg-lime-400 px-6 py-3 text-xs font-black text-slate-950 shadow-lg shadow-lime-400/20 hover:bg-lime-300"
                      >
                        Khám phá cửa hàng
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {/* Select All Bar */}
                    <div className="flex items-center justify-between pb-3 px-1 text-xs text-slate-400 border-b border-white/5">
                      <label className="flex items-center gap-2 cursor-pointer font-medium hover:text-white transition">
                        <input
                          type="checkbox"
                          checked={cart.length > 0 && cart.every((i) => i.selected !== false)}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded accent-lime-400 cursor-pointer"
                        />
                        <span>
                          Chọn tất cả ({cart.filter((i) => i.selected !== false).length}/{cart.length})
                        </span>
                      </label>
                      <span className="font-mono text-lime-300 font-bold">
                        {cartSubtotal.toLocaleString('vi-VN')}đ
                      </span>
                    </div>

                    {cart.map((item) => (
                      <motion.div
                        layout
                        key={item.cartItemId}
                        className={`flex gap-3 rounded-2xl border p-3 transition ${
                          item.selected === false
                            ? 'border-white/5 bg-[#0B0E17]/40 opacity-60'
                            : 'border-white/10 bg-[#0B0E17]/60'
                        }`}
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          aria-label={`Chọn ${item.name}`}
                          checked={item.selected !== false}
                          onChange={() => toggleCartItem(item.cartItemId)}
                          className="mt-2 h-4 w-4 rounded accent-lime-400 cursor-pointer"
                        />

                        {/* Image */}
                        <Link
                          to={`/product/${item.id}`}
                          onClick={() => setCartDrawerOpen(false)}
                          className="relative flex-shrink-0 group overflow-hidden rounded-xl"
                          title={`Xem chi tiết ${item.name}`}
                        >
                          <img
                            src={getCartItemImageUrl(item)}
                            alt={item.name}
                            className="h-20 w-20 rounded-xl object-cover border border-white/10 bg-[#0B0E17] group-hover:scale-105 group-hover:border-lime-400/50 transition duration-200 cursor-pointer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=300&q=80'
                            }}
                          />
                        </Link>

                        {/* Info */}
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                            {typeof item.brand === 'object' && item.brand !== null ? (item.brand as any).name : (item.brand || 'STRIKER')}
                          </p>
                          <Link
                            to={`/product/${item.id}`}
                            onClick={() => setCartDrawerOpen(false)}
                            className="block group"
                            title={`Xem chi tiết ${item.name}`}
                          >
                            <h3 className="truncate text-xs font-bold text-white group-hover:text-lime-400 transition cursor-pointer">
                              {item.name}
                            </h3>
                          </Link>

                          {/* Variants */}
                          <div className="flex gap-2">
                            <select
                              value={item.selectedSize ?? item.sizes?.[0]}
                              onChange={(e) =>
                                updateCartVariant(
                                  item.cartItemId,
                                  e.target.value,
                                  item.selectedColor ?? item.colors?.[0]
                                )
                              }
                              className="rounded-lg border border-white/10 bg-[#0B0E17] px-2 py-0.5 text-[11px] text-slate-300 outline-none"
                            >
                              {item.sizes?.map((size) => (
                                <option key={size} value={size}>
                                  Size {size}
                                </option>
                              ))}
                            </select>

                            <select
                              value={item.selectedColor ?? item.colors?.[0]}
                              onChange={(e) =>
                                updateCartVariant(
                                  item.cartItemId,
                                  item.selectedSize ?? item.sizes?.[0],
                                  e.target.value
                                )
                              }
                              className="rounded-lg border border-white/10 bg-[#0B0E17] px-2 py-0.5 text-[11px] text-slate-300 outline-none"
                            >
                              {item.colors?.map((color) => (
                                <option key={color} value={color}>
                                  {color}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="font-mono text-xs font-black text-lime-300">
                              {formatVND(item.price * item.quantity)}
                            </span>

                            {/* Quantity Control */}
                            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0B0E17] px-2 py-1">
                              <button
                                onClick={() =>
                                  updateCart(item.cartItemId, item.quantity - 1)
                                }
                                className="text-slate-400 hover:text-white"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="w-6 text-center text-xs font-bold">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateCart(item.cartItemId, item.quantity + 1)
                                }
                                className="text-slate-400 hover:text-white"
                              >
                                <Plus size={12} />
                              </button>
                            </div>

                            <button
                              onClick={() => removeFromCart(item.cartItemId)}
                              className="text-slate-500 transition hover:text-rose-400 p-1"
                              title="Xóa"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer / Summary */}
              {cart.length > 0 && (
                <div className="space-y-4 border-t border-white/10 pt-4">
                  {/* Voucher Pill */}
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <Tag size={15} className="text-lime-300" />
                      {appliedCoupon ? (
                        <div>
                          <span className="font-mono font-bold text-lime-300">
                            {appliedCoupon.code}
                          </span>
                          <span className="ml-1 text-slate-400">
                            ({appliedCoupon.title})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Chưa áp dụng voucher</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {appliedCoupon && (
                        <button
                          onClick={removeCoupon}
                          className="text-[11px] text-rose-400 hover:underline"
                        >
                          Gỡ
                        </button>
                      )}
                      <button
                        onClick={() => setCouponModalOpen(true)}
                        className="rounded-lg bg-lime-400/20 px-2.5 py-1 font-bold text-lime-300 hover:bg-lime-400/30 text-[11px]"
                      >
                        {appliedCoupon ? 'Đổi mã' : 'Chọn Voucher'}
                      </button>
                    </div>
                  </div>

                  {/* Lines Breakdown */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Tiền hàng</span>
                      <span className="font-mono text-white">
                        {formatVND(cartSubtotal)}
                      </span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-400 font-semibold">
                        <span>Giảm giá Voucher ({appliedCoupon?.code})</span>
                        <span className="font-mono">
                          -{formatVND(discountAmount)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between border-t border-white/10 pt-2 text-sm">
                      <span className="font-bold text-white">Tổng tiền</span>
                      <b className="font-mono text-base font-black text-lime-300">
                        {formatVND(cartTotal)}
                      </b>
                    </div>
                  </div>

                  {/* Actions */}
                  <div>
                    <button
                      onClick={handleCheckout}
                      disabled={cart.filter((i) => i.selected !== false).length === 0}
                      className="w-full flex items-center justify-between px-5 rounded-2xl bg-gradient-to-r from-lime-400 to-lime-300 py-3.5 text-xs sm:text-sm font-black text-slate-950 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-lime-400/20"
                    >
                      <span className="tracking-wide uppercase">Tiến hành thanh toán</span>
                      <span className="flex items-center gap-1.5 font-mono text-sm sm:text-base font-black">
                        {cartTotal.toLocaleString('vi-VN')}đ <ArrowRight size={18} />
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Coupon Modal */}
      <CouponModal
        isOpen={couponModalOpen}
        onClose={() => setCouponModalOpen(false)}
      />
    </>
  )
}
