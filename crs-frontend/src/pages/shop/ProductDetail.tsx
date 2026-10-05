import { useEffect, useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Star,
  ShoppingBag,
  Zap,
  ShieldCheck,
  Truck,
  RotateCcw,
  Check,
  ChevronRight,
  ChevronLeft,
  Share2,
  Minus,
  Plus,
  ArrowLeft,
  Sparkles,
  MessageSquareText,
  Award,
} from 'lucide-react'
import { toast } from 'sonner'
import { useApp } from '../../context/AppContext'
import { fetchProducts } from '../../services/catalog'
import { fetchReviews } from '../../services/reviews'
import { ProductCard } from '../../components/ProductCard'
import type { Product, Review } from '../../types'

const normalizeProduct = (p: any): Product => {
  const categoryName = typeof p.category === 'object' && p.category !== null ? (p.category.name ?? 'Khác') : (p.category ?? 'Khác')
  const brandName = typeof p.brand === 'object' && p.brand !== null ? (p.brand.name ?? 'STRIKER') : (p.brand ?? 'STRIKER')

  return {
    ...p,
    id: Number(p.id),
    name: p.name ?? '',
    price: Number(p.price ?? 0),
    oldPrice: p.oldPrice || p.old_price ? Number(p.oldPrice || p.old_price) : undefined,
    tag: p.tag || undefined,
    category: categoryName,
    brand: brandName,
    stock: Number(p.stock ?? 0),
    image: p.image || (Array.isArray(p.images) ? p.images[0] : '') || p.image_url || '',
    images: Array.isArray(p.images) && p.images.length > 0 ? p.images : ((p.image || p.image_url) ? [p.image || p.image_url] : []),
    sizes: Array.isArray(p.sizes) && p.sizes.length > 0 ? p.sizes : (p.variants ? [...new Set(p.variants.map((v: any) => v.attributes?.size).filter(Boolean))] : ['Standard']),
    colors: Array.isArray(p.colors) && p.colors.length > 0 ? p.colors : (p.variants ? [...new Set(p.variants.map((v: any) => v.attributes?.color).filter(Boolean))] : ['Standard']),
    variants: Array.isArray(p.variants) ? p.variants : [],
  }
}

