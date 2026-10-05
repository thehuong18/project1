import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShoppingBag, Star, Check } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { Product } from '../types'
import { formatVND } from '../utils'

interface ProductCardProps {
  product: Product
  className?: string
}

export function ProductCard({ product, className = '' }: ProductCardProps) {
  const { addToCart } = useApp()
  const [added, setAdded] = useState(false)

  const isOutOfStock = !product.stock || product.stock <= 0

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isOutOfStock) return
    const size = product.sizes?.[0] || 'Default'
    const color = product.colors?.[0] || 'Default'
    addToCart(product, 1, { size, color })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  const discountPercent =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : null

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 p-3.5 backdrop-blur-xl transition-all duration-300 hover:border-lime-400/40 hover:shadow-[0_0_25px_rgba(163,230,53,0.15)] ${className}`}
    >
      {/* Badges */}
      <div className="absolute top-5 left-5 z-10 flex flex-col gap-1.5">
        {isOutOfStock && (
          <span className="rounded-full bg-rose-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-md">
            Hết hàng
          </span>
        )}
        {product.tag && !isOutOfStock && (
          <span className="rounded-full bg-lime-400 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-md">
            {product.tag}
          </span>
        )}
        {discountPercent && !isOutOfStock && (
          <span className="rounded-full bg-rose-500 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-white shadow-md">
            -{discountPercent}%
          </span>
        )}
      </div>

      {/* Product Image */}
      <Link to={`/product/${product.id}`} className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-950/40">
        <img
          src={product.image || 'https://images.unsplash.com/photo-1511886929837-354d827aae26'}
          alt={product.name}
          className={`h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105 ${
            isOutOfStock ? 'opacity-60 grayscale' : ''
          }`}
          loading="lazy"
        />
      </Link>

      {/* Details */}
      <div className="mt-3.5 flex flex-1 flex-col justify-between space-y-2">
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-lime-400/90">
              {typeof product.brand === 'object' && product.brand !== null ? (product.brand as any).name : (product.brand || 'STRIKER')}
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <Star size={12} className="fill-amber-400" />
              <span className="font-bold text-slate-200">
                {product.rating != null ? Number(product.rating).toFixed(1) : '5.0'}
              </span>
            </span>
          </div>

          <Link to={`/product/${product.id}`} className="block mt-1">
            <h3 className="line-clamp-1 text-sm font-bold text-white transition-colors group-hover:text-lime-400">
              {product.name}
            </h3>
          </Link>
        </div>

        {/* Price & Action */}
        <div className="flex items-end justify-between pt-1">
          <div className="flex flex-col">
            <span className="text-base font-black text-white">{formatVND(product.price)}</span>
            {product.oldPrice && product.oldPrice > product.price && (
              <span className="text-[11px] text-slate-500 line-through">
                {formatVND(product.oldPrice)}
              </span>
            )}
          </div>

          {isOutOfStock ? (
            <span className="flex h-9 items-center rounded-xl bg-rose-500/10 border border-rose-500/20 px-2.5 text-[11px] font-bold text-rose-400">
              Hết hàng
            </span>
          ) : (
            <button
              onClick={handleAddToCart}
              className={`flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all duration-200 ${
                added
                  ? 'bg-emerald-500 text-white'
                  : 'bg-lime-400 text-slate-950 hover:bg-lime-300 hover:shadow-[0_0_15px_rgba(163,230,53,0.4)]'
              }`}
            >
              {added ? (
                <>
                  <Check size={14} />
                  <span>Đã thêm</span>
                </>
              ) : (
                <>
                  <ShoppingBag size={14} />
                  <span>Thêm</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
