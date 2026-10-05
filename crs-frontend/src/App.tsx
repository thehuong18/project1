import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppProvider, useApp } from './context/AppContext'
import { ShopLayout } from './layouts/ShopLayout'
import { AdminLayout } from './layouts/AdminLayout'

// Trang phía Khách hàng
import { Home } from './pages/shop/Home'
import { Shop } from './pages/shop/Shop'
import { ProductDetail } from './pages/shop/ProductDetail'
import { Checkout } from './pages/shop/Checkout'
import { Orders } from './pages/shop/Orders'
import { Profile } from './pages/shop/Profile'
import { VerifyEmail } from './pages/shop/VerifyEmail'
import { ForgotPassword } from './pages/shop/ForgotPassword'
import { LoginPage } from './pages/shop/LoginPage'
import { RegisterPage } from './pages/shop/RegisterPage'
import { ScrollToTop } from './components/ScrollToTop'
// Trang phía Quản trị
import {
    Dashboard,
    Products as AdminProducts,
    Orders as AdminOrders,
    Vouchers as AdminVouchers,
    Customers as AdminCustomers,
    Settings as AdminSettings,
    AdminFinance,
} from './pages/admin'


// ErrorBoundary chống crash ứng dụng
interface ErrorBoundaryProps {
    children?: ReactNode
}

interface ErrorBoundaryState {
    hasError: boolean
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    public state: ErrorBoundaryState = {
        hasError: false,
    }

    public static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true }
    }

    //error (chi tiết lỗi) và errorInfo (vị trí component xảy ra lỗi trong cây ứng dụng).
    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo)
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-red-500 mb-2">Đã xảy ra lỗi hệ thống!</h1>
                        <p className="text-slate-400 mb-4">Vui lòng tải lại trang hoặc thử lại sau.</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-lime-500 text-slate-950 font-semibold rounded-lg hover:bg-lime-400 transition"
                        >
                            Tải lại trang
                        </button>
                    </div>
                </div>
            )
        }
        return this.props.children
    }
}

// ProtectedRoute bảo vệ các trang yêu cầu đăng nhập
function ProtectedRoute({
    children,
    adminOnly = false,
}: {
    children: React.ReactNode
    adminOnly?: boolean
}) {
    const { user } = useApp()
    if (!user) {
        return <Navigate to="/" replace />
    }
    if (adminOnly && user.role !== 'admin') {
        return <Navigate to="/" replace />
    }
    return <>{children}</>
}

function AdminGuard({ children }: { children: React.ReactNode }) {
    return <ProtectedRoute adminOnly>{children}</ProtectedRoute>
}

function UserApp() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="*" element={<ShopRoutes />} />
        </Routes>
    )
}

function CartRedirect() {
    const { setCartDrawerOpen } = useApp()
    useEffect(() => {
        setCartDrawerOpen(true)
    }, [setCartDrawerOpen])
    return <Navigate to="/shop" replace />
}

function ShopRoutes() {
    return (
        <ShopLayout>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<CartRedirect />} />
                <Route
                    path="/checkout"
                    element={
                        <ProtectedRoute>
                            <Checkout />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/orders"
                    element={
                        <ProtectedRoute>
                            <Orders />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <Profile />
                        </ProtectedRoute>
                    }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </ShopLayout>
    )
}

function AdminApp() {
    return (
        <AdminGuard>
            <Routes>
                <Route element={<AdminLayout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/finance" element={<AdminFinance />} />
                    <Route path="/products" element={<AdminProducts />} />
                    <Route path="/orders" element={<AdminOrders />} />
                    <Route path="/vouchers" element={<AdminVouchers />} />
                    <Route path="/customers" element={<AdminCustomers />} />
                    <Route path="/settings" element={<AdminSettings />} />

                    {/* Legacy Route Aliases */}
                    <Route path="/categories" element={<Navigate to="/admin/products" replace />} />
                    <Route path="/coupons" element={<Navigate to="/admin/vouchers" replace />} />
                    <Route path="/users" element={<Navigate to="/admin/customers" replace />} />
                    <Route path="*" element={<Navigate to="/admin" replace />} />
                </Route>
            </Routes>
        </AdminGuard>
    )
}

function LegacyNavigationRepair() {
    const navigate = useNavigate()
    useEffect(() => {
        const onHashChange = () => {
            if (window.location.hash === '#forgot') navigate('/forgot-password')
        }
        window.addEventListener('hashchange', onHashChange)
        return () => window.removeEventListener('hashchange', onHashChange)
    }, [navigate])
    return null
}

export default function App() {
    return (
        <ErrorBoundary>
            <AppProvider>
                <BrowserRouter>
                    <ScrollToTop />
                    <LegacyNavigationRepair />
                    <Routes>
                        <Route path="/admin/*" element={<AdminApp />} />
                        <Route path="*" element={<UserApp />} />
                    </Routes>
                    <Toaster
                        position="top-right"
                        richColors
                        closeButton
                        theme="dark"
                        duration={3000}
                        toastOptions={{
                            style: {
                                background: 'rgba(15, 23, 42, 0.95)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#fff',
                                backdropFilter: 'blur(16px)',
                            },
                        }}
                    />
                </BrowserRouter>
            </AppProvider>
        </ErrorBoundary>
    )
}