export function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToCart } = useApp()

  const [product, setProduct] = useState<Product | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  
  // Gallery state with auto-slide
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isGalleryPaused, setIsGalleryPaused] = useState(false)

  // Selection states
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'shipping' | 'reviews'>('description')
  const [added, setAdded] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return '5.0'
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0)
    return (sum / reviews.length).toFixed(1)
  }, [reviews])

  useEffect(() => {
    let isMounted = true
    setLoading(true)

    const loadProductData = async () => {
      let found: Product | undefined

      try {
        const apiData = await fetchProducts({ per_page: 100 })
        const rawList: any[] = Array.isArray(apiData) ? apiData : (apiData?.data ?? [])
        if (Array.isArray(rawList)) {
          const list = rawList.map(normalizeProduct)
          found = list.find((p: Product) => String(p.id) === String(id) || (p as any).slug === id)
          if (found) {
            const related = list
              .filter((p: Product) => p.id !== found?.id && ((p.category && p.category === found?.category) || (p.brand && p.brand === found?.brand)))
              .slice(0, 4)
            setRelatedProducts(related)
          } else {
            setRelatedProducts(list.slice(0, 4))
          }
        }
      } catch (err) {
        console.warn('API fetch products error:', err)
      }

      if (isMounted) {
        if (found) {
          setProduct(found)
          setCurrentImageIndex(0)
          setSelectedSize(found.sizes?.[0] || '')
          setSelectedColor(found.colors?.[0] || '')

          // Fetch reviews
          try {
            const revData = await fetchReviews(found.id)
            if (Array.isArray(revData)) {
              setReviews(revData)
            }
          } catch {
            setReviews([])
          }
        } else {
          setProduct(null)
        }
        setLoading(false)
      }
    }

    loadProductData()
    window.scrollTo({ top: 0, behavior: 'smooth' })

    return () => {
      isMounted = false
    }
  }, [id])

  // Images list
  const imagesList = useMemo(() => {
    if (!product) return []
    const imgs = product.images && product.images.length > 0 ? product.images : [product.image]
    return imgs.filter(Boolean)
  }, [product])

  // Auto-slide gallery every 4 seconds
  useEffect(() => {
    if (imagesList.length <= 1 || isGalleryPaused) return
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % imagesList.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [imagesList.length, isGalleryPaused])

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? imagesList.length - 1 : prev - 1))
  }

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % imagesList.length)
  }

  // Variant matching
  const currentVariant = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) return null
    return (
      product.variants.find((v) => {
        const vSize = String(v.attributes?.size ?? '').trim().toLowerCase()
        const vColor = String(v.attributes?.color ?? '').trim().toLowerCase()
        const sSize = String(selectedSize).trim().toLowerCase()
        const sColor = String(selectedColor).trim().toLowerCase()
        return (vSize === sSize || !sSize) && (vColor === sColor || !sColor)
      }) || null
    )
  }, [product, selectedSize, selectedColor])

  // Current stock based on selected variant
  const currentVariantStock = useMemo(() => {
    if (currentVariant != null) {
      return Number(currentVariant.stock) || 0
    }
    return Number(product?.stock) || 0
  }, [currentVariant, product?.stock])

  const isOutOfStock = currentVariantStock <= 0

  // Helper to check stock of a specific size with currently selected color
  const getSizeStock = (size: string) => {
    if (!product?.variants || product.variants.length === 0) return product?.stock ?? 10
    const v = product.variants.find((item) => {
      const vSize = String(item.attributes?.size ?? '').trim().toLowerCase()
      const vColor = String(item.attributes?.color ?? '').trim().toLowerCase()
      const sColor = String(selectedColor).trim().toLowerCase()
      return vSize === size.trim().toLowerCase() && (vColor === sColor || !sColor)
    })
    return v ? Number(v.stock) || 0 : 0
  }

  // Helper to check stock of a specific color with currently selected size
  const getColorStock = (color: string) => {
    if (!product?.variants || product.variants.length === 0) return product?.stock ?? 10
    const v = product.variants.find((item) => {
      const vSize = String(item.attributes?.size ?? '').trim().toLowerCase()
      const vColor = String(item.attributes?.color ?? '').trim().toLowerCase()
      const sSize = String(selectedSize).trim().toLowerCase()
      return vColor === color.trim().toLowerCase() && (vSize === sSize || !sSize)
    })
    return v ? Number(v.stock) || 0 : 0
  }

  // Adjust quantity whenever stock updates
  useEffect(() => {
    if (isOutOfStock) {
      setQuantity(1)
    } else if (quantity > currentVariantStock) {
      setQuantity(Math.max(1, currentVariantStock))
    }
  }, [currentVariantStock, isOutOfStock])

  if (loading) {
    return (
      <div className="min-h-[70vh] grid place-items-center bg-[#0B0E17] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-lime-400 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-400">Đang tải thông tin sản phẩm...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-[70vh] grid place-items-center bg-[#0B0E17] px-4 py-20 text-center">
        <div className="max-w-md space-y-5 rounded-3xl border border-white/10 bg-slate-900/60 p-8 backdrop-blur-xl">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/5 text-3xl">
            ⚽
          </div>
          <h2 className="text-2xl font-black text-white">Không tìm thấy sản phẩm</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Sản phẩm bạn đang tìm kiếm không tồn tại hoặc đã bị gỡ khỏi hệ thống.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 rounded-xl bg-lime-400 px-6 py-3 text-xs font-bold text-slate-950 hover:bg-lime-300 transition-colors"
          >
            <ArrowLeft size={16} />
            Quay lại cửa hàng
          </Link>
        </div>
      </div>
    )
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)

  const discountPercent =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : null

  const handleAddToCart = () => {
    if (isOutOfStock) {
      toast.error(`Phân loại (Size ${selectedSize} · Màu ${selectedColor}) hiện đã hết hàng!`)
      return
    }
    addToCart(product, quantity, {
      size: selectedSize || product.sizes?.[0] || 'Standard',
      color: selectedColor || product.colors?.[0] || 'Standard',
    })
    setAdded(true)
    toast.success(`Đã thêm ${quantity} x ${product.name} (Size ${selectedSize} · ${selectedColor}) vào giỏ hàng!`)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleBuyNow = () => {
    if (isOutOfStock) {
      toast.error(`Phân loại (Size ${selectedSize} · Màu ${selectedColor}) hiện đã hết hàng!`)
      return
    }
    addToCart(product, quantity, {
      size: selectedSize || product.sizes?.[0] || 'Standard',
      color: selectedColor || product.colors?.[0] || 'Standard',
    })
    navigate('/checkout')
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Đã sao chép liên kết sản phẩm!')
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0E17] text-white px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-slate-400">
          <Link to="/" className="hover:text-white transition-colors">
            Trang chủ
          </Link>
          <ChevronRight size={14} />
          <Link to="/shop" className="hover:text-white transition-colors">
            Cửa hàng
          </Link>
          <ChevronRight size={14} />
          <span className="truncate font-semibold text-lime-400 max-w-[200px] sm:max-w-none">
            {product.name}
          </span>
        </nav>

        {/* Product Main Container */}
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Gallery with Auto-slide and Navigation Arrows */}
          <div className="lg:col-span-7 space-y-4">
            <div
              className="relative aspect-square w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl group"
              onMouseEnter={() => setIsGalleryPaused(true)}
              onMouseLeave={() => setIsGalleryPaused(false)}
            >
              {/* Product Badges */}
              <div className="absolute top-5 left-5 z-20 flex flex-col gap-2">
                {product.tag && (
                  <span className="rounded-full bg-lime-400 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg">
                    {product.tag}
                  </span>
                )}
                {discountPercent && (
                  <span className="rounded-full bg-rose-500 px-3.5 py-1 text-xs font-black tracking-wider text-white shadow-lg">
                    Giảm {discountPercent}%
                  </span>
                )}
              </div>

              {/* Share button (Wishlist button removed as requested) */}
              <div className="absolute top-5 right-5 z-20 flex gap-2">
                <button
                  onClick={handleShare}
                  title="Chia sẻ liên kết sản phẩm"
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-slate-950/70 text-slate-300 backdrop-blur-md hover:text-white hover:bg-slate-950 transition-all shadow-lg"
                >
                  <Share2 size={18} />
                </button>
              </div>

              {/* Main Product Image with Animation */}
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImageIndex}
                  src={imagesList[currentImageIndex] || product.image}
                  alt={`${product.name} - ảnh ${currentImageIndex + 1}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="h-full w-full object-cover object-center"
                />
              </AnimatePresence>

              {/* Navigation Arrows */}
              {imagesList.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    title="Ảnh trước"
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-slate-950/70 text-white backdrop-blur-md hover:bg-lime-400 hover:text-slate-950 transition-all shadow-xl active:scale-95 opacity-80 group-hover:opacity-100"
                  >
                    <ChevronLeft size={22} />
                  </button>

                  <button
                    onClick={handleNextImage}
                    title="Ảnh kế tiếp"
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-slate-950/70 text-white backdrop-blur-md hover:bg-lime-400 hover:text-slate-950 transition-all shadow-xl active:scale-95 opacity-80 group-hover:opacity-100"
                  >
                    <ChevronRight size={22} />
                  </button>

                  {/* Dots Indicator */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full bg-slate-950/60 px-3 py-1.5 backdrop-blur-md border border-white/10">
                    {imagesList.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`h-2 rounded-full transition-all ${
                          currentImageIndex === idx ? 'w-6 bg-lime-400' : 'w-2 bg-white/40 hover:bg-white/80'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails list */}
            {imagesList.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                {imagesList.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`relative aspect-square w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition-all ${
                      currentImageIndex === idx
                        ? 'border-lime-400 shadow-[0_0_15px_rgba(163,230,53,0.3)]'
                        : 'border-white/10 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`${product.name} thumbnail ${idx + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Specs & Buying Form */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Brand & Category Header */}
              <div className="flex items-center justify-between text-xs">
                <span className="rounded-lg bg-lime-400/10 px-3 py-1 font-bold text-lime-400 border border-lime-400/20">
                  {typeof product.brand === 'object' && product.brand !== null ? (product.brand as any).name : product.brand}
                </span>
                <span className="text-slate-400">
                  {typeof product.category === 'object' && product.category !== null ? (product.category as any).name : product.category}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {product.name}
              </h1>

              {/* Rating & Stock Display by Selected Variant */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={
                        reviews.length === 0
                          ? 'fill-amber-400 text-amber-400'
                          : i < Math.round(Number(averageRating))
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-600'
                      }
                    />
                  ))}
                  <span className="ml-1 font-bold text-slate-200">{averageRating}</span>
                  <span className="text-slate-500">
                    ({reviews.length > 0 ? `${reviews.length} đánh giá` : 'Chưa có đánh giá'})
                  </span>
                </div>
                <span className="text-slate-600">|</span>
                {isOutOfStock ? (
                  <span className="font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                    Hết hàng
                  </span>
                ) : (
                  <span className="font-semibold text-emerald-400">
                    Còn hàng ({currentVariantStock} sản phẩm cho phân loại này)
                  </span>
                )}
              </div>

              {/* Price Section */}
              <div className="flex items-baseline gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl">
                <span className="text-3xl font-black text-lime-400">
                  {formatCurrency(product.price)}
                </span>
                {product.oldPrice && product.oldPrice > product.price && (
                  <span className="text-sm text-slate-500 line-through">
                    {formatCurrency(product.oldPrice)}
                  </span>
                )}
              </div>

              {/* Short Description */}
              <p className="text-xs text-slate-300 leading-relaxed">
                {product.description}
              </p>

              {/* Color Selector with Out of Stock Badge */}
              {product.colors && product.colors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-300">
                      Màu sắc: <span className="text-lime-400">{selectedColor}</span>
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.map((color) => {
                      const cStock = getColorStock(color)
                      const isColorOut = cStock <= 0
                      return (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`rounded-xl border px-4 py-2 text-xs font-semibold transition-all relative flex items-center gap-1.5 ${
                            selectedColor === color
                              ? 'border-lime-400 bg-lime-400/20 text-lime-400 shadow-[0_0_10px_rgba(163,230,53,0.2)]'
                              : isColorOut
                              ? 'border-white/5 bg-white/[0.02] text-slate-500 hover:border-white/10'
                              : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/30'
                          }`}
                        >
                          <span>{color}</span>
                          {isColorOut && (
                            <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20">
                              Hết
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Size Selector with Out of Stock Badge (Size Guide removed as requested) */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-300">
                      Kích thước: <span className="text-lime-400">{selectedSize}</span>
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size) => {
                      const sStock = getSizeStock(size)
                      const isSizeOut = sStock <= 0
                      return (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`min-w-[48px] h-10 rounded-xl border px-3 text-xs font-bold transition-all relative flex items-center justify-center gap-1 ${
                            selectedSize === size
                              ? 'border-lime-400 bg-lime-400 text-slate-950 shadow-[0_0_12px_rgba(163,230,53,0.3)]'
                              : isSizeOut
                              ? 'border-white/5 bg-white/[0.02] text-slate-500 hover:border-white/10'
                              : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/30'
                          }`}
                        >
                          <span>{size}</span>
                          {isSizeOut && (
                            <span
                              className={`text-[9px] font-bold px-1 rounded ${
                                selectedSize === size
                                  ? 'bg-slate-950/80 text-rose-400'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              Hết
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Counter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Số lượng:</label>
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center rounded-xl border p-1 ${
                      isOutOfStock ? 'border-white/5 bg-white/[0.02] opacity-50' : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1 || isOutOfStock}
                      className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-10 text-center text-sm font-bold text-white">
                      {isOutOfStock ? 0 : quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(currentVariantStock, q + 1))}
                      disabled={quantity >= currentVariantStock || isOutOfStock}
                      className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="text-xs text-slate-500">
                    Tổng: <b className="text-white">{formatCurrency(product.price * (isOutOfStock ? 0 : quantity))}</b>
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons (Disabled when out of stock) */}
            <div className="space-y-3 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className={`flex h-12 items-center justify-center gap-2 rounded-2xl border text-xs font-bold transition-all duration-200 cursor-pointer ${
                    isOutOfStock
                      ? 'border-white/5 bg-white/[0.02] text-slate-500 cursor-not-allowed'
                      : added
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-lime-400/40 bg-lime-400/10 text-lime-400 hover:bg-lime-400/20 active:scale-[0.98]'
                  }`}
                >
                  {isOutOfStock ? (
                    <span>Tạm hết hàng</span>
                  ) : added ? (
                    <>
                      <Check size={16} />
                      <span>Đã thêm vào giỏ</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={16} />
                      <span>Thêm vào giỏ</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className={`flex h-12 items-center justify-center gap-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    isOutOfStock
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-lime-400 text-slate-950 shadow-[0_0_20px_rgba(163,230,53,0.3)] hover:bg-lime-300 active:scale-[0.98]'
                  }`}
                >
                  {isOutOfStock ? (
                    <span>Hết hàng</span>
                  ) : (
                    <>
                      <Zap size={16} />
                      <span>Mua ngay</span>
                    </>
                  )}
                </button>
              </div>

              {/* Badges / Guarantees */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10 text-center">
                <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                  <ShieldCheck className="text-lime-400" size={20} />
                  <span className="text-[10px] font-bold text-white">Chính hãng 100%</span>
                  <span className="text-[9px] text-slate-500">Cam kết chuẩn Auth</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                  <Truck className="text-lime-400" size={20} />
                  <span className="text-[10px] font-bold text-white">Giao hàng GHN</span>
                  <span className="text-[9px] text-slate-500">Toàn quốc 1-3 ngày</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                  <RotateCcw className="text-lime-400" size={20} />
                  <span className="text-[10px] font-bold text-white">Đổi trả 30 ngày</span>
                  <span className="text-[9px] text-slate-500">Hỗ trợ đổi size</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Tabs Area */}
        <div className="mt-16 rounded-3xl border border-white/10 bg-slate-900/60 p-6 lg:p-8 backdrop-blur-xl space-y-6">
          {/* Tab Headers */}
          <div className="flex flex-wrap gap-3 border-b border-white/10 pb-4">
            {[
              { key: 'description', label: 'Mô tả chi tiết', icon: Sparkles },
              { key: 'specs', label: 'Thông số kỹ thuật', icon: Award },
              { key: 'shipping', label: 'Giao hàng & Đổi trả', icon: Truck },
              { key: 'reviews', label: `Đánh giá (${reviews.length})`, icon: MessageSquareText },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab.key
                      ? 'bg-lime-400 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Tab Content */}
          <div className="text-xs leading-relaxed text-slate-300">
            {activeTab === 'description' && (
              <div className="space-y-4 max-w-3xl">
                <h3 className="text-base font-bold text-white">Đặc điểm nổi bật của {product.name}</h3>
                <p>{product.description}</p>
                <p>
                  Sản phẩm thuộc dòng sản phẩm cao cấp phân phối độc quyền bởi STRIKER. Được làm từ chất liệu thể thao chuyên dụng, tối ưu độ bền và mang lại trải nghiệm thi đấu thăng hoa cho người chơi.
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-400 pt-2">
                  <li>Form dáng ôm chân chuẩn thiết kế thể thao hiện đại.</li>
                  <li>Đế giày gia cố chắc chắn, tăng khả năng bám sân đột phá.</li>
                  <li>Trọng lượng siêu nhẹ giúp di chuyển linh hoạt trên mọi mặt sân.</li>
                </ul>
              </div>
            )}

            {activeTab === 'specs' && (
              <div className="max-w-2xl">
                <table className="w-full text-left border-collapse">
                  <tbody>
                    <tr className="border-b border-white/10">
                      <td className="py-2.5 font-semibold text-slate-400">Thương hiệu:</td>
                      <td className="py-2.5 font-bold text-white">
                        {typeof product.brand === 'object' && product.brand !== null ? (product.brand as any).name : product.brand}
                      </td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-2.5 font-semibold text-slate-400">Danh mục:</td>
                      <td className="py-2.5 text-white">
                        {typeof product.category === 'object' && product.category !== null ? (product.category as any).name : product.category}
                      </td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-2.5 font-semibold text-slate-400">Chất liệu:</td>
                      <td className="py-2.5 text-white">Sợi dệt Flyknit/Gripknit cao cấp kết hợp đệm khí chuyên dụng</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-2.5 font-semibold text-slate-400">Loại đinh:</td>
                      <td className="py-2.5 text-white">FG / AG (Phù hợp mặt cỏ tự nhiên & nhân tạo)</td>
                    </tr>
                    <tr className="border-b border-white/10">
                      <td className="py-2.5 font-semibold text-slate-400">Tình trạng tồn kho:</td>
                      <td className="py-2.5 text-emerald-400 font-bold">
                        {isOutOfStock ? 'Hết hàng' : `Còn ${currentVariantStock} sản phẩm`}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-semibold text-slate-400">Xuất xứ:</td>
                      <td className="py-2.5 text-white">Chính hãng nhập khẩu / Phân phối chính thức</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="space-y-4 max-w-3xl">
                <h3 className="text-base font-bold text-white">Chính sách vận chuyển & Đổi trả</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
                    <h4 className="font-bold text-lime-400 flex items-center gap-2">
                      <Truck size={16} /> Vận chuyển nhanh GHN Express
                    </h4>
                    <p className="text-slate-400">Giao hàng toàn quốc từ 1-3 ngày làm việc. Tự động tính phí trực tiếp từ API GHN.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
                    <h4 className="font-bold text-lime-400 flex items-center gap-2">
                      <RotateCcw size={16} /> Đổi trả dễ dàng
                    </h4>
                    <p className="text-slate-400">Hỗ trợ đổi size hoặc mẫu khác trong vòng 30 ngày nếu sản phẩm chưa qua sử dụng và nguyên tem mác.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {/* Review Header Stats */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-4xl font-black text-lime-400">{averageRating}</div>
                      <div className="text-[10px] text-slate-400">trên 5 sao</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={i < Math.round(Number(averageRating)) ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}
                          />
                        ))}
                      </div>
                      <span className="text-slate-400 text-[11px]">
                        Dựa trên {reviews.length} đánh giá thực tế từ khách hàng
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reviews List */}
                {reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((rev) => (
                      <div key={rev.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 place-items-center rounded-full bg-lime-400/10 font-bold text-lime-400 border border-lime-400/20 text-xs">
                              {rev.userName ? rev.userName.charAt(0).toUpperCase() : 'K'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm">{rev.userName}</span>
                                <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                                  <Check size={10} /> Đã mua hàng
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500">{rev.date}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 text-amber-400">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={13}
                                className={i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-slate-300 text-xs leading-relaxed pt-0.5">{rev.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 py-12 text-center space-y-3">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-400">
                      <MessageSquareText size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Chưa có đánh giá nào cho sản phẩm này</h4>
                      <p className="text-xs text-slate-400 mt-1">Sản phẩm hiện đang được cập nhật thêm phản hồi từ khách hàng.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="mt-16 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Sản phẩm tương tự</h2>
                <p className="text-xs text-slate-400">Có thể bạn cũng sẽ thích các mẫu sản phẩm này</p>
              </div>
              <Link to="/shop" className="text-xs font-bold text-lime-400 hover:underline">
                Xem tất cả &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {relatedProducts.map((rel) => (
                <ProductCard key={rel.id} product={rel} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
