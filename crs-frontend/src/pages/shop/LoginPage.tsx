import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Lock, User, ShieldAlert, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { login as loginApi } from '../../services/auth'
import { useApp } from '../../context/AppContext'
import { AuthLayout } from '../../layouts/AuthLayout'
import { getErrorMessage } from '../../utils/errorHandler'

export function LoginPage() {
  const location = useLocation()
  const [identifier, setIdentifier] = useState(location.state?.prefilledEmail || location.state?.email || '')
  const [password, setPassword] = useState(location.state?.prefilledPassword || '')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { login } = useApp()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier.trim()) {
      setError('Vui lòng nhập Email hoặc Số điện thoại')
      return
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await loginApi(identifier.trim(), password)
      const userObj = response.user

      if (!userObj) {
        throw new Error('Không nhận được thông tin người dùng từ máy chủ.')
      }
      login(userObj, response.token)
      toast.success(`Đăng nhập thành công🎉, chào mừng ${userObj.name}!`)
      navigate(userObj.role === 'admin' ? '/admin' : String(location.state?.from ?? '/'))
    } catch (err: any) {
      const resData = err?.response?.data

      if (resData?.requires_email_verification || err?.response?.status === 403) {
        const targetEmail = resData?.email || (identifier.includes('@') ? identifier : '')
        if (targetEmail) {
          toast.warning('Tài khoản chưa được kích hoạt. Đang chuyển tới trang xác minh...')
          navigate(`/verify-email?email=${encodeURIComponent(targetEmail)}`)
          return
        }
      }

      const errMsg = getErrorMessage(err, 'Thông tin đăng nhập hoặc mật khẩu không chính xác.')
      setError(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-7">
        {/* Header & Logo */}
        <div className="space-y-3 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-black italic tracking-tighter text-white hover:opacity-90 transition">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400 text-slate-950 not-italic font-black text-lg shadow-md shadow-lime-400/30">
              S
            </span>
            STRIKER.
          </Link>

          <div className="flex items-center justify-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-[0.3em] text-lime-400">
            <Zap size={13} className="animate-pulse fill-lime-400" /> STRIKER EXCLUSIVE
          </div>

          <h2 className="text-3xl sm:text-4xl font-black italic tracking-tighter uppercase text-white leading-tight">
            TRỞ LẠI <span className="text-lime-400">ĐƯỜNG PITCH.</span>
          </h2>
        </div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/20 p-3 text-xs font-semibold text-rose-300"
          >
            <ShieldAlert size={16} className="shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Email / Số điện thoại
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/90 px-3.5 py-3 transition focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400/30">
              <User size={16} className="text-slate-500 shrink-0" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email hoặc số điện thoại"
                className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-600 [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_#0f172a_inset]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Mật khẩu
              </label>
              <Link
                to="/forgot-password"
                className="text-[11px] font-bold text-lime-400 hover:underline transition-colors"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/90 px-3.5 py-3 transition focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400/30">
              <Lock size={16} className="text-slate-500 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-600 [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_#0f172a_inset]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-500 hover:text-lime-400 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-lime-400 py-3.5 text-xs sm:text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-lime-400/25 transition hover:bg-lime-300 hover:shadow-lime-400/40 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
            ) : (
              <span>ĐĂNG NHẬP</span>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="pt-2 text-center text-xs text-slate-400">
          Chưa có tài khoản?{' '}
          <Link
            to="/register"
            className="font-black uppercase tracking-wider text-white hover:text-lime-400 transition-colors underline-offset-4 hover:underline"
          >
            ĐĂNG KÝ
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}