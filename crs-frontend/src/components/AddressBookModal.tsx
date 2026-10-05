import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  MapPin,
  Plus,
  Check,
  User,
  Phone,
  ArrowLeft,
  Loader2,
  ChevronDown,
  Trash2,
  Edit3,
} from 'lucide-react'
import { toast } from 'sonner'
import { useApp } from '../context/AppContext'
import {
  fetchProvinces,
  fetchDistricts,
  fetchWards,
  matchGhnLocation,
  type GHNProvince,
  type GHNDistrict,
  type GHNWard,
} from '../services/shipping'
import type { Address } from '../types'

interface AddressBookModalProps {
  isOpen: boolean
  onClose: () => void
  selectedAddressId?: string
  onSelectAddress: (address: Address) => void
}

export const AddressBookModal: React.FC<AddressBookModalProps> = ({
  isOpen,
  onClose,
  selectedAddressId,
  onSelectAddress,
}) => {
  const { user, addAddress, updateAddress, deleteAddress, setDefaultAddress } = useApp()
  const addresses = user?.addresses || []

  const [mode, setMode] = useState<'list' | 'form'>(addresses.length === 0 ? 'form' : 'list')
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)

  // Form states for creating / editing address
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [isDefault, setIsDefault] = useState(addresses.length === 0)
  const [submitting, setSubmitting] = useState(false)

  // GHN Cascading States
  const [provinces, setProvinces] = useState<GHNProvince[]>([])
  const [districts, setDistricts] = useState<GHNDistrict[]>([])
  const [wards, setWards] = useState<GHNWard[]>([])

  const [selectedProvince, setSelectedProvince] = useState<GHNProvince | null>(null)
  const [selectedDistrict, setSelectedDistrict] = useState<GHNDistrict | null>(null)
  const [selectedWard, setSelectedWard] = useState<GHNWard | null>(null)

  const [loadingProvinces, setLoadingProvinces] = useState(false)
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [loadingWards, setLoadingWards] = useState(false)

  // Auto switch mode when opening modal
  useEffect(() => {
    if (isOpen) {
      setMode(addresses.length === 0 ? 'form' : 'list')
      setEditingAddress(null)
      // Reset form state
      setFullName(user?.name || '')
      setPhone(user?.phone || '')
      setStreet('')
      setSelectedProvince(null)
      setSelectedDistrict(null)
      setSelectedWard(null)
      setDistricts([])
      setWards([])
    }
  }, [isOpen, addresses.length, user])

  // Load provinces on mount
  useEffect(() => {
    if (!isOpen) return
    let isMounted = true
    setLoadingProvinces(true)
    fetchProvinces()
      .then((data) => {
        if (isMounted) setProvinces(data)
      })
      .catch((err) => {
        console.error('Lỗi tải tỉnh/thành GHN:', err)
        toast.error('Không thể tải danh sách Tỉnh/Thành từ GHN.')
      })
      .finally(() => {
        if (isMounted) setLoadingProvinces(false)
      })
    return () => {
      isMounted = false
    }
  }, [isOpen])

  // Start Create new address
  const handleStartCreate = () => {
    setEditingAddress(null)
    setFullName(user?.name || '')
    setPhone(user?.phone || '')
    setStreet('')
    setIsDefault(addresses.length === 0)
    setSelectedProvince(null)
    setSelectedDistrict(null)
    setSelectedWard(null)
    setDistricts([])
    setWards([])
    setMode('form')
  }

  // Start Edit existing address
  const handleStartEdit = async (addr: Address) => {
    setEditingAddress(addr)
    setFullName(addr.fullName || '')
    setPhone(addr.phone || '')
    setStreet(addr.street || addr.detailAddress || '')
    setIsDefault(Boolean(addr.isDefault))
    setMode('form')

    // Cascading GHN pre-fill
    try {
      let provList = provinces
      if (provList.length === 0) {
        setLoadingProvinces(true)
        provList = await fetchProvinces()
        setProvinces(provList)
        setLoadingProvinces(false)
      }

      const matchedProv =
        (addr.provinceId ? provList.find((p) => p.ProvinceID === addr.provinceId) : null) ||
        (addr.province ? matchGhnLocation(addr.province, provList, 'ProvinceName', 'Code') : null) ||
        null

      setSelectedProvince(matchedProv)

      if (matchedProv) {
        setLoadingDistricts(true)
        const distList = await fetchDistricts(matchedProv.ProvinceID)
        setDistricts(distList)
        setLoadingDistricts(false)

        const matchedDist =
          (addr.districtId ? distList.find((d) => d.DistrictID === addr.districtId) : null) ||
          (addr.district ? matchGhnLocation(addr.district, distList, 'DistrictName', 'Code') : null) ||
          null

        setSelectedDistrict(matchedDist)

        if (matchedDist) {
          setLoadingWards(true)
          const wardList = await fetchWards(matchedDist.DistrictID)
          setWards(wardList)
          setLoadingWards(false)

          const matchedWard =
            (addr.wardCode ? wardList.find((w) => String(w.WardCode) === String(addr.wardCode)) : null) ||
            (addr.ward ? matchGhnLocation(addr.ward, wardList, 'WardName', 'WardCode') : null) ||
            null

          setSelectedWard(matchedWard)
        }
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu địa giới khi sửa:', err)
    }
  }

  // Handle Province Change
  const handleProvinceChange = async (provId: number) => {
    const prov = provinces.find((p) => p.ProvinceID === provId) || null
    setSelectedProvince(prov)
    setSelectedDistrict(null)
    setSelectedWard(null)
    setDistricts([])
    setWards([])

    if (prov) {
      setLoadingDistricts(true)
      try {
        const data = await fetchDistricts(prov.ProvinceID)
        setDistricts(data)
      } catch (err) {
        console.error('Lỗi tải quận/huyện GHN:', err)
        toast.error('Không thể tải danh sách Quận/Huyện từ GHN.')
      } finally {
        setLoadingDistricts(false)
      }
    }
  }

  // Handle District Change
  const handleDistrictChange = async (distId: number) => {
    const dist = districts.find((d) => d.DistrictID === distId) || null
    setSelectedDistrict(dist)
    setSelectedWard(null)
    setWards([])

    if (dist) {
      setLoadingWards(true)
      try {
        const data = await fetchWards(dist.DistrictID)
        setWards(data)
      } catch (err) {
        console.error('Lỗi tải phường/xã GHN:', err)
        toast.error('Không thể tải danh sách Phường/Xã từ GHN.')
      } finally {
        setLoadingWards(false)
      }
    }
  }

  // Handle Ward Change
  const handleWardChange = (wCode: string) => {
    const w = wards.find((ward) => ward.WardCode === wCode) || null
    setSelectedWard(w)
  }

  // Handle Form Submit (Create or Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fullName.trim()) {
      toast.error('Vui lòng nhập họ và tên người nhận.')
      return
    }

    const phoneRegex = /^0(3|5|7|8|9)\d{8}$/
    if (!phone.trim() || !phoneRegex.test(phone.trim())) {
      toast.error('Số điện thoại không hợp lệ (phải bắt đầu bằng 03, 05, 07, 08, 09 và gồm 10 chữ số).')
      return
    }

    if (!selectedProvince || !selectedDistrict || !selectedWard) {
      toast.error('Vui lòng chọn đầy đủ Tỉnh/Thành, Quận/Huyện và Phường/Xã.')
      return
    }

    if (!street.trim()) {
      toast.error('Vui lòng nhập số nhà, tên đường.')
      return
    }

    setSubmitting(true)
    try {
      const addressData: Omit<Address, 'id'> = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        province: selectedProvince.ProvinceName,
        district: selectedDistrict.DistrictName,
        ward: selectedWard.WardName,
        street: street.trim(),
        detailAddress: street.trim(),
        isDefault: isDefault || addresses.length === 0,
        provinceId: selectedProvince.ProvinceID,
        districtId: selectedDistrict.DistrictID,
        wardCode: String(selectedWard.WardCode),
        province_id: selectedProvince.ProvinceID,
        district_id: selectedDistrict.DistrictID,
        ward_code: String(selectedWard.WardCode),
      }

      if (editingAddress) {
        const updated = await updateAddress(editingAddress.id, addressData)
        if (updated) {
          onSelectAddress(updated)
        }
      } else {
        const created = await addAddress(addressData)
        if (created) {
          onSelectAddress(created)
        } else {
          onSelectAddress({ ...addressData, id: `addr-${Date.now()}` })
        }
      }
      onClose()
    } catch (err) {
      console.error('Lỗi lưu địa chỉ:', err)
      toast.error('Không thể lưu địa chỉ, vui lòng kiểm tra lại thông tin.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0B0E17]/85 backdrop-blur-md"
          />

          {/* Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#131823] text-white shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div className="flex items-center gap-3">
                {mode === 'form' && addresses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMode('list')}
                    className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-lime-400 to-emerald-500 text-slate-950 shadow-lg shadow-lime-500/20">
                  <MapPin size={20} className="stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-white">
                    {mode === 'list'
                      ? 'Sổ địa chỉ nhận hàng'
                      : editingAddress
                      ? 'Chỉnh sửa địa chỉ nhận hàng'
                      : 'Thêm địa chỉ giao hàng'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {mode === 'list'
                      ? 'Chọn địa chỉ giao hàng hoặc tạo thêm địa chỉ mới'
                      : editingAddress
                      ? 'Cập nhật thông tin giao hàng chi tiết chuẩn GHN Express'
                      : 'Nhập thông tin giao hàng chi tiết chuẩn GHN Express'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {mode === 'list' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Địa chỉ đã lưu ({addresses.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleStartCreate}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-lime-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-lime-300 cursor-pointer shadow-sm"
                    >
                      <Plus size={14} /> Thêm địa chỉ mới
                    </button>
                  </div>

                  <div className="space-y-3">
                    {addresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id
                      const fullAddrStr = [addr.street, addr.ward, addr.district, addr.province]
                        .filter(Boolean)
                        .join(', ')

                      return (
                        <div
                          key={addr.id}
                          className={`relative flex flex-col gap-3 rounded-2xl border p-4 transition ${
                            isSelected
                              ? 'border-lime-400 bg-lime-400/10 shadow-lg shadow-lime-400/5'
                              : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                          }`}
                        >
                          <div
                            onClick={() => {
                              onSelectAddress(addr)
                              onClose()
                            }}
                            className="flex cursor-pointer items-start justify-between gap-3"
                          >
                            <div className="space-y-1.5 min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-white text-sm flex items-center gap-1.5">
                                  <User size={14} className="text-lime-400" />
                                  {addr.fullName}
                                </span>
                                <span className="h-3 w-px bg-white/20" />
                                <span className="font-mono text-xs text-slate-300 flex items-center gap-1">
                                  <Phone size={12} className="text-lime-400" />
                                  {addr.phone}
                                </span>
                                {addr.isDefault && (
                                  <span className="rounded-full border border-lime-400/30 bg-lime-400/10 px-2 py-0.5 font-mono text-[9px] font-bold text-lime-400">
                                    Mặc định
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-300 leading-relaxed pt-0.5">
                                {fullAddrStr}
                              </p>
                            </div>

                            <div className="shrink-0 pt-1">
                              <div
                                className={`grid h-6 w-6 place-items-center rounded-full border transition ${
                                  isSelected
                                    ? 'border-lime-400 bg-lime-400 text-slate-950'
                                    : 'border-white/20 bg-transparent text-transparent'
                                }`}
                              >
                                <Check size={14} className="stroke-[3]" />
                              </div>
                            </div>
                          </div>

                          {/* Actions: Set Default, Edit & Delete */}
                          <div className="flex items-center justify-between border-t border-white/5 pt-2 text-xs">
                            {!addr.isDefault ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDefaultAddress(addr.id)
                                }}
                                className="font-bold text-lime-300 hover:text-lime-200 hover:underline cursor-pointer text-[11px]"
                              >
                                Đặt làm mặc định
                              </button>
                            ) : (
                              <span className="text-slate-500 font-medium text-[11px]">
                                Địa chỉ mặc định
                              </span>
                            )}

                            <div className="flex items-center gap-1.5 ml-auto">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStartEdit(addr)
                                }}
                                className="flex items-center gap-1 text-slate-300 hover:text-lime-300 transition cursor-pointer text-[11px] px-2 py-1 rounded-lg hover:bg-white/5"
                                title="Sửa địa chỉ này"
                              >
                                <Edit3 size={13} /> Sửa
                              </button>
                              <span className="text-white/10">|</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteAddress(addr.id)
                                }}
                                className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition cursor-pointer text-[11px] px-2 py-1 rounded-lg hover:bg-white/5"
                                title="Xóa địa chỉ này"
                              >
                                <Trash2 size={13} /> Xóa
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                /* Mode Create / Edit Form */
                <form onSubmit={handleSubmitForm} className="space-y-4">
                  {/* Full Name & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-300">
                        Họ và tên người nhận <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Ví dụ: Nguyễn Văn A"
                          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-xs text-left text-white outline-none placeholder:text-slate-500 focus:border-lime-400 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-300">
                        Số điện thoại <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Ví dụ: 0901234567"
                          className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-xs text-left text-white outline-none placeholder:text-slate-500 focus:border-lime-400 transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Province -> District -> Ward Cascading Dropdowns */}
                  <div className="space-y-3">
                    {/* Province */}
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-300">
                        Tỉnh / Thành phố <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <select
                          required
                          value={selectedProvince?.ProvinceID || ''}
                          onChange={(e) => handleProvinceChange(Number(e.target.value))}
                          disabled={loadingProvinces}
                          className="w-full appearance-none rounded-xl border border-white/10 bg-[#0B0E17] py-2.5 pl-3.5 pr-10 text-xs text-left text-white outline-none focus:border-lime-400 disabled:opacity-50 cursor-pointer"
                        >
                          <option value="" disabled>
                            {loadingProvinces ? 'Đang tải danh sách Tỉnh/Thành...' : 'Chọn Tỉnh / Thành phố'}
                          </option>
                          {provinces.map((prov) => (
                            <option key={prov.ProvinceID} value={prov.ProvinceID} className="bg-[#131823] text-white">
                              {prov.ProvinceName}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    {/* District & Ward Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* District */}
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-300">
                          Quận / Huyện <span className="text-rose-400">*</span>
                        </label>
                        <div className="relative">
                          <select
                            required
                            value={selectedDistrict?.DistrictID || ''}
                            onChange={(e) => handleDistrictChange(Number(e.target.value))}
                            disabled={!selectedProvince || loadingDistricts}
                            className="w-full appearance-none rounded-xl border border-white/10 bg-[#0B0E17] py-2.5 pl-3.5 pr-10 text-xs text-left text-white outline-none focus:border-lime-400 disabled:opacity-40 cursor-pointer"
                          >
                            <option value="" disabled>
                              {!selectedProvince
                                ? 'Chọn Tỉnh/Thành trước'
                                : loadingDistricts
                                ? 'Đang tải Quận/Huyện...'
                                : 'Chọn Quận / Huyện'}
                            </option>
                            {districts.map((d) => (
                              <option key={d.DistrictID} value={d.DistrictID} className="bg-[#131823] text-white">
                                {d.DistrictName}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>

                      {/* Ward */}
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-300">
                          Phường / Xã <span className="text-rose-400">*</span>
                        </label>
                        <div className="relative">
                          <select
                            required
                            value={selectedWard?.WardCode || ''}
                            onChange={(e) => handleWardChange(e.target.value)}
                            disabled={!selectedDistrict || loadingWards}
                            className="w-full appearance-none rounded-xl border border-white/10 bg-[#0B0E17] py-2.5 pl-3.5 pr-10 text-xs text-left text-white outline-none focus:border-lime-400 disabled:opacity-40 cursor-pointer"
                          >
                            <option value="" disabled>
                              {!selectedDistrict
                                ? 'Chọn Quận/Huyện trước'
                                : loadingWards
                                ? 'Đang tải Phường/Xã...'
                                : 'Chọn Phường / Xã'}
                            </option>
                            {wards.map((w) => (
                              <option key={w.WardCode} value={w.WardCode} className="bg-[#131823] text-white">
                                {w.WardName}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Street address */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-300">
                      Địa chỉ chi tiết (Số nhà, tên đường, tòa nhà) <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="Ví dụ: Số 123 đường Lê Lợi, Tòa nhà A"
                        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-xs text-left text-white outline-none placeholder:text-slate-500 focus:border-lime-400 transition"
                      />
                    </div>
                  </div>

                  {/* Default Address Checkbox */}
                  <label className="flex items-center gap-2 pt-1 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isDefault}
                      onChange={(e) => setIsDefault(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-white/10 text-lime-400 focus:ring-0 cursor-pointer accent-lime-400"
                    />
                    <span>Đặt làm địa chỉ nhận hàng mặc định</span>
                  </label>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-3 border-t border-white/10">
                    {addresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setMode('list')}
                        className="flex-1 rounded-2xl border border-white/10 py-3 text-xs font-bold text-slate-300 transition hover:bg-white/5 cursor-pointer"
                      >
                        Quay lại danh sách
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-lime-400 py-3 text-xs font-bold text-slate-950 transition hover:bg-lime-300 shadow-lg shadow-lime-400/20 disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          <Check size={16} className="stroke-[2.5]" />{' '}
                          {editingAddress ? 'Cập nhật & Chọn địa chỉ này' : 'Lưu & Chọn địa chỉ này'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
