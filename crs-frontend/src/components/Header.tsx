import { AnimatePresence, motion } from 'framer-motion'
import {
    Search,
    UserRound,
    ShoppingBag,
    X,
    ShieldCheck,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { useApp } from '../context/AppContext'

export function Header() {
    const { user, cartCount, cartPulse, setCartDrawerOpen, logout } = useApp()
    const displayName = typeof user?.name === 'string' && user.name.trim() ? user.name.trim() : 'Khách hàng'
    const [scrolled, setScrolled] = useState(false)
    const [searchOpen, setSearchOpen] = useState(false)
    const [accountOpen, setAccountOpen] = useState(false)
    const [search, setSearch] = useState('')
    const searchContainerRef = useRef<HTMLDivElement>(null)
    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const navigate = useNavigate()

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', onScroll)
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    // Close search on click outside or escape key
    useEffect(() => {
        if (!searchOpen) return
        const handleClickOutside = (e: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
                const target = e.target as HTMLElement
                if (!target.closest('[data-search-toggle]')) {
                    setSearchOpen(false)
                }
            }
        }
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setSearchOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [searchOpen])

    const submit = (event: React.FormEvent) => {
        event.preventDefault()
        const term = search.trim()
        if (term) navigate(`/shop?search=${encodeURIComponent(term)}`)
        setSearchOpen(false)
    }

    const handleLogout = () => {
        logout()
        setAccountOpen(false)
        navigate('/')
    }

    return (
        <header
            className={`sticky top-0 z-40 border-b transition-all duration-300 ${scrolled
                ? 'border-white/10 bg-[#0B0E17]/90 shadow-2xl shadow-emerald-950/30 backdrop-blur-md'
                : 'border-white/5 bg-[#0B0E17]/75 backdrop-blur-md'
                }`}
        >
            <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
                {/* Logo */}
                <Link
                    to="/"
                    aria-label="Về trang chủ Striker"
                    className="group flex cursor-pointer items-center gap-2 text-lg font-black tracking-[.16em] text-white transition-opacity hover:opacity-80"
                >
                    <span className="grid h-9 w-9 place-items-center rounded-xl rounded-bl-sm bg-lime-400 text-xl italic text-slate-950 transition-transform group-hover:rotate-12">
                        S
                    </span>
                    STRIKER<span className="text-lime-400">.</span>
                </Link>

                {/* Clean Desktop Navigation Links */}
                <nav className="hidden items-center gap-7 text-xs font-bold uppercase tracking-wider text-slate-300 md:flex">
                    <Link
                        to="/shop"
                        className="transition hover:text-lime-400"
                    >
                        Cửa hàng
                    </Link>
                    <Link
                        to="/shop?category=giay-bong-da"
                        className="transition hover:text-lime-400"
                    >
                        Giày bóng đá
                    </Link>
                    <Link
                        to="/shop?category=bong-thi-dau"
                        className="transition hover:text-lime-400"
                    >
                        Bóng thi đấu
                    </Link>
                    <Link
                        to="/shop?category=ao-dau"
                        className="transition hover:text-lime-400"
                    >
                        Áo đấu
                    </Link>
                    <Link
                        to="/shop?category=phu-kien"
                        className="transition hover:text-lime-400"
                    >
                        Phụ kiện
                    </Link>
                </nav>

                {/* Right Action Icons */}
                <div className="flex items-center gap-1 text-white">
                    <button
                        data-search-toggle="true"
                        aria-label="Tìm kiếm"
                        onClick={() => setSearchOpen((prev) => !prev)}
                        className={`rounded-xl p-3 transition hover:bg-white/10 hover:text-lime-300 cursor-pointer ${searchOpen ? 'text-lime-400 bg-white/5' : ''}`}
                    >
                        <Search size={19} />
                    </button>

                    {/* User Account / Auth Actions */}
                    {user ? (
                        <div
                            className="relative py-2"
                            onMouseEnter={() => {
                                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
                                setAccountOpen(true)
                            }}
                            onMouseLeave={() => {
                                hoverTimeoutRef.current = setTimeout(() => {
                                    setAccountOpen(false)
                                }, 200)
                            }}
                        >
                            <button
                                aria-label="Tài khoản"
                                onClick={() => setAccountOpen((open) => !open)}
                                className={`rounded-xl p-3 transition hover:bg-white/10 hover:text-lime-300 cursor-pointer ${accountOpen ? 'text-lime-400 bg-white/5' : ''
                                    }`}
                            >
                                <UserRound size={19} />
                            </button>

                            {/* Account Dropdown Menu */}
                            <AnimatePresence>
                                {accountOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-white/10 bg-[#131823] p-2 text-sm text-white shadow-2xl z-50 normal-case"
                                    >
                                        <div className="mb-1 flex items-center gap-3 rounded-xl bg-white/5 p-3">
                                            <span className="grid h-9 w-9 place-items-center rounded-full bg-lime-400 font-black text-slate-950">
                                                {displayName.slice(0, 1).toUpperCase()}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <b className="block text-sm font-bold text-white truncate">{displayName}</b>
                                                <span
                                                    className={`inline-flex items-center gap-1 text-[11px] font-bold font-mono ${user.role === 'admin' ? 'text-lime-400' : 'text-slate-400'
                                                        }`}
                                                >
                                                    {user.role === 'admin' && <ShieldCheck size={13} className="text-lime-400" />}
                                                    {user.role === 'admin' ? 'Quản Trị Viên' : 'Khách hàng'}
                                                </span>
                                            </div>
                                        </div>

                                        {user.role === 'admin' && (
                                            <Link
                                                onClick={() => setAccountOpen(false)}
                                                className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 px-3.5 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-lime-400/20 hover:brightness-110 transition my-1.5"
                                                to="/admin"
                                            >
                                                <ShieldCheck size={16} />
                                                <span>Trang Quản Trị Admin</span>
                                            </Link>
                                        )}

                                        <Link
                                            onClick={() => setAccountOpen(false)}
                                            className="block rounded-xl px-3 py-2.5 hover:bg-white/10 transition text-slate-200 hover:text-white"
                                            to="/profile"
                                        >
                                            Hồ sơ cá nhân
                                        </Link>
                                        <Link
                                            onClick={() => setAccountOpen(false)}
                                            className="block rounded-xl px-3 py-2.5 hover:bg-white/10 transition text-slate-200 hover:text-white"
                                            to="/orders"
                                        >
                                            Đơn hàng của tôi
                                        </Link>

                                        <div className="my-1 border-t border-white/10" />

                                        <button
                                            onClick={handleLogout}
                                            className="w-full rounded-xl px-3 py-2.5 text-left text-rose-400 hover:bg-white/10 transition font-medium cursor-pointer"
                                        >
                                            Đăng xuất
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 pl-2">
                            <Link
                                to="/login"
                                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-bold text-slate-200 hover:border-lime-400/50 hover:bg-white/10 hover:text-lime-400 transition cursor-pointer"
                            >Đăng nhập
                                <UserRound size={19} />
                            </Link>
                        </div>
                    )}

                    <motion.button
                        animate={cartPulse ? { scale: [1, 1.22, 0.92, 1] } : { scale: 1 }}
                        aria-label="Giỏ hàng"
                        onClick={() => setCartDrawerOpen(true)}
                        className="relative rounded-xl p-3 transition hover:bg-white/10 hover:text-lime-300 cursor-pointer"
                    >
                        <ShoppingBag size={19} />
                        {cartCount > 0 && (
                            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-lime-400 px-1 text-[9px] font-black text-slate-950">
                                {cartCount}
                            </span>
                        )}
                    </motion.button>
                </div>
            </div>

            {/* Search Drawer with Outside Backdrop */}
            <AnimatePresence>
                {searchOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 top-[73px] bg-black/60 backdrop-blur-sm z-40"
                            onClick={() => setSearchOpen(false)}
                        />
                        <motion.div
                            ref={searchContainerRef}
                            initial={{ opacity: 0, y: -15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            className="absolute left-0 right-0 top-full border-b border-white/10 bg-[#131823] px-5 py-5 shadow-2xl z-50"
                        >
                            <form
                                onSubmit={submit}
                                className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-emerald-400/30 bg-white/10 px-4 py-3"
                            >
                                <Search size={20} className="text-emerald-300" />
                                <input
                                    autoFocus
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Tìm giày, áo đấu, bóng, phụ kiện..."
                                    className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setSearchOpen(false)}
                                    className="cursor-pointer text-slate-400 hover:text-white"
                                >
                                    <X size={18} />
                                </button>
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </header>
    )
}
