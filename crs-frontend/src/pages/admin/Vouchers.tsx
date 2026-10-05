import React, { useState, useEffect, useMemo } from 'react';
import { 
  TicketPercent, 
  Plus, 
  Search, 
  Copy, 
  Check, 
  Edit3, 
  Trash2, 
  X, 
  Clock, 
  RefreshCw,
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchCoupons, createCoupon, updateCoupon, deleteCoupon } from '../../services/coupons';
import type { Coupon, CouponType } from '../../types';

export const normalizeCoupon = (raw: any): Coupon => ({
  id: String(raw.id ?? raw.code),
  code: String(raw.code ?? ''),
  title: String(raw.title ?? raw.code ?? ''),
  description: String(raw.description ?? ''),
  discountType: raw.discountType ?? (raw.type === 'freeship' ? 'freeship' : raw.type === 'percent' ? 'percent' : 'fixed'),
  discountValue: Number(raw.discountValue ?? raw.value ?? 0),
  minOrderValue: Number(raw.minOrderValue ?? raw.min_order_amount ?? 0),
  maxDiscount: raw.maxDiscount != null ? Number(raw.maxDiscount) : raw.max_discount_amount != null ? Number(raw.max_discount_amount) : undefined,
  totalUsageLimit: Number(raw.totalUsageLimit ?? raw.usage_limit ?? 100),
  usageCount: Number(raw.usageCount ?? raw.used_count ?? 0),
  expiresAt: String(raw.expiresAt ?? raw.expires_at ?? ''),
  isActive: Boolean(raw.isActive ?? raw.is_active ?? true),
});

