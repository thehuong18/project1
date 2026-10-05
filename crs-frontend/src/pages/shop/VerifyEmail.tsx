import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, RotateCw, ShieldAlert, ArrowRight } from 'lucide-react'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'
import { AuthLayout } from '../../layouts/AuthLayout'
import { resendOtp, verifyEmail } from '../../services/auth'
import { useApp } from '../../context/AppContext'
import { getErrorMessage, isValidOTP } from '../../utils'
import { OtpInput } from '../../components/OtpInput'

export function VerifyEmail() {
  const [params] = useState(() => new URLSearchParams(window.location.search))
  const email = params.get('email') ?? ''
  
  const [otp, setOtp] = useState('')
  const [cooldown, setCooldown] = useState(60)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { login } = useApp()
  const navigate = useNavigate()

  // Bộ đếm ngược gửi lại OTP
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleVerify = async (codeToVerify?: string) => {
    const code = codeToVerify || otp
    if (!isValidOTP(code)) {
      setError('Vui lòng nhập đủ 6 chữ số mã OTP')
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await verifyEmail(email, code)
      if (response?.user && response?.token) {
        login(response.user, response.token)
      }
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.65 },
        colors: ['#84cc16', '#10b981', '#38bdf8', '#ffffff'],
      })
      toast.success('Xác minh tài khoản thành công! 🎉')
      navigate('/')
    } catch (err: any) {
      const errMsg = getErrorMessage(err, 'Mã OTP không đúng hoặc đã hết hạn sử dụng.')
      setError(errMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || !email || loading) return
    setError('')
    try {
      await resendOtp(email)
      setCooldown(60)
      setOtp('')
      toast.success('Mã OTP mới đã được gửi về email của bạn.')
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.'))
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-6 text-center">
        {/* Header & Logo */}
        <div className="space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-black italic tracking-tighter text-white hover:opacity-90 transition">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400 text-slate-950 not-italic font-black text-lg shadow-md shadow-lime-400/30">
              S
            </span>
            STRIKER.
          </Link>

          <div className="flex items-center justify-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-[0.3em] text-lime-400">
            <Mail size={13} className="animate-pulse" /> EMAIL VERIFICATION
          </div>

          <h2 className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase text-white leading-tight">
            XÁC MINH <span className="text-lime-400">TÀI KHOẢN.</span>
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            Nhập mã OTP 6 chữ số đã được gửi tới
            <br />
            <b className="text-lime-400 font-mono text-xs">{email || 'email của bạn'}</b>
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/20 p-3 text-xs font-semibold text-rose-300"
          >
            <ShieldAlert size={16} className="shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Component Nhập OTP 6 số dùng chung */}
        <div className="py-1">
          <OtpInput
            value={otp}
            onChange={(val) => {
              setOtp(val)
              setError('')
            }}
            onComplete={(val) => handleVerify(val)}
            disabled={loading}
            hasError={Boolean(error)}
          />
        </div>

        {/* Submit Button */}
        <button
          type="button"
          disabled={loading || otp.length !== 6}
          onClick={() => handleVerify()}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-lime-400 py-3.5 text-xs sm:text-sm font-black uppercase tracking-wider text-slate-950 transition hover:bg-lime-300 shadow-lg shadow-lime-400/25 disabled:opacity-40 cursor-pointer active:scale-[0.99]"
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
          ) : (
            <>
              <span>XÁC MINH NGAY</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>

        {/* Resend Cooldown */}
        <div className="text-xs text-slate-400">
          {cooldown > 0 ? (
            <span>
              Gửi lại mã sau <b className="text-lime-400 font-mono">{cooldown}s</b>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              className="inline-flex items-center gap-1.5 font-bold text-lime-400 hover:underline cursor-pointer transition"
            >
              <RotateCw size={13} /> Gửi lại mã OTP
            </button>
          )}
        </div>

        <div className="border-t border-white/10 pt-4">
          <Link to="/login" className="text-xs font-semibold text-slate-400 hover:text-white transition">
            ← Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}