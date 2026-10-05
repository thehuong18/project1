import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { CartDrawer } from '../components/CartDrawer';
import { ChatWidget } from '../components/ChatWidget';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Truck, 
  RotateCcw 
} from 'lucide-react';
import type { ShopSettings } from '../types';
import { INITIAL_SHOP_SETTINGS } from '../data/adminMockData';

export function ShopLayout({ children }: { children: React.ReactNode }) {
  const getStoredSettings = (): ShopSettings => {
    const stored = localStorage.getItem('crs_shop_settings');
    if (!stored) return INITIAL_SHOP_SETTINGS;
    try {
      return JSON.parse(stored) as ShopSettings;
    } catch {
      return INITIAL_SHOP_SETTINGS;
    }
  };

  const [settings, setSettings] = useState<ShopSettings>(getStoredSettings);

  useEffect(() => {
    const handleSettingsChange = () => {
      setSettings(getStoredSettings());
    };
    window.addEventListener('shop-settings-changed', handleSettingsChange);
    window.addEventListener('storage', handleSettingsChange);
    return () => {
      window.removeEventListener('shop-settings-changed', handleSettingsChange);
      window.removeEventListener('storage', handleSettingsChange);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0E17] text-white flex flex-col justify-between selection:bg-lime-400 selection:text-slate-950">
      <Header />
      
      <main className="flex-1">
        {children}
      </main>

      {/* Modern E-Commerce Footer */}
      <footer className="border-t border-white/10 bg-[#0B0E17] px-5 pt-16 pb-12 text-slate-400 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Cột 1: Thông tin thương hiệu */}
          <div className="space-y-4">
            <div className="text-xl font-black tracking-[.16em] text-white">
              STRIKER<span className="text-lime-400">.</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-400 max-w-xs">
              Thương hiệu trang thiết bị bóng đá Cyber-Sport hàng đầu. Đồng hành cùng những cầu thủ đam mê và khát khao chiến thắng.
            </p>
            <div className="space-y-2 pt-2 text-xs">
              <div className="flex items-start gap-2 text-slate-300">
                <MapPin size={14} className="text-lime-400 shrink-0 mt-0.5" />
                <span>{settings.address || 'Hà Nội, Việt Nam'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Clock size={14} className="text-lime-400 shrink-0" />
                <span>{settings.workingHours || '08:00 - 22:00 (Hàng ngày)'}</span>
              </div>
            </div>
          </div>

          {/* Cột 2: Khám phá sản phẩm (Static Text) */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-300 mb-4">
              Khám phá
            </h4>
            <ul className="space-y-2.5 text-xs font-normal text-slate-400">
              <li className="cursor-default select-none">Tất cả sản phẩm</li>
              <li className="cursor-default select-none">Giày bóng đá chính hãng</li>
              <li className="cursor-default select-none">Áo đấu CLB & Đội tuyển</li>
              <li className="cursor-default select-none">Bóng thi đấu chuẩn FIFA</li>
              <li className="cursor-default select-none">Phụ kiện & Bảo hộ thể thao</li>
            </ul>
          </div>

          {/* Cột 3: Cam kết dịch vụ (Static Text) */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-300 mb-4">
              Cam kết dịch vụ
            </h4>
            <ul className="space-y-2.5 text-xs font-normal text-slate-400">
              <li className="flex items-center gap-2 cursor-default select-none">
                <Truck size={13} className="text-lime-400 shrink-0" />
                <span>Giao hàng toàn quốc từ 2-4 ngày</span>
              </li>
              <li className="flex items-center gap-2 cursor-default select-none">
                <RotateCcw size={13} className="text-lime-400 shrink-0" />
                <span>Đổi trả miễn phí trong 30 ngày</span>
              </li>
              <li className="flex items-center gap-2 cursor-default select-none">
                <ShieldCheck size={13} className="text-lime-400 shrink-0" />
                <span>Cam kết 100% hàng chính hãng nhập khẩu</span>
              </li>
            </ul>
          </div>

          {/* Cột 4: Kết nối với Striker (Hotline & Email - Prepared for Live Chat space) */}
          <div className="space-y-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-300">
              Kết nối với Striker
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tổng đài chăm sóc khách hàng và tư vấn trực tiếp 24/7 từ đội ngũ Striker:
            </p>

            {/* Hotline & Email Contact Card */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3 text-xs">
              <a 
                href={`tel:${settings.hotline || '19008899'}`}
                className="flex items-center gap-2.5 text-slate-200 hover:text-lime-400 transition"
              >
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-lime-400/10 text-lime-400">
                  <Phone size={14} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Hotline tư vấn</span>
                  <b className="font-mono text-sm text-lime-300">{settings.hotline || '1900 8899'}</b>
                </div>
              </a>

              <div className="h-px bg-white/5" />

              <a 
                href={`mailto:${settings.email || 'support@striker.vn'}`}
                className="flex items-center gap-2.5 text-slate-200 hover:text-lime-400 transition"
              >
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-400/10 text-emerald-400">
                  <Mail size={14} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Hòm thư hỗ trợ</span>
                  <span className="font-medium text-xs text-slate-300">{settings.email || 'support@striker.vn'}</span>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mx-auto mt-12 max-w-7xl border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] uppercase tracking-widest text-slate-500 font-mono">
          <div>© 2026 STRIKER SPORT PRO. ALL RIGHTS RESERVED.</div>
          <div className="text-slate-400">DESIGNED FOR THE PASSIONATE GAME.</div>
        </div>
      </footer>

      <CartDrawer />
      <ChatWidget />
    </div>
  );
}

