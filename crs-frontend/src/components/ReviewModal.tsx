import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Star, X } from 'lucide-react'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import { createReview } from '../services/reviews'

interface ReviewModalProps {
  isOpen: boolean
  productId: number
  productName: string
  productImage?: string
  orderId?: string
  onClose: () => void
  onSuccess?: () => void
}

const ratingLabels: Record<number, string> = {
  1: 'Rất không hài lòng 😞',
  2: 'Chưa hài lòng 😐',
  3: 'Bình thường 🙂',
  4: 'Hài lòng & Tốt 😊',
  5: 'Rất tuyệt vời! Đáng mua ⭐⭐⭐⭐⭐',
}

export function ReviewModal({
  isOpen,
  productId,
  productName,
  productImage,
  orderId,
  onClose,
  onSuccess,
}: ReviewModalProps) {
  const { user } = useApp()
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const activeRating = hoverRating ?? rating

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) {
      toast.error('Vui lòng nhập nội dung nhận xét của bạn!')
      return
    }
    if (!user?.id) {
      toast.error('Vui lòng đăng nhập để gửi đánh giá.')
      return
    }

    setSubmitting(true)
    try {
      await createReview({
        order_id: orderId ?? '',
        product_id: productId,
        user_id: user.id as number,
        user_name: user.name || 'Khách Hàng Striker',
        user_avatar: user.avatar,
        rating,
        comment: comment.trim(),
      })
      toast.success('Cảm ơn bạn đã đánh giá sản phẩm! ⭐', {
        description: 'Đánh giá của bạn giúp cộng đồng chọn lựa sản phẩm chính xác hơn.',
      })
      setComment('')
      setRating(5)
      onSuccess?.()
      onClose()
    } catch (err: any) {
      const msg: string =
        err?.response?.data?.message ??
        'Không thể gửi đánh giá. Vui lòng thử lại sau.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
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
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-slate-900 p-6 sm:p-8 text-white shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-5 top-5 rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="space-y-1">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-lime-400">
                PRODUCT REVIEW
              </span>
              <h2 className="text-xl font-black text-white">Đánh giá sản phẩm</h2>
            </div>

            {/* Product Snapshot */}
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
              {productImage && (
                <img
                  src={
                    productImage?.startsWith('http') || productImage?.startsWith('data:')
                      ? productImage
                      : productImage?.startsWith('/storage/')
                      ? `http://localhost:8000${productImage}`
                      : `http://localhost:8000/storage/${productImage || ''}`
                  }
                  alt={productName}
                  className="h-12 w-12 rounded-xl object-cover border border-white/10 bg-slate-950"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=80'
                  }}
                />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-xs font-bold text-white">{productName}</h3>
                {orderId && (
                  <p className="text-[11px] text-slate-400">Mã đơn hàng: {orderId}</p>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {/* Star Rating Selection */}
              <div className="text-center space-y-2">
                <span className="text-xs font-bold text-slate-300">
                  Mức độ hài lòng của bạn
                </span>
                <div className="flex justify-center gap-2 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setRating(star)}
                      className="p-1.5 transition-transform hover:scale-125 focus:outline-none"
                    >
                      <Star
                        size={28}
                        className={`transition-colors ${
                          star <= activeRating
                            ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                            : 'text-slate-600 hover:text-slate-400'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="font-semibold text-xs text-lime-300 min-h-[18px]">
                  {ratingLabels[activeRating]}
                </p>
              </div>

              {/* Comment Content */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Nhận xét chi tiết <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Hãy chia sẻ trải nghiệm của bạn về cảm giác mang, chất lượng upper, độ bám sân hoặc dịch vụ giao hàng..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-xs text-white outline-none placeholder:text-slate-600 focus:border-lime-400 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-white/10 px-5 py-3 text-xs font-bold text-white hover:bg-white/10"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-lime-400 px-6 py-3 text-xs font-black uppercase text-slate-950 hover:bg-lime-300 transition shadow-lg shadow-lime-400/20"
                >
                  {submitting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                  ) : (
                    <>
                      <Check size={16} /> Gửi đánh giá
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
