import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchBanners } from '../services/banners'
import type { BannerSlide } from '../types'

export function HeroBanner() {
  const [slides, setSlides] = useState<BannerSlide[]>([])
  const [active, setActive] = useState(0)

  useEffect(() => {
    let mounted = true
    const load = () => {
      fetchBanners({ active_only: true })
        .then((data) => {
          if (mounted && Array.isArray(data) && data.length > 0) {
            setSlides(data)
          }
        })
        .catch(console.error)
    }

    load()
    window.addEventListener('banners-changed', load)
    return () => {
      mounted = false
      window.removeEventListener('banners-changed', load)
    }
  }, [])

  useEffect(() => {
    if (slides.length <= 1) return
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % slides.length),
      6000
    )
    return () => window.clearInterval(timer)
  }, [slides.length])

  if (slides.length === 0) return null

  // Safe fallback if active index is out of bounds
  const currentSlide = slides[active] || slides[0]

  return (
    <section className="relative min-h-[640px] lg:min-h-[720px] overflow-hidden bg-[#0B0E17]">
      {/* Background Image Slider */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide.id || active}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(11,14,23,0.96) 0%, rgba(11,14,23,0.7) 50%, rgba(11,14,23,0.3) 100%), url(${currentSlide.image})`,
          }}
        />
      </AnimatePresence>

      {/* Hero Content */}
      <div className="relative mx-auto flex min-h-[640px] lg:min-h-[720px] max-w-7xl items-center px-6 pb-24 pt-20 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-lime-400/30 bg-lime-400/10 px-3 py-1 text-xs font-bold text-lime-300 backdrop-blur-md">
              <Zap size={14} className="fill-lime-300" />
              <span>{currentSlide.tag || 'BỘ SƯU TẬP MỚI'}</span>
              <span className="text-white/40">•</span>
              <span className="font-mono text-[11px] tracking-wider">{currentSlide.subtitle || 'NEW SEASON / 2026'}</span>
            </div>

            <h1 className="mt-6 text-6xl font-black uppercase leading-[0.88] tracking-[-0.06em] text-white sm:text-8xl lg:text-[110px]">
              {currentSlide.title}
            </h1>

            <p className="mt-6 max-w-lg text-sm sm:text-base leading-relaxed text-slate-300 font-normal">
              Trang bị cho mỗi bước chạy, cú sút uy lực và khoảnh khắc tạo nên khác biệt trên mọi mặt sân cỏ cùng Striker Sport Pro.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to={currentSlide.link || '/shop'}
                className="group inline-flex items-center gap-3 rounded-2xl bg-lime-400 px-7 py-4 text-sm font-black uppercase tracking-wider text-slate-950 shadow-xl shadow-lime-400/20 transition-all hover:bg-lime-300 hover:scale-105"
              >
                Khám phá ngay
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>

              <Link
                to="/shop?category=giay-bong-da"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-4 text-sm font-bold text-white backdrop-blur-md transition hover:border-lime-400 hover:text-lime-300"
              >
                <Sparkles size={16} /> Giày sân cỏ
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Carousel Indicators & Controls */}
        <div className="absolute bottom-8 left-6 right-6 flex items-center justify-between lg:left-8 lg:right-8">
          <div className="flex items-center gap-2.5">
            {slides.map((_, index) => (
              <button
                key={index}
                aria-label={`Slide ${index + 1}`}
                onClick={() => setActive(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === active ? 'w-12 bg-lime-400' : 'w-4 bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActive((active - 1 + slides.length) % slides.length)}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-white/15 bg-[#131823]/80 text-white backdrop-blur-md transition hover:border-lime-400 hover:text-lime-300"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setActive((active + 1) % slides.length)}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-white/15 bg-[#131823]/80 text-white backdrop-blur-md transition hover:border-lime-400 hover:text-lime-300"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