export const Vouchers: React.FC = () => {
  const [couponsList, setCouponsList] = useState<Coupon[]>(() => {
    const stored = localStorage.getItem('crs_admin_vouchers');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.map(normalizeCoupon);
        }
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    fetchCoupons()
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data ?? [];
        if (list.length > 0) {
          setCouponsList(list.map(normalizeCoupon));
        }
      })
      .catch(() => {});
  }, []);

  const [statusTab, setStatusTab] = useState<'ACTIVE' | 'ENDED'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Form Fields (Empty defaults)
  const [formCode, setFormCode] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<CouponType>('fixed');
  const [formValue, setFormValue] = useState('');
  const [formMinOrder, setFormMinOrder] = useState('');
  const [formMaxDiscount, setFormMaxDiscount] = useState('');
  const [formUsageLimit, setFormUsageLimit] = useState('');
  const [formExpiresAt, setFormExpiresAt] = useState('');

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('crs_admin_vouchers', JSON.stringify(couponsList));
  }, [couponsList]);

  // Today ISO Date for min date restriction
  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Format date helper: YYYY-MM-DD / ISO -> DD/MM/YYYY
  const formatDisplayDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    try {
      if (dateStr.includes('T') || (dateStr.includes('-') && dateStr.split('-')[0].length === 4)) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('vi-VN');
        }
      }
      if (dateStr.includes('/')) {
        return dateStr;
      }
    } catch {
      return String(dateStr);
    }
    return String(dateStr);
  };

  // Parse date helper: DD/MM/YYYY / ISO -> YYYY-MM-DD
  const parseToInputDate = (dateStr?: string): string => {
    if (!dateStr) return todayDateStr;
    try {
      if (dateStr.includes('/')) {
        const [d, m, y] = dateStr.split('/');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      if (dateStr.includes('T')) {
        return dateStr.split('T')[0];
      }
    } catch {
      return todayDateStr;
    }
    return dateStr;
  };

  // Check if a voucher is expired
  const checkIsExpired = (expiryStr?: string): boolean => {
    if (!expiryStr) return false;
    try {
      let date: Date;
      if (expiryStr.includes('/')) {
        const [d, m, y] = expiryStr.split('/');
        date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), 23, 59, 59);
      } else {
        date = new Date(expiryStr);
      }
      if (isNaN(date.getTime())) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date < today;
    } catch {
      return false;
    }
  };

  // Prevent invalid characters in number inputs
  const blockInvalidNumberKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-', '.'].includes(e.key)) {
      e.preventDefault();
    }
  };

  // Copy Code
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Đã sao chép mã Voucher: ${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Generate Cyber Random Code
  const generateRandomCode = () => {
    const prefixes = ['STR', 'CYBER', 'SPEED', 'GOAL', 'PRO', 'ELITE'];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setFormCode(`${randomPrefix}${randomSuffix}`);
  };

  // Handle Type Change
  const handleTypeChange = (nextType: CouponType) => {
    setFormType(nextType);
    if (nextType === 'freeship') {
      setFormValue('0');
    } else if (nextType === 'fixed') {
      if (formValue === '0') {
        setFormValue('');
      }
    }
  };

  // Open Modal for Add (Reset state to completely blank values)
  const handleOpenAdd = () => {
    setEditingCoupon(null);
    setFormCode('');
    setFormTitle('');
    setFormDescription('');
    setFormType('fixed');
    setFormValue('');
    setFormMinOrder('');
    setFormMaxDiscount('');
    setFormUsageLimit('');

    // Default: 30 days from today
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    setFormExpiresAt(futureDate.toISOString().split('T')[0]);
    setModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (c: Coupon) => {
    setEditingCoupon(c);
    setFormCode(c.code);
    setFormTitle(c.title);
    setFormDescription(c.description || '');
    setFormType(c.discountType === 'percent' ? 'fixed' : c.discountType);
    setFormValue(c.discountType === 'freeship' ? '0' : String(c.discountValue));
    setFormMinOrder(c.minOrderValue ? String(c.minOrderValue) : '');
    setFormMaxDiscount(c.maxDiscount ? String(c.maxDiscount) : '');
    setFormUsageLimit(c.totalUsageLimit ? String(c.totalUsageLimit) : '');
    setFormExpiresAt(parseToInputDate(c.expiresAt));
    setModalOpen(true);
  };

  // Save Voucher
  const handleSaveVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = formCode.trim().toUpperCase();
    if (!cleanCode) {
      toast.error('Vui lòng nhập mã Voucher!');
      return;
    }
    if (!formTitle.trim()) {
      toast.error('Vui lòng nhập tiêu đề hiển thị!');
      return;
    }

    // 1. Chặn trùng mã code
    const isDuplicate = couponsList.some(
      (c) =>
        !c.is_deleted &&
        !c.isDeleted &&
        c.code.toUpperCase() === cleanCode &&
        (!editingCoupon || c.id !== editingCoupon.id)
    );

    if (isDuplicate) {
      toast.error('Mã voucher này đã tồn tại, vui lòng chọn mã khác!');
      return;
    }

    // 2. Validate Hạn sử dụng (Không cho chọn ngày quá khứ)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(formExpiresAt);
    if (!formExpiresAt || selectedDate < today) {
      toast.error('Hạn sử dụng không được nằm trong quá khứ!');
      return;
    }

    // 3. Validate Giá trị giảm theo Loại giảm
    let valueNum = parseInt(formValue, 10) || 0;
    if (formType === 'freeship') {
      valueNum = 0;
    } else {
      if (valueNum <= 0) {
        toast.error('Giá trị giảm tiền mặt phải lớn hơn 0đ!');
        return;
      }
    }

    // 4. Validate Tổng số lượt phát hành (tối đa 1.000.000)
    let limitNum = parseInt(formUsageLimit, 10);
    if (isNaN(limitNum) || limitNum < 1) {
      limitNum = 100;
    } else if (limitNum > 1000000) {
      toast.error('Tổng số lượt phát hành tối đa là 1.000.000 lượt!');
      return;
    }

    const minOrderNum = parseInt(formMinOrder, 10) || 0;
    const maxDiscountNum = formMaxDiscount ? parseInt(formMaxDiscount, 10) : undefined;
    const formattedExpiry = formatDisplayDate(formExpiresAt);

    const backendPayload: any = {
      code: cleanCode,
      title: formTitle.trim(),
      description: formDescription.trim(),
      type: formType,
      value: valueNum,
      min_order_amount: minOrderNum,
      max_discount_amount: maxDiscountNum,
      usage_limit: limitNum,
      expires_at: formExpiresAt,
      is_active: true,
    };

    if (editingCoupon) {
      updateCoupon(editingCoupon.id, backendPayload).catch(() => {});
      setCouponsList((prev) =>
        prev.map((c) =>
          c.id === editingCoupon.id
            ? {
                ...c,
                code: cleanCode,
                title: formTitle.trim(),
                description: formDescription.trim(),
                discountType: formType,
                discountValue: valueNum,
                minOrderValue: minOrderNum,
                maxDiscount: maxDiscountNum,
                totalUsageLimit: limitNum,
                expiresAt: formattedExpiry,
              }
            : c
        )
      );
      toast.success(`Đã cập nhật Voucher "${cleanCode}" thành công!`);
    } else {
      createCoupon(backendPayload).catch(() => {});
      const newVoucher: Coupon = {
        id: `c-${Date.now()}`,
        code: cleanCode,
        title: formTitle.trim(),
        description: formDescription.trim(),
        discountType: formType,
        discountValue: valueNum,
        minOrderValue: minOrderNum,
        maxDiscount: maxDiscountNum,
        totalUsageLimit: limitNum,
        usageCount: 0,
        expiresAt: formattedExpiry,
        isActive: true,
      };
      setCouponsList((prev) => [newVoucher, ...prev]);
      toast.success(`Đã phát hành Voucher mới "${cleanCode}"!`);
    }

    setModalOpen(false);
  };

  // Toggle Active State
  const handleToggleActive = (id: string) => {
    setCouponsList((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextState = c.isActive === false ? true : false;
          updateCoupon(id, { is_active: nextState } as any).catch(() => {});
          toast.info(`${nextState ? 'Đã kích hoạt' : 'Đã tạm dừng'} Voucher ${c.code}`);
          return { ...c, isActive: nextState };
        }
        return c;
      })
    );
  };

  // Soft Delete Voucher
  const handleDeleteVoucher = (id: string, code: string) => {
    if (window.confirm(`Bạn có chắc muốn xóa Voucher "${code}" vào thùng rác?`)) {
      deleteCoupon(id).catch(() => {});
      setCouponsList((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_deleted: true, isDeleted: true } : c))
      );
      toast.info(`Đã xóa mềm Voucher "${code}" thành công!`);
    }
  };

  // Count active and ended vouchers
  const activeCouponsCount = useMemo(() => {
    return couponsList.filter((c) => {
      if (c.is_deleted || c.isDeleted) return false;
      const isExpired = checkIsExpired(c.expiresAt);
      const isDepleted = (c.usageCount || 0) >= (c.totalUsageLimit || 100);
      return !isExpired && !isDepleted;
    }).length;
  }, [couponsList]);

  const endedCouponsCount = useMemo(() => {
    return couponsList.filter((c) => {
      if (c.is_deleted || c.isDeleted) return false;
      const isExpired = checkIsExpired(c.expiresAt);
      const isDepleted = (c.usageCount || 0) >= (c.totalUsageLimit || 100);
      return isExpired || isDepleted;
    }).length;
  }, [couponsList]);

  // Filtered Vouchers (Excluding soft-deleted, partitioned by Tab)
  const filteredCoupons = useMemo(() => {
    return couponsList
      .filter((c) => !c.is_deleted && !c.isDeleted)
      .filter((c) => {
        const isExpired = checkIsExpired(c.expiresAt);
        const isDepleted = (c.usageCount || 0) >= (c.totalUsageLimit || 100);

        // Partition by Tab
        if (statusTab === 'ACTIVE') {
          if (isExpired || isDepleted) return false;
        } else {
          if (!isExpired && !isDepleted) return false;
        }

        const q = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !q ||
          c.code.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q));

        const matchesType = typeFilter === 'ALL' || c.discountType === typeFilter;

        return matchesSearch && matchesType;
      });
  }, [couponsList, searchQuery, typeFilter, statusTab]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-lime-400 font-semibold uppercase tracking-widest">
            <TicketPercent className="w-4 h-4" />
            <span>ƯU ĐÃI & VÉ KHUYẾN MÃI STRIKER</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1 uppercase tracking-tight">
            Quản Lý Voucher
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Đang phát hành: <b className="text-lime-400">{activeCouponsCount}</b> mã | Đã kết thúc: <b className="text-zinc-400">{endedCouponsCount}</b> mã
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-lime-400 to-lime-500 text-zinc-950 font-black text-xs uppercase tracking-wider hover:from-lime-300 hover:to-lime-400 shadow-xl shadow-lime-400/20 hover:scale-105 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Tạo Voucher mới</span>
        </button>
      </div>

      {/* 2. Status Filter Tabs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setStatusTab('ACTIVE')}
          className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            statusTab === 'ACTIVE'
              ? 'bg-lime-400 text-zinc-950 shadow-lg shadow-lime-400/20 scale-[1.02]'
              : 'bg-zinc-900/70 hover:bg-zinc-800 text-zinc-400 border border-zinc-800/80'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${statusTab === 'ACTIVE' ? 'bg-zinc-950' : 'bg-emerald-400 animate-pulse'}`} />
          <span>🟢 Đang phát hành</span>
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold ${
            statusTab === 'ACTIVE' ? 'bg-zinc-950/20 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
          }`}>
            {activeCouponsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusTab('ENDED')}
          className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            statusTab === 'ENDED'
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 scale-[1.02]'
              : 'bg-zinc-900/70 hover:bg-zinc-800 text-zinc-400 border border-zinc-800/80'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${statusTab === 'ENDED' ? 'bg-white' : 'bg-rose-500'}`} />
          <span>🔴 Đã kết thúc</span>
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold ${
            statusTab === 'ENDED' ? 'bg-black/20 text-white' : 'bg-zinc-800 text-zinc-400'
          }`}>
            {endedCouponsCount}
          </span>
        </button>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-4 rounded-2xl shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã code, tiêu đề ưu đãi..."
            className="w-full bg-zinc-950/80 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-500 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-lime-400/60 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-lime-400"
          >
            <option value="ALL">Tất cả loại giảm</option>
            <option value="fixed">Số tiền cố định (₫)</option>
            <option value="freeship">Miễn phí vận chuyển (Freeship)</option>
          </select>
        </div>
      </div>

      {/* 4. Voucher Ticket Card Grid */}
      {filteredCoupons.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCoupons.map((coupon) => {
            const used = Number(coupon.usageCount ?? 0);
            const limit = Number(coupon.totalUsageLimit ?? 100);
            const usagePercent = Math.min(100, Math.round((used / (limit || 1)) * 100));
            const isDepleted = used >= limit;
            const isExpired = checkIsExpired(coupon.expiresAt);

            return (
              <div
                key={coupon.id}
                className={`relative bg-zinc-900/70 backdrop-blur-xl border rounded-3xl p-6 shadow-2xl transition-all duration-300 group overflow-hidden ${
                  coupon.isActive === false || isExpired
                    ? 'opacity-60 border-zinc-800'
                    : isDepleted
                    ? 'border-red-500/30'
                    : 'border-zinc-800/80 hover:border-lime-400/60'
                }`}
              >
                {/* Decorative Cyber Ticket Cutout Notches */}
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-950 border border-zinc-800" />
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-950 border border-zinc-800" />

                {/* Top Row: Left Clean Type Indicator & Right Auto Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1.5 rounded-xl border ${
                        coupon.discountType === 'freeship'
                          ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                          : 'bg-lime-400/10 border-lime-400/20 text-lime-400'
                      }`}
                    >
                      <TicketPercent className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-mono font-bold text-zinc-300">
                      {coupon.discountType === 'freeship' ? 'Miễn phí vận chuyển' : 'Số tiền cố định'}
                    </span>
                  </div>

                  {/* Auto Status Badge */}
                  {isExpired ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono">
                      ⏰ Đã hết hạn
                    </span>
                  ) : isDepleted ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 font-mono">
                      ❌ Đã hết lượt
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleActive(coupon.id)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-xl border transition cursor-pointer flex items-center gap-1.5 font-mono ${
                        coupon.isActive !== false
                          ? 'bg-lime-400/10 text-lime-400 border-lime-400/30 hover:bg-lime-400/20'
                          : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300'
                      }`}
                      title={coupon.isActive !== false ? 'Bấm để tắt voucher' : 'Bấm để bật voucher'}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          coupon.isActive !== false ? 'bg-lime-400 animate-pulse' : 'bg-zinc-600'
                        }`}
                      />
                      {coupon.isActive !== false ? '• Đang bật' : '• Đang tắt'}
                    </button>
                  )}
                </div>

                {/* Coupon Code Header */}
                <div className="mt-4 flex items-center justify-between bg-zinc-950/80 border border-zinc-800 p-3 rounded-2xl">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      MÃ VOUCHER
                    </span>
                    <div className="font-mono text-xl font-black text-lime-400 tracking-wider">
                      {coupon.code}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(coupon.code)}
                    className="p-2.5 rounded-xl bg-zinc-800 hover:bg-lime-400 hover:text-zinc-950 text-zinc-300 transition cursor-pointer"
                    title="Sao chép mã"
                  >
                    {copiedCode === coupon.code ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Discount Title & Conditions */}
                <div className="mt-4 space-y-1.5">
                  <h3 className="font-bold text-white text-base group-hover:text-lime-400 transition">
                    {coupon.title}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {coupon.description}
                  </p>
                  <div className="text-[11px] font-mono text-zinc-400 pt-1">
                    Đơn tối thiểu: <b className="text-white">{(Number(coupon.minOrderValue ?? 0)).toLocaleString('vi-VN')}₫</b>
                  </div>
                </div>

                {/* Usage Progress Bar (Locked at 100% max) */}
                <div className="mt-5 pt-4 border-t border-dashed border-zinc-800">
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="text-zinc-400">Lượt đã dùng:</span>
                    <span className={`font-bold ${isDepleted ? 'text-rose-400' : 'text-lime-400'}`}>
                      {used} / {limit} ({usagePercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-950 overflow-hidden border border-zinc-800">
                    <div
                      style={{ width: `${usagePercent}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDepleted ? 'bg-rose-500' : 'bg-gradient-to-r from-lime-500 to-lime-300'
                      }`}
                    />
                  </div>
                </div>

                {/* Footer Expiry & Actions */}
                <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-zinc-800/80">
                  <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[11px]">
                    <Clock className={`w-3.5 h-3.5 ${isExpired ? 'text-zinc-500' : 'text-lime-400'}`} />
                    <span className={isExpired ? 'text-zinc-500 line-through' : ''}>
                      HSD: {formatDisplayDate(coupon.expiresAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(coupon)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-lime-400 hover:text-zinc-950 text-zinc-300 transition cursor-pointer"
                      title="Sửa voucher"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteVoucher(coupon.id, coupon.code)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-500 hover:text-white text-zinc-400 hover:border-red-500 transition cursor-pointer"
                      title="Xóa voucher (Xóa mềm)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 rounded-3xl bg-zinc-900/60 border border-zinc-800/80 text-center text-zinc-500">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30 text-lime-400" />
          <p className="text-sm font-semibold">
            {statusTab === 'ACTIVE' 
              ? 'Không có voucher nào đang phát hành.' 
              : 'Không có voucher nào đã kết thúc.'}
          </p>
        </div>
      )}

      {/* 5. Add / Edit Voucher Modal (Ultra-compact, Clean Placeholders) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-xl rounded-3xl shadow-2xl p-5 sm:p-6 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-lime-400">
                  {editingCoupon ? 'CHỈNH SỬA VOUCHER' : 'PHÁT HÀNH MỚI'}
                </span>
                <h2 className="text-lg font-black text-white mt-0.5">
                  {editingCoupon ? 'Cập Nhật Voucher' : 'Tạo Vé Khuyến Mãi'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveVoucher} className="mt-3.5 space-y-3">
              {/* Code with Generator */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Mã Code *
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="text-[11px] font-mono text-lime-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Tự sinh mã Cyber
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="Nhập mã voucher..."
                  className="w-full bg-zinc-950 border border-zinc-800 text-sm font-mono font-bold text-zinc-200 placeholder:text-zinc-500 px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-zinc-700 uppercase tracking-wider"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                  Tiêu đề hiển thị *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Nhập tiêu đề voucher..."
                  className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-500 px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-zinc-700"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                  Mô tả điều kiện
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Nhập điều kiện áp dụng..."
                  className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 placeholder:text-zinc-500 px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-zinc-700"
                />
              </div>

              {/* Discount Type, Discount Value & Min Order Amount (Grid 3 Cols) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                    Loại giảm *
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => handleTypeChange(e.target.value as CouponType)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-sm text-zinc-200 px-3 py-2.5 rounded-xl focus:outline-none focus:border-zinc-700 font-medium"
                  >
                    <option value="fixed">Số tiền cố định (₫)</option>
                    <option value="freeship">Miễn phí vận chuyển (Freeship)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                    {formType === 'freeship' ? 'Giá trị giảm' : 'Giá trị giảm (₫) *'}
                  </label>
                  {formType === 'freeship' ? (
                    <input
                      type="text"
                      disabled
                      value="Miễn phí 100% (0₫)"
                      className="w-full bg-zinc-950/60 border border-zinc-800 text-sm font-mono text-zinc-500 px-3 py-2.5 rounded-xl cursor-not-allowed"
                    />
                  ) : (
                    <input
                      type="number"
                      required
                      min={1}
                      onKeyDown={blockInvalidNumberKeys}
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                      placeholder="0"
                      className="w-full bg-zinc-950 border border-zinc-800 text-sm font-mono text-zinc-200 placeholder:text-zinc-500 px-3 py-2.5 rounded-xl focus:outline-none focus:border-zinc-700"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                    Đơn tối thiểu (₫)
                  </label>
                  <input
                    type="number"
                    min={0}
                    onKeyDown={blockInvalidNumberKeys}
                    value={formMinOrder}
                    onChange={(e) => setFormMinOrder(e.target.value)}
                    placeholder="0"
                    className="w-full bg-zinc-950 border border-zinc-800 text-sm font-mono text-zinc-200 placeholder:text-zinc-500 px-3 py-2.5 rounded-xl focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>

              {/* Limit & Expiry (Grid 2 Cols) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                    Tổng lượt phát hành
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000000}
                    onKeyDown={blockInvalidNumberKeys}
                    value={formUsageLimit}
                    onChange={(e) => setFormUsageLimit(e.target.value)}
                    placeholder="100"
                    className="w-full bg-zinc-950 border border-zinc-800 text-sm font-mono text-zinc-200 placeholder:text-zinc-500 px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-zinc-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                    Hạn sử dụng *
                  </label>
                  <input
                    type="date"
                    required
                    min={todayDateStr}
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-sm font-mono text-zinc-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-zinc-700 [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-lime-400/20 transition hover:scale-105 cursor-pointer"
                >
                  {editingCoupon ? 'Lưu Thay Đổi' : 'Phát Hành Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vouchers;
