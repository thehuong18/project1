import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpDown,
  Filter,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { ProductCard } from '../../components/ProductCard'
import { ProductSkeleton } from '../../components/Skeleton'
import { fetchProducts, fetchCategories, fetchBrands } from '../../services/catalog'
import { fetchReviewSummaries } from '../../services/reviews'
import type { Product } from '../../types'

function matchCategoryFromQuery(value: string | null, dynamicCats: string[]): string {
  if (!value) return 'Tất cả'
  const normalized = value.trim().toLowerCase()
  const found = dynamicCats.find(
    (c) => c.toLowerCase() === normalized || c.toLowerCase().replace(/\s+/g, '-') === normalized
  )
  if (found) return found

  if (
    normalized === 'giay-bong-da' ||
    normalized === 'giày bóng đá' ||
    normalized === 'giay' ||
    normalized === 'giày'
  ) {
    return 'Giày bóng đá'
  }
  if (
    normalized === 'ao-dau' ||
    normalized === 'áo đấu' ||
    normalized === 'ao' ||
    normalized === 'áo' ||
    normalized === 'cau-lac-bo' ||
    normalized === 'câu lạc bộ'
  ) {
    return 'Áo đấu'
  }
  if (
    normalized === 'bong-thi-dau' ||
    normalized === 'bóng thi đấu' ||
    normalized === 'bong' ||
    normalized === 'bóng'
  ) {
    return 'Bóng thi đấu'
  }
  if (normalized === 'phu-kien' || normalized === 'phụ kiện') {
    return 'Phụ kiện'
  }
  return value
}

