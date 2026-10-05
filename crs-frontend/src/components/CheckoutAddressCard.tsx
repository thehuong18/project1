import React from 'react'
import { MapPin, Phone, User, Check, Plus, Edit3 } from 'lucide-react'
import type { Address } from '../types'

interface CheckoutAddressCardProps {
  selectedAddress: Address | null
  onOpenAddressBook: () => void
}

export const CheckoutAddressCard: React.FC<CheckoutAddressCardProps> = ({
  selectedAddress,
  onOpenAddressBook,
}) => {
  if (!selectedAddress) {
    return (
      <div className="rounded-3xl border border-dashed border-white/20 bg-white/[0.02] p-6 text-center backdrop-blur-md transition hover:border-lime-400/50">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-lime-400/10 text-lime-400">
          <MapPin size={24} />
        </div>
        <h4 className="mt-3 text-sm font-bold text-white">Bạn chưa có địa chỉ nhận hàng</h4>
        <p className="mt-1 text-xs text-slate-400">
          Vui lòng thêm địa chỉ giao hàng để tiếp tục thanh toán và tính phí vận chuyển chính xác.
        </p>
        <button
          type="button"
          onClick={onOpenAddressBook}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-lime-400 px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-lime-300 shadow-lg shadow-lime-400/20 cursor-pointer"
        >
          <Plus size={16} /> Thêm địa chỉ mới
        </button>
      </div>
    )
  }

  const fullAddressString = [
    selectedAddress.street,
    selectedAddress.ward,
    selectedAddress.district,
    selectedAddress.province,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#131823] p-5 shadow-xl transition hover:border-lime-400/40">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex items-center gap-1.5 font-bold text-white text-sm">
              <User size={15} className="text-lime-400" />
              {selectedAddress.fullName}
            </span>
            <span className="h-3 w-px bg-white/20" />
            <span className="flex items-center gap-1 font-mono text-xs text-slate-300">
              <Phone size={13} className="text-lime-400" />
              {selectedAddress.phone}
            </span>
            {selectedAddress.isDefault && (
              <span className="inline-flex items-center gap-1 rounded-full border border-lime-400/30 bg-lime-400/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-lime-400">
                <Check size={10} /> Mặc định
              </span>
            )}
          </div>

          <div className="flex items-start gap-2 pt-1 text-xs text-slate-300 leading-relaxed">
            <MapPin size={15} className="text-emerald-400 shrink-0 mt-0.5" />
            <span>{fullAddressString}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAddressBook}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-lime-300 transition hover:border-lime-400 hover:bg-lime-400/10 shrink-0 cursor-pointer"
        >
          <Edit3 size={13} /> Thay đổi
        </button>
      </div>
    </div>
  )
}
