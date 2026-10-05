import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Lock, Mail, Phone, ShieldAlert, User, KeyRound } from 'lucide-react'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'
import { register as registerApi } from '../../services/auth'
import { useApp } from '../../context/AppContext'
import { AuthLayout } from '../../layouts/AuthLayout'
import { getErrorMessage, isValidEmail, isValidVietnamesePhone } from '../../utils'

type RegisterMethod = 'email' | 'phone'

export function RegisterPage() {
  const [registerMethod, setRegisterMethod] = useState<RegisterMethod>('email')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { login } = useApp()
  const navigate = useNavigate()

  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 85,
      origin: { y: 0.6 },
      colors: ['#a3e635', '#10b981', '#38bdf8', '#fbbf24'],
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Vui lòng nhập họ và tên của bạn')
      return
    }

    if (registerMethod === 'email') {
      if (!isValidEmail(email)) {
        setError('Vui lòng nhập địa chỉ email hợp lệ')
        return
      }
    } else {
      if (!isValidVietnamesePhone(phone)) {
        setError('Vui lòng nhập số điện thoại hợp lệ (10 chữ số)')
        return
      }
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có tối thiểu 6 ký tự')
      return
    }

    if (passwordConfirmation && password !== passwordConfirmation) {
      setError('Mật khẩu xác nhận không khớp nhau')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (registerMethod === 'email') {
        const response = await registerApi(
          name.trim(),
          email.trim().toLowerCase(),
          password
        )

        if (response.requires_email_verification || response.email) {
          toast.success('Đăng ký thành công! Vui lòng kiểm tra mã OTP 6 số trong email.')
          navigate(`/verify-email?email=${encodeURIComponent(response.email || email.trim())}`)
          return
        }
        const userObj = response.user

        if (!userObj) {
          throw new Error('Không nhận được thông tin người dùng từ máy chủ.')
        }

        login(userObj, response.token)
        triggerConfetti()
        toast.success('🎉 Đăng ký tài khoản thành công!')
        navigate('/')
      } else {
        const response = await registerApi(name.trim(), phone.trim(), password)
        const userObj = response.user ?? {
          name: name.trim(),
          phone: phone.trim(),
          email: '',
          role: 'user' as const,
        }
        login(userObj, response.token ?? 'demo-token')
        triggerConfetti()
        toast.success('🎉 Đăng ký tài khoản Club thành công!')
        navigate('/')
      }
    } catch (err: any) {
      const errMsg = getErrorMessage(err, 'Đăng ký không thành công. Vui lòng thử lại!')
      setError(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Header & Logo */}
        <div className="space-y-2 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-black italic tracking-tighter text-white hover:opacity-90 transition">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400 text-slate-950 not-italic font-black text-lg shadow-md shadow-lime-400/30">
              S
            </span>
            STRIKER.
          </Link>

          <div className="flex items-center justify-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-[0.3em] text-lime-400">
            <User size={13} className="animate-pulse" /> JOIN THE SQUAD
          </div>

          <h2 className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase text-white leading-tight">
            TẠO TÀI KHOẢN <span className="text-lime-400">CLUB.</span>
          </h2>
        </div>

        {/* Register Method Switcher */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-900 border border-white/10">
          <button
            type="button"
            onClick={() => setRegisterMethod('email')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${registerMethod === 'email'
              ? 'bg-lime-400/20 text-lime-400 border border-lime-400/30 shadow-sm'
              : 'text-slate-400 hover:text-white'
              }`}
          >
            <Mail size={14} /> QUA EMAIL
          </button>
          <button
            type="button"
            onClick={() => setRegisterMethod('phone')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${registerMethod === 'phone'
              ? 'bg-lime-400/20 text-lime-400 border border-lime-400/30 shadow-sm'
              : 'text-slate-400 hover:text-white'
              }`}
          >
            <Phone size={14} /> QUA SĐT
          </button>
        </div>

        {/* Error alert */}
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
        <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Họ và tên <span className="text-rose-400">*</span>
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/90 px-3.5 py-2.5 transition focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400/30">
              <User size={16} className="text-slate-500 shrink-0" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Họ và tên"
                className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-600 [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_#0f172a_inset]"
              />
            </div>
          </div>

          {/* Email / Phone */}
          {registerMethod === 'email' ? (
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Email <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/90 px-3.5 py-2.5 transition focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400/30">
                <Mail size={16} className="text-slate-500 shrink-0" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-600 [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_#0f172a_inset]"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Số điện thoại <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/90 px-3.5 py-2.5 transition focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400/30">
                <Phone size={16} className="text-slate-500 shrink-0" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Số điện thoại"
                  className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-600 [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_#0f172a_inset]"
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Mật khẩu <span className="text-rose-400">*</span>
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/90 px-3.5 py-2.5 transition focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400/30">
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
                className="text-slate-500 hover:text-lime-400 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Xác nhận mật khẩu <span className="text-rose-400">*</span>
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/90 px-3.5 py-2.5 transition focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400/30">
              <KeyRound size={16} className="text-slate-500 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-600 [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_#0f172a_inset]"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-lime-400 py-3.5 text-xs sm:text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-lime-400/25 transition hover:bg-lime-300 hover:shadow-lime-400/40 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
            ) : (
              <span>Đăng ký</span>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="pt-2 text-center text-xs text-slate-400">
          Đã có tài khoản?{' '}
          <Link
            to="/login"
            className="font-black uppercase tracking-wider text-lime-400 hover:text-white transition-colors cursor-pointer"
          >
            ĐĂNG NHẬP
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}