export function Shop() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [shopCategories, setShopCategories] = useState<string[]>(['Tất cả'])
  const [shopBrands, setShopBrands] = useState<string[]>(['Tất cả thương hiệu'])
  const [catalog, setCatalog] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [category, setCategory] = useState(() => matchCategoryFromQuery(searchParams.get('category'), shopCategories))
  const [brand, setBrand] = useState('Tất cả thương hiệu')
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [sort, setSort] = useState('featured')
  const [priceRange, setPriceRange] = useState<'all' | 'under1m' | '1m-3m' | 'above3m'>('all')
  const [filterOpen, setFilterOpen] = useState(false)

  // Load categories & brands & products from API
  useEffect(() => {
    let active = true
    Promise.all([
      fetchCategories().catch(() => []),
      fetchBrands().catch(() => []),
      fetchProducts({ per_page: 100 }).catch(() => []),
      fetchReviewSummaries().catch(() => ({} as Record<number, any>)),
    ]).then(([cats, brands, prods, revMapRes]) => {
      if (!active) return

      if (Array.isArray(cats) && cats.length > 0) {
        setShopCategories(['Tất cả', ...cats.map((c: any) => (typeof c === 'string' ? c : c.name))])
      }
      if (Array.isArray(brands) && brands.length > 0) {
        setShopBrands(['Tất cả thương hiệu', ...brands.map((b: any) => (typeof b === 'string' ? b : b.name))])
      }

      const revMap = revMapRes || {}
      const pList: any[] = Array.isArray(prods) ? prods : (prods?.data ?? [])
      if (pList.length > 0) {
        setCatalog(
          pList.map((item: any) => {
            const rInfo = revMap[item.id] || revMap[Number(item.id)]
            const dynamicRating = rInfo?.avg_rating ? Number(rInfo.avg_rating) : 5.0
            const dynamicCount = rInfo?.review_count ? Number(rInfo.review_count) : 0

            return {
              ...item,
              id: Number(item.id),
              price: Number(item.price ?? 0),
              oldPrice: item.oldPrice != null ? Number(item.oldPrice) : (item.old_price != null ? Number(item.old_price) : undefined),
              tag: item.tag || undefined,
              rating: dynamicRating,
              reviewsCount: dynamicCount,
              category: typeof item.category === 'object' && item.category !== null ? item.category.name : (item.category ?? 'Khác'),
              brand: typeof item.brand === 'object' && item.brand !== null ? item.brand.name : (item.brand ?? 'STRIKER'),
              image: item.image || item.image_url || (Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : '') || '',
              images: Array.isArray(item.images) && item.images.length > 0 ? item.images : ((item.image || item.image_url) ? [item.image || item.image_url] : []),
              colors: Array.isArray(item.colors) && item.colors.length > 0 ? item.colors : ['Black'],
              sizes: Array.isArray(item.sizes) && item.sizes.length > 0 ? item.sizes : ['40', '41'],
              description: item.description ?? 'Thiết bị bóng đá chính hãng.',
            }
          })
        )
      }
      setLoading(false)
    }).catch(() => {
      if (active) {
        setOffline(true)
        setLoading(false)
      }
    })

    return () => {
      active = false
    }
  }, [])

  // Listen to searchParams changes (e.g. from Header links or browser back/forward)
  useEffect(() => {
    const qCat = searchParams.get('category')
    const qSearch = searchParams.get('search')
    const qBrand = searchParams.get('brand')

    setCategory(matchCategoryFromQuery(qCat, shopCategories))
    setSearch(qSearch ?? '')
    if (qBrand) {
      setBrand(qBrand)
    } else if (!qCat && !qSearch) {
      setBrand('Tất cả thương hiệu')
      setPriceRange('all')
    }
  }, [searchParams, shopCategories])

  const filtered = useMemo(() => {
    return catalog
      .filter((product) => {
        // Safe check: hide inactive products from public shop
        const matchActive = product.isActive !== false && product.status !== 'inactive'
        const matchCategory = category === 'Tất cả' || product.category === category
        const matchBrand = brand === 'Tất cả thương hiệu' || product.brand === brand
        const matchSearch =
          product.name.toLowerCase().includes(search.toLowerCase()) ||
          product.brand.toLowerCase().includes(search.toLowerCase()) ||
          product.category.toLowerCase().includes(search.toLowerCase())

        let matchPrice = true
        if (priceRange === 'under1m') matchPrice = product.price < 1000000
        else if (priceRange === '1m-3m') matchPrice = product.price >= 1000000 && product.price <= 3000000
        else if (priceRange === 'above3m') matchPrice = product.price > 3000000

        return matchActive && matchCategory && matchBrand && matchSearch && matchPrice
      })
      .sort((a, b) => {
        if (sort === 'low') return a.price - b.price
        if (sort === 'high') return b.price - a.price
        if (sort === 'name') return a.name.localeCompare(b.name)
        return 0
      })
  }, [catalog, category, brand, search, sort, priceRange])

  const handleCategoryChange = (cat: string) => {
    setCategory(cat)
    const next = new URLSearchParams(searchParams)
    if (cat === 'Tất cả') {
      next.delete('category')
    } else {
      next.set('category', cat)
    }
    setSearchParams(next)
  }

  const clearFilters = () => {
    setCategory('Tất cả')
    setBrand('Tất cả thương hiệu')
    setSearch('')
    setPriceRange('all')
    setSort('featured')
    setSearchParams({})
  }


  const hasActiveFilters =
    category !== 'Tất cả' ||
    brand !== 'Tất cả thương hiệu' ||
    search !== '' ||
    priceRange !== 'all'

  return (
    <section className="min-h-screen bg-[#0B0E17] px-5 pb-24 text-white lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Top Banner */}
        <div className="relative -mx-5 overflow-hidden rounded-b-3xl bg-gradient-to-r from-emerald-950 via-[#131823] to-[#0B0E17] px-6 py-16 lg:-mx-8 lg:px-10 border-b border-white/10 shadow-2xl">
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 font-mono text-xs font-bold text-lime-300">
              <Sparkles size={13} /> The Striker Collection / 2026
            </span>
            <h1 className="mt-4 text-5xl font-black uppercase tracking-tight text-white sm:text-7xl">
              Ready when<br />
              <span className="text-lime-300">you are.</span>
            </h1>
            <p className="mt-4 text-sm text-slate-300 leading-relaxed max-w-lg">
              Trang bị đầy đủ giày thi đấu, áo đấu CLB chính hãng và bóng chuẩn quốc tế
              giúp bạn tỏa sáng trên mọi sân cỏ.
            </p>
          </div>
        </div>

        {/* Toolbar Bar */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#131823]/80 p-4 backdrop-blur-md">
          {/* Search Box */}
          <div className="relative min-w-[260px] flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm theo tên sản phẩm, thương hiệu..."
              className="w-full rounded-xl border border-white/10 bg-[#0B0E17]/90 py-2.5 pl-10 pr-9 text-xs text-white outline-none placeholder:text-slate-500 focus:border-lime-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Right Tools */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-white transition hover:border-lime-400 lg:hidden cursor-pointer"
            >
              <SlidersHorizontal size={15} />
              Bộ lọc
            </button>

            <div className="flex items-center gap-2">
              <ArrowUpDown size={15} className="text-slate-400 hidden sm:inline" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#0B0E17] px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-lime-400"
              >
                <option value="featured">Sắp xếp: Nổi bật nhất</option>
                <option value="low">Giá: Thấp đến cao</option>
                <option value="high">Giá: Cao đến thấp</option>
                <option value="name">Tên sản phẩm (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Horizontal Quick Tabs */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {shopCategories.map((item) => (
            <button
              key={item}
              onClick={() => handleCategoryChange(item)}
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                category === item
                  ? 'bg-lime-400 text-slate-950 shadow-md shadow-lime-400/20'
                  : 'border border-white/10 bg-[#131823]/80 text-slate-300 hover:border-white/20 hover:text-white'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Active Filter Pills Bar */}
        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400">Đang lọc:</span>
            {category !== 'Tất cả' && (
              <span className="inline-flex items-center gap-1 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 font-bold text-lime-300">
                {category}
                <X
                  size={12}
                  className="cursor-pointer hover:text-white"
                  onClick={() => handleCategoryChange('Tất cả')}
                />
              </span>
            )}

            {brand !== 'Tất cả thương hiệu' && (
              <span className="inline-flex items-center gap-1 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 font-bold text-lime-300">
                {brand}
                <X
                  size={12}
                  className="cursor-pointer hover:text-white"
                  onClick={() => setBrand('Tất cả thương hiệu')}
                />
              </span>
            )}
            {priceRange !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 font-bold text-lime-300">
                {priceRange === 'under1m'
                  ? 'Dưới 1 triệu'
                  : priceRange === '1m-3m'
                  ? '1 - 3 triệu'
                  : 'Trên 3 triệu'}
                <X
                  size={12}
                  className="cursor-pointer hover:text-white"
                  onClick={() => setPriceRange('all')}
                />
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 font-bold text-lime-300">
                "{search}"
                <X
                  size={12}
                  className="cursor-pointer hover:text-white"
                  onClick={() => setSearch('')}
                />
              </span>
            )}
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:underline ml-2 cursor-pointer"
            >
              <RotateCcw size={11} /> Xóa tất cả lọc
            </button>
          </div>
        )}

        {/* Main Grid + Sidebar */}
        <div className="mt-6 grid gap-8 lg:grid-cols-[240px_1fr]">
          {/* Sidebar Filters */}
          <aside
            className={`${
              filterOpen ? 'block' : 'hidden'
            } space-y-6 rounded-3xl border border-white/10 bg-[#131823]/80 p-6 backdrop-blur-md lg:block h-fit`}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 font-black text-sm">
                <Filter size={16} className="text-lime-400" /> Bộ lọc nâng cao
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-[11px] font-bold text-lime-300 hover:underline"
                >
                  Đặt lại
                </button>
              )}
            </div>

            {/* Brand Filter */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Thương hiệu
              </span>
              <div className="mt-3 space-y-1">
                {shopBrands.map((item) => (
                  <button
                    key={item}
                    onClick={() => setBrand(item)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                      brand === item
                        ? 'bg-lime-400 text-slate-950 font-bold'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span>{item}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="border-t border-white/10 pt-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Khoảng giá
              </span>
              <div className="mt-3 space-y-1 text-xs">
                {[
                  { key: 'all', label: 'Tất cả mức giá' },
                  { key: 'under1m', label: 'Dưới 1.000.000đ' },
                  { key: '1m-3m', label: '1.000.000đ - 3.000.000đ' },
                  { key: 'above3m', label: 'Trên 3.000.000đ' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setPriceRange(item.key as typeof priceRange)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                      priceRange === item.key
                        ? 'bg-lime-400 text-slate-950 font-bold'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Product Cards Grid Area */}
          <div>
            {offline && (
              <div className="mb-6 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-xs text-yellow-200">
                Đang kết nối lại server. Hiển thị danh sách sản phẩm gần nhất.
              </div>
            )}

            <div className="mb-4 flex items-center justify-between text-xs text-slate-400">
              <span>
                Tìm thấy <b className="text-white">{filtered.length}</b> sản phẩm
              </span>
            </div>

            {loading ? (
              <ProductSkeleton />
            ) : filtered.length > 0 ? (
              <motion.div
                layout
                className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3"
              >
                {filtered.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                  />
                ))}
              </motion.div>
            ) : (
              <div className="grid min-h-[380px] place-items-center rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
                <div className="space-y-4 max-w-sm">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/5 text-3xl">
                    🔍
                  </div>
                  <h3 className="text-xl font-black text-white">
                    Không tìm thấy sản phẩm phù hợp
                  </h3>
                  <p className="text-xs text-slate-400">
                    Thử tìm với từ khóa khác hoặc bấm xóa các bộ lọc hiện tại.
                  </p>
                  <button
                    onClick={clearFilters}
                    className="inline-flex rounded-xl bg-lime-400 px-6 py-2.5 text-xs font-bold text-slate-950 hover:bg-lime-300"
                  >
                    Xóa tất cả bộ lọc
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}