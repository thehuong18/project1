import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
  ArrowRight,
  RotateCw,
  Copy,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useApp } from '../../context/AppContext'
import { updateProfile, verifyEmail, resendOtp } from '../../services/auth'
import { getErrorMessage } from '../../utils/errorHandler'
import { isValidEmail, isValidVietnamesePhone, isValidOTP } from '../../utils/validation'
import { OtpInput } from '../../components/OtpInput'

export function Profile() {
  const { user, updateUserProfile } = useApp()

  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info')

  // Personal Info Form
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [emailInput, setEmailInput] = useState(user?.email ?? '')
  const [savingInfo, setSavingInfo] = useState(false)
  const [copiedId, setCopiedId] = useState(false)

  // OTP Verification Box for linking email
  const [showOtpBox, setShowOtpBox] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [resendingOtp, setResendingOtp] = useState(false)
  const [otpCountdown, setOtpCountdown] = useState(0)

  // Password Change Form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // Sync state when user loads or updates
  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setPhone(user.phone || '')
      setEmailInput(user.email || '')
    }
  }, [user])

  // OTP Countdown timer
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown((c) => c - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [otpCountdown])

  const hasLinkedEmail = Boolean(user?.email && user.email.trim().length > 0)

  const handleCopyId = () => {
    const idText = `STRIKER-${user?.id ?? '001'}`
    navigator.clipboard.writeText(idText)
    setCopiedId(true)
    toast.success('Đã sao chép mã thành viên!')
    setTimeout(() => setCopiedId(false), 2000)
  }

  // Lưu thông tin cá nhân / Liên kết email
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Họ và tên không được để trống!')
      return
    }

    if (phone.trim() && !isValidVietnamesePhone(phone.trim())) {
      toast.error('Số điện thoại không đúng định dạng (cần 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09)!')
      return
    }

    // Nếu tài khoản chưa có email và người dùng có nhập email mới
    const wantsToLinkEmail = !hasLinkedEmail && emailInput.trim().length > 0
    if (wantsToLinkEmail && !isValidEmail(emailInput.trim())) {
      toast.error('Địa chỉ email không đúng định dạng hợp lệ!')
      return
    }

    setSavingInfo(true)
    try {
      const payload: Record<string, any> = {
        name: name.trim(),
        phone: phone.trim(),
        phone_number: phone.trim(),
      }

      if (wantsToLinkEmail) {
        payload.email = emailInput.trim().toLowerCase()
      }

      const res: any = await updateProfile(payload)

      // Cập nhật thông tin user trong local app context
      if (res?.user || res?.data) {
        updateUserProfile(res.user || res.data)
      } else if (res) {
        updateUserProfile(res)
      }

      if (res?.requires_email_verification || wantsToLinkEmail) {
        setShowOtpBox(true)
        setOtpCountdown(60)
        setOtpCode('')
        toast.info('Mã xác thực OTP đã được gửi!', {
          description: `Vui lòng kiểm tra hộp thư ${emailInput.trim()} để nhập mã xác minh.`,
        })
      } else {
        toast.success('Cập nhật thông tin thành công!')
      }
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Không thể cập nhật thông tin cá nhân.'))
    } finally {
      setSavingInfo(false)
    }
  }

  // Xác minh mã OTP cho Email
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const cleanOtp = (codeToVerify || otpCode).trim()
    if (!isValidOTP(cleanOtp)) {
      toast.error('Vui lòng nhập đủ 6 chữ số mã OTP!')
      return
    }

    setVerifyingOtp(true)
    try {
      const res: any = await verifyEmail(emailInput.trim().toLowerCase(), cleanOtp)
      if (res?.user || res?.data) {
        updateUserProfile(res.user || res.data)
      } else {
        updateUserProfile({ email: emailInput.trim().toLowerCase() })
      }
      setShowOtpBox(false)
      setOtpCode('')
      toast.success('Xác minh và liên kết email thành công! 🎉', {
        description: 'Tài khoản của bạn đã được kích hoạt email đầy đủ tính năng.',
      })
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Mã OTP không chính xác hoặc đã hết hạn.'))
    } finally {
      setVerifyingOtp(false)
    }
  }

  // Gửi lại mã OTP
  const handleResendOtp = async () => {
    if (otpCountdown > 0 || resendingOtp) return
    setResendingOtp(true)
    try {
      await resendOtp(emailInput.trim().toLowerCase())
      setOtpCountdown(60)
      setOtpCode('')
      toast.success('Đã gửi lại mã OTP mới về email của bạn!')
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Không thể gửi lại mã OTP. Vui lòng thử lại.'))
    } finally {
      setResendingOtp(false)
    }
  }

  // Đổi mật khẩu
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại!')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự!')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Xác nhận mật khẩu mới không trùng khớp!')
      return
    }
    if (currentPassword === newPassword) {
      toast.error('Mật khẩu mới không được trùng với mật khẩu hiện tại!')
      return
    }

    setSavingPassword(true)
    try {
      await updateProfile({
        current_password: currentPassword,
        password: newPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Đổi mật khẩu thành công! 🔐', {
        description: 'Mật khẩu tài khoản của bạn đã được cập nhật an toàn.',
      })
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.'))
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <section className="min-h-screen bg-[#0B0E17] px-4 pt-24 sm:pt-28 pb-28 text-white sm:px-6 lg:px-8 selection:bg-lime-400 selection:text-slate-950">
      <div className="mx-auto max-w-2xl space-y-7">
        {/* User Profile Card Header */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#161C2B] to-[#101420] p-6 sm:p-7 shadow-2xl backdrop-blur-xl">
          <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-lime-400/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 h-52 w-52 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="grid h-20 w-20 sm:h-22 sm:w-22 place-items-center rounded-2xl bg-gradient-to-tr from-lime-400 to-emerald-400 font-mono text-3xl font-black text-slate-950 shadow-xl shadow-lime-400/20 ring-4 ring-white/5">
                {user?.name ? user.name.slice(0, 1).toUpperCase() : 'U'}
              </div>
              <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-lg bg-lime-400 text-slate-950 font-bold text-xs border-2 border-slate-950 shadow-md">
                ✓
              </span>
            </div>

            {/* Profile Info */}
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white truncate">
                  {user?.name || 'Thành viên Striker'}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-lime-400/10 border border-lime-400/30 px-2.5 py-0.5 text-[11px] font-bold text-lime-400">
                  <ShieldCheck size={12} />
                  {user?.role === 'admin' ? 'Quản trị viên' : 'Striker Club'}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Mail size={13} className="text-lime-400 shrink-0" />
                  <span className="truncate">{user?.email || 'Chưa liên kết email'}</span>
                </span>
                {user?.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone size={13} className="text-lime-400 shrink-0" />
                    <span>{user.phone}</span>
                  </span>
                )}
              </div>

              <div className="pt-1 flex items-center justify-center sm:justify-start gap-2">
                <span className="text-xs font-mono text-slate-500">
                  Mã tài khoản:{' '}
                  <span className="text-slate-300 font-bold tracking-wider">
                    STRIKER-{(user?.id ?? '001')}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-lime-400 transition cursor-pointer px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10"
                  title="Sao chép mã tài khoản"
                >
                  {copiedId ? <CheckCircle2 size={12} className="text-lime-400" /> : <Copy size={12} />}
                  <span>{copiedId ? 'Đã chép' : 'Chép'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation (Pills) */}
        <div className="flex rounded-2xl bg-[#131823] p-1.5 border border-white/10 shadow-lg">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'info'
                ? 'bg-lime-400 text-slate-950 shadow-md shadow-lime-400/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <UserIcon size={16} />
            <span>Hồ sơ cá nhân</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'password'
                ? 'bg-lime-400 text-slate-950 shadow-md shadow-lime-400/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <KeyRound size={16} />
            <span>Đổi mật khẩu</span>
          </button>
        </div>

        {/* Tab 1: Thông tin cá nhân */}
        {activeTab === 'info' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/10 bg-[#131823]/95 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6"
          >
            <div className="border-b border-white/10 pb-4">
              <h2 className="text-lg font-black text-white">Hồ sơ cá nhân</h2>
              <p className="text-xs text-slate-400">
                Cập nhật họ tên, số điện thoại liên hệ và địa chỉ email nhận thông báo đơn hàng
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Họ và tên */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Họ và tên <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0B0E17] px-4 py-3.5 transition focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400/30">
                  <UserIcon size={17} className="text-slate-500 shrink-0" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-600 [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_#0B0E17_inset]"
                  />
                </div>
              </div>

              {/* Email (Phân biệt trường hợp đã có vs chưa có email) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">
                    Địa chỉ Email {hasLinkedEmail ? '(Đã liên kết)' : '(Chưa liên kết)'}
                  </label>
                  {hasLinkedEmail ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      <ShieldCheck size={11} /> Đã xác thực OTP
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                      <AlertCircle size={11} /> Chưa liên kết
                    </span>
                  )}
                </div>

                <div
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition ${
                    hasLinkedEmail
                      ? 'border-white/5 bg-slate-900/50 cursor-not-allowed select-none'
                      : 'border-white/10 bg-[#0B0E17] focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400/30'
                  }`}
                >
                  <Mail size={17} className="text-slate-500 shrink-0" />
                  <input
                    type="email"
                    value={emailInput}
                    readOnly={hasLinkedEmail}
                    disabled={hasLinkedEmail}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Nhập email (ví dụ: name@example.com) để liên kết"
                    className={`w-full bg-transparent text-xs outline-none [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_#0B0E17_inset] ${
                      hasLinkedEmail ? 'text-slate-400 cursor-not-allowed' : 'text-white placeholder:text-slate-600'
                    }`}
                  />
                  {hasLinkedEmail && <Lock size={15} className="text-slate-500 shrink-0" />}
                </div>

                {hasLinkedEmail ? (
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
                    <Lock size={12} className="shrink-0 text-slate-400" />
                    Email là tài khoản đăng nhập cố định đã xác minh, không thể thay đổi trực tiếp.
                  </p>
                ) : (
                  <div className="rounded-2xl border border-lime-400/20 bg-lime-400/[0.06] p-3.5 mt-2 flex items-start gap-2.5">
                    <Sparkles size={16} className="text-lime-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 text-xs">
                      <p className="font-bold text-lime-300">Tài khoản đăng ký bằng Số điện thoại</p>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Nhập địa chỉ Email cá nhân và bấm <strong>&quot;Lưu thay đổi&quot;</strong> để nhận mã OTP xác thực và kích hoạt đầy đủ tính năng.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Số điện thoại */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Số điện thoại di động
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0B0E17] px-4 py-3.5 transition focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400/30">
                  <Phone size={17} className="text-slate-500 shrink-0" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ví dụ: 0909999999"
                    className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-600 [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_#0B0E17_inset]"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Dùng để shipper liên hệ giao hàng và nhận thông báo đơn hàng
                </p>
              </div>

              {/* Nút lưu thay đổi */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingInfo}
                  className="flex items-center gap-2 rounded-2xl bg-lime-400 px-7 py-3.5 text-xs font-black uppercase tracking-wider text-slate-950 hover:bg-lime-300 transition shadow-lg shadow-lime-400/20 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
                >
                  {savingInfo ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                  ) : (
                    <>
                      <Save size={16} /> Lưu thay đổi
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Modal / Khung Nhập Mã OTP Xác Minh Email (Nếu đang chờ verify) */}
            <AnimatePresence>
              {showOtpBox && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-2xl border border-lime-400/30 bg-lime-400/[0.05] p-5 sm:p-6 space-y-4"
                >
                  <div className="text-center space-y-1">
                    <div className="inline-flex items-center gap-2 text-lime-400 font-black text-sm">
                      <ShieldCheck size={18} />
                      <span>Nhập mã OTP xác thực Email</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Mã OTP gồm 6 chữ số đã được gửi tới{' '}
                      <strong className="text-white font-mono">{emailInput}</strong>
                    </p>
                  </div>

                  <div className="space-y-3">
                    <OtpInput
                      value={otpCode}
                      onChange={(val) => setOtpCode(val)}
                      onComplete={(val) => handleVerifyOtp(val)}
                      disabled={verifyingOtp}
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={otpCountdown > 0 || resendingOtp}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-lime-300 disabled:text-slate-600 cursor-pointer disabled:cursor-not-allowed transition"
                      >
                        <RotateCw size={13} className={resendingOtp ? 'animate-spin' : ''} />
                        <span>
                          {otpCountdown > 0
                            ? `Gửi lại mã sau (${otpCountdown}s)`
                            : 'Gửi lại mã OTP'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleVerifyOtp()}
                        disabled={verifyingOtp || otpCode.trim().length !== 6}
                        className="inline-flex items-center gap-2 rounded-xl bg-lime-400 px-5 py-2.5 text-xs font-black uppercase text-slate-950 hover:bg-lime-300 transition shadow-md shadow-lime-400/20 disabled:opacity-40 cursor-pointer"
                      >
                        {verifyingOtp ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                        ) : (
                          <>
                            <span>Xác nhận OTP</span>
                            <ArrowRight size={14} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Tab 2: Đổi mật khẩu */}
        {activeTab === 'password' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/10 bg-[#131823]/95 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6"
          >
            <div className="border-b border-white/10 pb-4">
              <h2 className="text-lg font-black text-white">Đổi mật khẩu tài khoản</h2>
              <p className="text-xs text-slate-400">
                Để bảo vệ an toàn cho tài khoản, vui lòng sử dụng mật khẩu mạnh tối thiểu 6 ký tự
              </p>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Mật khẩu hiện tại <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0B0E17] px-4 py-3.5 transition focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400/30">
                  <Lock size={17} className="text-slate-500 shrink-0" />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại"
                    className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-600 [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_#0B0E17_inset]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="text-slate-500 hover:text-slate-300 transition cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Mật khẩu mới <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0B0E17] px-4 py-3.5 transition focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400/30">
                  <KeyRound size={17} className="text-slate-500 shrink-0" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-600 [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_#0B0E17_inset]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="text-slate-500 hover:text-slate-300 transition cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Xác nhận mật khẩu mới <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0B0E17] px-4 py-3.5 transition focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400/30">
                  <ShieldCheck size={17} className="text-slate-500 shrink-0" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-600 [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_#0B0E17_inset]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-slate-500 hover:text-slate-300 transition cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex items-center gap-2 rounded-2xl bg-lime-400 px-7 py-3.5 text-xs font-black uppercase tracking-wider text-slate-950 hover:bg-lime-300 transition shadow-lg shadow-lime-400/20 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
                >
                  {savingPassword ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                  ) : (
                    <>
                      <Check size={16} /> Cập nhật mật khẩu
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </section>
  )
}
