import { useState, useEffect } from 'react'
import { 
  Mail, 
  ArrowLeft, 
  ShieldAlert, 
  CheckCircle2, 
  KeyRound, 
  Copy, 
  Check, 
  ArrowRight, 
  RotateCw,
  Sparkles
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { sendResetOtp, verifyResetOtp } from '../../services/auth'
import { toast } from 'sonner'
import { AuthLayout } from '../../layouts/AuthLayout'
import { getErrorMessage, isValidEmail, isValidOTP } from '../../utils'
import { OtpInput } from '../../components/OtpInput'

export function ForgotPassword() {
  const navigate = useNavigate()

  // State quản lý các bước: 'email' | 'otp' | 'success'
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email')
  
  // Dữ liệu form
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [temporaryPassword, setTemporaryPassword] = useState('')
  
  // Trạng thái xử lý
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [cooldown, setCooldown] = useState(60)

  // Countdown timer cho gửi lại mã OTP (60 giây)
  useEffect(() => {
    if (step === 'otp' && cooldown > 0) {
      const timer = setInterval(() => setCooldown((c) => c - 1), 1000)
      return () => clearInterval(timer)
    }
  }, [step, cooldown])

  // 1. Gửi mã OTP về Email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidEmail(email.trim())) {
      setError('Vui lòng nhập địa chỉ Email hợp lệ')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await sendResetOtp(email.trim())
      toast.success(res?.message || 'Mã xác thực OTP đã được gửi đến email của bạn!')
      setStep('otp')
      setCooldown(60)
      setOtp('')
    } catch (err: any) {
      const msg = getErrorMessage(err, 'Không thể gửi yêu cầu mã OTP. Vui lòng thử lại sau.')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // 2. Gửi lại mã OTP
  const handleResendOtp = async () => {
    if (cooldown > 0 || loading || !email.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await sendResetOtp(email.trim())
      toast.success(res?.message || 'Đã gửi lại mã OTP mới!')
      setCooldown(60)
      setOtp('')
    } catch (err: any) {
      const msg = getErrorMessage(err, 'Gửi lại mã thất bại. Vui lòng thử lại sau.')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // 3. Xác thực mã OTP & Nhận mật khẩu mới
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = (codeToVerify || otp).trim()
    if (!isValidOTP(code)) {
      setError('Vui lòng nhập đủ 6 chữ số mã OTP')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await verifyResetOtp(email.trim(), code)
      const tempPass = res?.data?.temporary_password
      if (tempPass) {
        setTemporaryPassword(tempPass)
      }
      setStep('success')
      toast.success('Xác minh thành công! Mật khẩu mới đã được khởi tạo.')
    } catch (err: any) {
      const msg = getErrorMessage(err, 'Mã OTP không chính xác hoặc đã hết hạn.')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // 4. Sao chép mật khẩu vào Clipboard
  const handleCopyPassword = () => {
    if (!temporaryPassword) return
    navigator.clipboard.writeText(temporaryPassword)
    setCopied(true)
    toast.success('Đã sao chép mật khẩu vào bộ nhớ tạm!')
    setTimeout(() => setCopied(false), 2500)
  }

  // 5. Chuyển sang trang Đăng nhập kèm điền sẵn thông tin
  const handleGoToLogin = () => {
    navigate('/login', {
      state: {
        prefilledEmail: email.trim(),
        prefilledPassword: temporaryPassword,
      },
    })
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        {/* Logo & Header */}
        <div className="space-y-2 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-black italic tracking-tighter text-white hover:opacity-90 transition">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400 text-slate-950 not-italic font-black text-lg shadow-md shadow-lime-400/30">
              S
            </span>
            STRIKER.
          </Link>

          <div className="flex items-center justify-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-[0.3em] text-lime-400">
            <KeyRound size={13} className="animate-pulse" /> PASSWORD RECOVERY
          </div>

          <h2 className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase text-white leading-tight">
            KHÔI PHỤC <span className="text-lime-400">MẬT KHẨU.</span>
          </h2>

          {/* Stepper Indicator */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <span className={`h-1.5 rounded-full transition-all duration-300 ${step === 'email' ? 'w-8 bg-lime-400' : 'w-3 bg-white/20'}`} />
            <span className={`h-1.5 rounded-full transition-all duration-300 ${step === 'otp' ? 'w-8 bg-lime-400' : 'w-3 bg-white/20'}`} />
            <span className={`h-1.5 rounded-full transition-all duration-300 ${step === 'success' ? 'w-8 bg-lime-400' : 'w-3 bg-white/20'}`} />
          </div>
        </div>

        {/* Error Alert */}
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

        {/* Form Content Steps */}
        <AnimatePresence mode="wait">
          {step === 'email' && (
            <motion.form
              key="step-email"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleSendOtp}
              className="space-y-4"
            >
              <p className="text-xs text-slate-400 text-center leading-relaxed">
                Nhập địa chỉ Email liên kết với tài khoản của bạn để nhận mã xác thực OTP 6 số.
              </p>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Địa chỉ Email <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/90 px-3.5 py-3 transition focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400/30">
                  <Mail size={16} className="text-slate-500 shrink-0" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="customer@striker.vn"
                    className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-600 [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_#0f172a_inset]"
                  />
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
                  <>
                    <span>GỬI MÃ XÁC THỰC OTP</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </motion.form>
          )}

          {step === 'otp' && (
            <motion.div
              key="step-otp"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-center space-y-1">
                <p className="text-xs text-slate-300">
                  Mã xác thực OTP đã được gửi tới:
                </p>
                <b className="text-xs font-mono text-lime-400 block">{email}</b>
              </div>

              <div className="space-y-1 text-center">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Nhập mã OTP (6 chữ số) <span className="text-rose-400">*</span>
                </label>
                <OtpInput
                  value={otp}
                  onChange={(val) => {
                    setOtp(val)
                    setError('')
                  }}
                  onComplete={(val) => handleVerifyOtp(val)}
                  disabled={loading}
                  hasError={Boolean(error)}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email')
                    setError('')
                  }}
                  className="hover:text-white transition cursor-pointer"
                >
                  ← Đổi email khác
                </button>

                {cooldown > 0 ? (
                  <span className="text-slate-400">
                    Gửi lại sau <b className="text-lime-400 font-mono">{cooldown}s</b>
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleResendOtp}
                    className="inline-flex items-center gap-1 font-bold text-lime-400 hover:underline cursor-pointer"
                  >
                    <RotateCw size={12} className={loading ? 'animate-spin' : ''} />
                    <span>Gửi lại mã OTP</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                disabled={loading || otp.length !== 6}
                onClick={() => handleVerifyOtp()}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-lime-400 py-3.5 text-xs sm:text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-lime-400/25 transition hover:bg-lime-300 hover:shadow-lime-400/40 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                ) : (
                  <>
                    <span>XÁC MINH & CẤP MẬT KHẨU MỚI</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="step-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5 text-center"
            >
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-tr from-lime-400 to-emerald-400 text-slate-950 shadow-lg shadow-lime-400/30">
                <CheckCircle2 size={32} />
              </div>

              <div className="space-y-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-lime-400 bg-lime-400/10 border border-lime-400/30 px-2.5 py-0.5 rounded-full">
                  <Sparkles size={11} /> CẤP LẠI MẬT KHẨU THÀNH CÔNG
                </span>
                <h3 className="text-base font-bold text-white">Mật Khẩu Tạm Thời Của Bạn</h3>
                <p className="text-xs text-slate-400">
                  Mật khẩu mới đã được cập nhật cho tài khoản <b>{email}</b>.
                </p>
              </div>

              {/* Password Box with One-Click Copy */}
              <div className="relative overflow-hidden rounded-2xl border border-lime-400/50 bg-gradient-to-b from-lime-400/10 to-slate-900/90 p-4 shadow-xl shadow-lime-400/10">
                <div className="text-[10px] uppercase font-mono tracking-widest text-slate-400 mb-1">
                  Mật khẩu đăng nhập mới:
                </div>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono text-xl sm:text-2xl font-black text-lime-300 tracking-wider">
                    {temporaryPassword}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="p-2 rounded-xl bg-lime-400 text-slate-950 hover:bg-lime-300 active:scale-95 transition shadow-md shadow-lime-400/30 cursor-pointer"
                    title="Sao chép mật khẩu"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed bg-white/5 border border-white/10 rounded-xl p-3 text-left">
                🔒 <b>Lưu ý:</b> Mật khẩu này cũng đã được gửi về email của bạn. Bạn có thể sử dụng mật khẩu này để đăng nhập ngay mà không cần xác thực thêm.
              </p>

              <button
                type="button"
                onClick={handleGoToLogin}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-lime-400 py-3.5 text-xs sm:text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-lime-400/25 transition hover:bg-lime-300 hover:shadow-lime-400/40 active:scale-[0.99] cursor-pointer"
              >
                <span>ĐĂNG NHẬP NGAY</span>
                <ArrowRight size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Back Link */}
        {step !== 'success' && (
          <div className="pt-2 text-center text-xs text-slate-400">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 font-bold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} /> Quay lại đăng nhập
            </Link>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}