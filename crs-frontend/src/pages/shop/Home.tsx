import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Headphones,
  RotateCcw,
  Truck,
} from 'lucide-react'
import { ProductCard } from '../../components/ProductCard'
import { HeroBanner } from '../../components/HeroBanner'
import { fetchProducts } from '../../services/catalog'
import { fetchReviewSummaries } from '../../services/reviews'
import { fetchSalesSummary } from '../../services/orders'
import type { Product } from '../../types'

export function Home() {
  const [activeTab, setActiveTab] = useState<'all' | 'hot' | 'sale'>('all')
  const [homeProducts, setHomeProducts] = useState<Product[]>([])

  useEffect(() => {
    let mounted = true
    Promise.all([
      fetchProducts({ per_page: 50 }).catch(() => []),
      fetchReviewSummaries().catch(() => ({} as Record<number, any>)),
      fetchSalesSummary().catch(() => ({} as Record<number, number>)),
    ]).then(([prodsRes, reviewsSummaryRes, salesSummaryRes]) => {
      if (!mounted) return

      const revMap = reviewsSummaryRes || {}
      const salesMap = salesSummaryRes || {}
      const pList = Array.isArray(prodsRes) ? prodsRes : (prodsRes?.data ?? [])
      if (pList.length > 0) {
        setHomeProducts(
          pList
            .filter((p: any) => p.isActive !== false && p.status !== 'inactive' && p.is_active !== false)
            .map((item: any) => {
              const rInfo = revMap[item.id] || revMap[Number(item.id)]
              const dynamicRating = rInfo?.avg_rating ? Number(rInfo.avg_rating) : 5.0
              const dynamicCount = rInfo?.review_count ? Number(rInfo.review_count) : 0
              const dynamicSold = Number(salesMap[item.id] ?? salesMap[Number(item.id)] ?? item.soldCount ?? item.sold_count ?? 0)

              return {
                ...item,
                id: Number(item.id),
                price: Number(item.price ?? 0),
                oldPrice: item.oldPrice != null ? Number(item.oldPrice) : (item.old_price != null ? Number(item.old_price) : undefined),
                tag: item.tag || undefined,
                rating: dynamicRating,
                reviewsCount: dynamicCount,
                soldCount: dynamicSold,
                category: typeof item.category === 'object' && item.category !== null ? item.category.name : (item.category ?? 'Khác'),
                brand: typeof item.brand === 'object' && item.brand !== null ? item.brand.name : (item.brand ?? 'STRIKER'),
                image: item.image || item.image_url || (Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : '') || '',
                images: Array.isArray(item.images) && item.images.length > 0 ? item.images : ((item.image || item.image_url) ? [item.image || item.image_url] : []),
                colors: Array.isArray(item.colors) && item.colors.length > 0 ? item.colors : ['Standard'],
                sizes: Array.isArray(item.sizes) && item.sizes.length > 0 ? item.sizes : ['Standard'],
              }
            })
        )
      }
    })

    return () => {
      mounted = false
    }
  }, [])

  // Featured Products filtered by tab:
  const filteredProducts = useMemo(() => {
    return homeProducts.filter((p) => {
      const tag = String(p.tag || '').trim().toUpperCase()
      if (activeTab === 'hot') {
        return tag === 'HOT' || tag === 'BEST SELLER' || tag === 'BESTSELLER'
      }
      if (activeTab === 'sale') {
        return tag === 'SALE' || tag.includes('SALE')
      }
      return true
    })
  }, [homeProducts, activeTab])

  const categoryHighlights = [
    {
      title: 'Giày Bóng Đá',
      tag: '50+ Mẫu Mới',
      link: '/shop?category=giay-bong-da',
      image: 'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Áo Đấu Chính Hãng',
      tag: 'AUTHENTIC',
      link: '/shop?category=ao-dau',
      image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Bóng Thi Đấu',
      tag: 'FIFA PRO',
      link: '/shop?category=bong-thi-dau',
      image: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Phụ Kiện Sân Cỏ',
      tag: 'BẢO HỘ',
      link: '/shop?category=phu-kien',
      image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80',
    },
  ]

  return (
    <div className="bg-[#0B0E17] text-white selection:bg-lime-400 selection:text-slate-950">
      {/* 1. Dynamic Hero Banner Carousel */}
      <HeroBanner />

      {/* 2. Brand Trust Strip */}
      <section className="relative border-y border-white/10 bg-[#131823]/80 py-4 overflow-hidden">
        <div className="flex w-full items-center justify-around gap-8 text-[11px] font-black uppercase tracking-[0.25em] text-emerald-300">
          <div className="flex items-center gap-3">
            <span className="text-lime-400">✦</span>
            <span>THE GAME IS YOURS</span>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-lime-400">✦</span>
            <span>GIAO HÀNG TOÀN QUỐC 2-4 NGÀY</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lime-400">✦</span>
            <span>CHÍNH HÃNG 100% · ĐỔI TRẢ 30 NGÀY</span>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <span className="text-lime-400">✦</span>
            <span>CÔNG NGHỆ CHUYÊN NGHIỆP</span>
          </div>
        </div>
      </section>

      {/* 3. Category Visual Highlights */}
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="mb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Danh mục tuyển chọn
          </span>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Sẵn sàng cho <em>mọi vị trí.</em>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categoryHighlights.map((cat, i) => (
            <Link
              key={i}
              to={cat.link}
              className="group relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/10 shadow-xl transition-all duration-300 hover:border-lime-400/50"
            >
              <img
                src={cat.image}
                alt={cat.title}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
              <div className="absolute inset-x-5 bottom-5">
                <span className="inline-block rounded-full bg-lime-400/20 px-2.5 py-0.5 text-[10px] font-bold text-lime-300 border border-lime-400/30 backdrop-blur-md">
                  {cat.tag}
                </span>
                <h3 className="mt-1 text-lg font-black text-white group-hover:text-lime-300 transition">
                  {cat.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. Featured Products Grid with Tabs */}
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Sản phẩm nổi bật
            </span>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Bộ sưu tập <em>Striker Pro.</em>
            </h2>
          </div>

          <div className="flex rounded-2xl border border-white/10 bg-[#131823] p-1 text-xs font-bold">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'hot', label: 'Bán chạy' },
              { id: 'sale', label: 'Giảm giá' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`rounded-xl px-4 py-2 transition cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-lime-400 text-slate-950 shadow-md font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.slice(0, 8).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-8 py-4 text-xs font-bold text-white transition hover:border-lime-400 hover:bg-lime-400/10 hover:text-lime-300"
          >
            Xem toàn bộ {homeProducts.length} sản phẩm <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* 5. Striker Manifesto Banner - 2-Column Split Layout */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-950 px-5 py-24 lg:px-8 border-t border-white/10">
        <div className="absolute -right-20 -top-28 text-[260px] font-black tracking-[-0.15em] text-white/[0.03] select-none pointer-events-none">
          STRIKER
        </div>

        <div className="relative mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column: Manifesto Content */}
            <div className="flex flex-col items-start text-left">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-lime-300">
                Our Manifesto
              </span>
              <h2 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight text-white">
                Không chỉ là<br />
                <span className="text-lime-300">một trận đấu.</span>
              </h2>
              <p className="mt-6 max-w-lg text-sm leading-relaxed text-gray-300">
                Mỗi đường chuyền, mỗi cú chạm bóng đều là tuyên ngôn về tinh thần thể thao
                không bao giờ bỏ cuộc. Hãy để Striker đồng hành cùng từng bước chạy của bạn.
              </p>
              <div className="mt-8">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-sm font-black text-slate-950 transition hover:bg-lime-400 shadow-xl cursor-pointer"
                >
                  Khám phá bộ sưu tập →
                </Link>
              </div>
            </div>

            {/* Right Column: 3 Policy Items */}
            <div className="flex flex-col gap-8 lg:gap-10">
              <div className="flex items-start gap-4 bg-transparent">
                <div className="shrink-0 text-lime-400 mt-1">
                  <Truck size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Giao Hàng Tiêu Chuẩn</h3>
                  <p className="mt-1 text-sm text-gray-300 leading-relaxed">
                    Giao nhanh trong 2-4 ngày trên toàn quốc với đối tác GHN Express.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 bg-transparent">
                <div className="shrink-0 text-lime-400 mt-1">
                  <RotateCcw size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Đổi Trả 30 Ngày</h3>
                  <p className="mt-1 text-sm text-gray-300 leading-relaxed">
                    Đổi size, đổi mẫu linh hoạt không cần lý do trong vòng 30 ngày.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 bg-transparent">
                <div className="shrink-0 text-lime-400 mt-1">
                  <Headphones size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Tư Vấn Chuyên Sâu</h3>
                  <p className="mt-1 text-sm text-gray-300 leading-relaxed">
                    Đội ngũ am hiểu phom chân, mặt sân cỏ nhân tạo & tự nhiên 24/7.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
