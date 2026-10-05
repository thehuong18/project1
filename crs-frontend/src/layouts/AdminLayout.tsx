import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { fetchOrderStats } from '../services/orders';
import { fetchAdminUnreadCount, type ChatMessage } from '../services/chat';
import { AdminChatModal } from '../components/admin/AdminChatModal';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  TicketPercent, 
  Users, 
  Settings, 
  Store, 
  LogOut,
  ChevronRight,
  Menu,
  X,
  Bell,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  MessageSquare,
  Headphones,
  Landmark
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // LiveChat Admin states
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [activeChatUserId, setActiveChatUserId] = useState<number | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [recentChatMessages, setRecentChatMessages] = useState<ChatMessage[]>([]);

  // Orders stats
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);

  const loadStatsAndChat = useCallback(async () => {
    try {
      const stats = await fetchOrderStats();
      setPendingOrdersCount(stats.pending ?? 0);
    } catch {
      // ignore
    }

    try {
      const chatData = await fetchAdminUnreadCount();
      setUnreadChatCount(chatData.unread_count ?? 0);
      setRecentChatMessages(chatData.recent_messages || []);
    } catch {
      // ignore
    }
  }, []);

  // Fetch real-time stats from backend API on mount & on route changes / custom events
  useEffect(() => {
    void loadStatsAndChat();
    const interval = setInterval(() => {
      void loadStatsAndChat();
    }, 5000);

    const handleOrderChange = () => {
      void loadStatsAndChat();
    };
    window.addEventListener('order-status-changed', handleOrderChange);

    const handleOpenChatEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId?: number }>;
      if (customEvent.detail?.userId) {
        setActiveChatUserId(Number(customEvent.detail.userId));
      }
      setChatModalOpen(true);
    };
    window.addEventListener('open-admin-chat', handleOpenChatEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('order-status-changed', handleOrderChange);
      window.removeEventListener('open-admin-chat', handleOpenChatEvent);
    };
  }, [loadStatsAndChat, location.pathname]);


  const systemNotifications = [
    {
      id: 1,
      title: 'Cảnh báo tồn kho sắp hết',
      desc: 'Mẫu giày Phantom GX Elite FG (Size 41) chỉ còn 2 đôi',
      time: '32 phút trước',
      type: 'alert',
      unread: true,
      link: '/admin/products',
    },
    {
      id: 2,
      title: 'Voucher STRIKER100K đạt 90% lượt dùng',
      desc: 'Đã có 90/100 lượt áp dụng mã thành công trong tuần này',
      time: '2 giờ trước',
      type: 'voucher',
      unread: true,
      link: '/admin/vouchers',
    },
    {
      id: 3,
      title: 'Cổng thanh toán MoMo hoạt động ổn định',
      desc: 'Hệ thống thanh toán trực tuyến MoMo và COD sẵn sàng xử lý đơn hàng',
      time: '1 ngày trước',
      type: 'system',
      unread: false,
      link: '/admin/settings',
    },
  ];

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/finance', label: 'Tài chính & Giao dịch', icon: Landmark },
    { path: '/admin/products', label: 'Quản lý Sản phẩm', icon: Package },
    { 
      path: '/admin/orders', 
      label: 'Quản lý Đơn hàng', 
      icon: ShoppingBag, 
      count: pendingOrdersCount > 0 ? pendingOrdersCount : undefined 
    },
    { path: '/admin/vouchers', label: 'Quản lý Voucher', icon: TicketPercent },
    { path: '/admin/customers', label: 'Quản lý Khách hàng', icon: Users },
    { path: '/admin/settings', label: 'Cài đặt Cửa hàng', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleOpenChatWithUser = (userId?: number) => {
    if (userId) setActiveChatUserId(userId);
    setChatModalOpen(true);
    setNotifOpen(false);
  };

  const totalBellBadge = unreadChatCount + (pendingOrdersCount > 0 ? 1 : 0);

  return (
    <div className="min-h-screen bg-[#0B0E17] text-slate-100 flex relative overflow-x-hidden selection:bg-lime-400 selection:text-zinc-950 font-sans">
      {/* Dynamic Cyber-Sport Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-lime-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px]" />
        <div className="absolute -bottom-20 left-1/3 w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-[160px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#131823]/95 backdrop-blur-2xl border-r border-white/10 flex flex-col justify-between transition-transform duration-300 ease-out shadow-2xl shadow-black/60
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo & Brand Identity */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-white/10 bg-[#0B0E17]/60">
            <Link to="/admin" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lime-400 to-emerald-500 text-zinc-950 font-black flex items-center justify-center text-xl shadow-lg shadow-lime-400/25 group-hover:scale-105 transition-transform duration-300">
                S
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-xl tracking-wider text-white">STRIKER</span>
                  <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
                </div>
                <div className="text-[10px] font-mono tracking-widest text-lime-400 uppercase font-semibold">
                  CYBER-SPORT ADMIN
                </div>
              </div>
            </Link>
            <button 
              className="lg:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-5 pt-6 pb-2 text-[11px] font-bold uppercase tracking-widest text-zinc-400">
            HỆ THỐNG QUẢN TRỊ
          </div>

          {/* Navigation Menu */}
          <nav className="px-3 space-y-1.5 flex-1 overflow-y-auto custom-scrollbar">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.path === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    group relative flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive 
                      ? 'bg-gradient-to-r from-lime-400 to-lime-500 text-zinc-950 font-bold shadow-lg shadow-lime-400/20' 
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-zinc-950' : 'text-zinc-400 group-hover:text-lime-400'}`} />
                    <span className="tracking-wide">{item.label}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {item.count !== undefined && item.count > 0 && (
                      <span className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded-full ${isActive ? 'bg-zinc-950 text-lime-400' : 'bg-lime-400/10 text-lime-400 border border-lime-400/30'}`}>
                        {item.count}
                      </span>
                    )}
                    {isActive ? (
                      <ChevronRight className="w-4 h-4 text-zinc-950" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/40 space-y-2">
            <Link
              to="/"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold text-zinc-300 hover:text-white bg-zinc-800/40 hover:bg-zinc-800/80 border border-zinc-800 transition-all duration-200 group"
            >
              <div className="flex items-center gap-2.5">
                <Store className="w-4 h-4 text-lime-400 group-hover:scale-110 transition-transform" />
                <span>Xem Cửa hàng Shop</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-lime-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </Link>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất Quản trị</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0 z-10">
        {/* Top Header Bar */}
        <header className="h-20 bg-[#0B0E17]/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-lg shadow-black/20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition"
              aria-label="Open sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-lime-400 uppercase tracking-wider">
                STRIKER SPORT PRO
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-xs text-zinc-400 font-medium">Bảng điều hành quản trị</span>
            </div>
          </div>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Direct LiveChat Button */}
            <button
              onClick={() => handleOpenChatWithUser()}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-lime-500/40 text-xs font-semibold text-zinc-300 hover:text-white transition group relative"
              title="Mở trung tâm LiveChat"
            >
              <MessageSquare className="w-4 h-4 text-lime-400 group-hover:scale-110 transition-transform" />
              <span>Tin nhắn CSKH</span>
              {unreadChatCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full bg-lime-400 text-zinc-950 font-black text-[10px] font-mono shadow-md shadow-lime-400/40">
                  {unreadChatCount}
                </span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>

            {/* Quick Switch to Shop */}
            <Link
              to="/"
              className="hidden md:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition"
              title="Mở giao diện Cửa Hàng"
            >
              <Store className="w-4 h-4 text-lime-400" />
              <span>Cửa hàng</span>
            </Link>

            {/* Quick LiveChat Button */}
            <button
              onClick={() => handleOpenChatWithUser()}
              className="relative p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition"
              title="Trung tâm Tin nhắn Khách hàng (LiveChat)"
              aria-label="LiveChat"
            >
              <MessageSquare className="w-5 h-5 text-lime-400" />
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white font-black text-[10px] font-mono flex items-center justify-center shadow-lg shadow-red-500/40 animate-pulse">
                  {unreadChatCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown (Bell Icon) */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition"
                aria-label="Thông báo"
              >
                <Bell className="w-5 h-5" />
                {totalBellBadge > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-lime-400 text-zinc-950 font-black text-[10px] font-mono flex items-center justify-center shadow-lg shadow-lime-400/40 animate-pulse">
                    {totalBellBadge}
                  </span>
                )}
              </button>

              {/* Notification Popover Panel */}
              {notifOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-zinc-900/95 backdrop-blur-2xl border border-zinc-800 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-lime-400" />
                      <span className="font-bold text-sm text-white">Thông báo & Tin nhắn</span>
                      {unreadChatCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-mono bg-lime-400/20 text-lime-400 rounded-full font-bold">
                          {unreadChatCount} tin nhắn mới
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 1. Phần Tin nhắn Khách hàng LiveChat */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] font-bold text-lime-400 uppercase tracking-wider mb-2">
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Tin nhắn khách hàng gần đây
                      </span>
                      <button
                        onClick={() => handleOpenChatWithUser()}
                        className="text-zinc-400 hover:text-lime-400 lowercase text-[10px] underline"
                      >
                        Mở tất cả
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                      {recentChatMessages.length > 0 ? (
                        recentChatMessages.map((msg) => (
                          <div
                            key={msg.id}
                            onClick={() => handleOpenChatWithUser(msg.sender_id)}
                            className="cursor-pointer p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 hover:border-lime-500/50 transition-all flex items-start gap-2.5"
                          >
                            <div className="w-7 h-7 rounded-lg bg-lime-400/10 border border-lime-400/30 flex items-center justify-center text-lime-400 font-bold text-xs shrink-0">
                              {msg.sender?.name ? msg.sender.name.charAt(0).toUpperCase() : 'K'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white truncate">
                                  {msg.sender?.name || `Khách hàng #${msg.sender_id}`}
                                </span>
                                <span className="text-[9px] font-mono text-zinc-400">
                                  {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                              </div>
                              <p className="text-xs text-zinc-300 truncate mt-0.5">{msg.content}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div 
                          onClick={() => handleOpenChatWithUser()}
                          className="cursor-pointer p-3 rounded-xl bg-zinc-950/40 border border-zinc-900 text-center text-xs text-zinc-400 hover:text-white transition"
                        >
                          Chưa có tin nhắn mới từ khách hàng. Bấm để mở trung tâm LiveChat.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Phần Hoạt động hệ thống */}
                  <div className="mt-4 pt-3 border-t border-zinc-800">
                    <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Hoạt động hệ thống
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                      {pendingOrdersCount > 0 && (
                        <Link
                          to="/admin/orders"
                          onClick={() => setNotifOpen(false)}
                          className="block p-2.5 rounded-xl bg-lime-500/10 border border-lime-500/30 hover:bg-lime-500/20 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-lime-400 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                              Đơn hàng cần xử lý
                            </h4>
                            <span className="text-[10px] font-mono text-lime-400 font-bold">{pendingOrdersCount} đơn mới</span>
                          </div>
                          <p className="text-xs text-zinc-300 mt-0.5">Có đơn hàng đang chờ duyệt và tạo mã vận đơn GHN.</p>
                        </Link>
                      )}

                      {systemNotifications.map((item) => (
                        <Link
                          key={item.id}
                          to={item.link}
                          onClick={() => setNotifOpen(false)}
                          className="block p-2 rounded-xl bg-zinc-950/40 border border-zinc-900 hover:bg-zinc-800/40 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-semibold text-zinc-300">
                              {item.title}
                            </h4>
                            <span className="text-[9px] font-mono text-zinc-500 whitespace-nowrap">{item.time}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-zinc-800 text-center">
                    <button
                      onClick={() => handleOpenChatWithUser()}
                      className="w-full py-2 rounded-xl bg-gradient-to-r from-lime-400 to-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-wider hover:brightness-110 shadow-lg shadow-lime-400/20 transition flex items-center justify-center gap-2"
                    >
                      <Headphones className="w-4 h-4" />
                      <span>Mở Trung Tâm LiveChat CSKH</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Admin Avatar & PRO Badge */}
            <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-zinc-800">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-lime-400 via-emerald-400 to-sky-400 p-[2px] shadow-lg shadow-lime-400/20">
                  <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center font-black text-lime-400 text-sm">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-lime-400 rounded-full border-2 border-zinc-950" />
              </div>

              <div className="hidden sm:block text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white">{user?.name || 'Admin Striker'}</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-lime-400" />
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="px-1.5 py-0.2 text-[9px] font-black tracking-widest uppercase bg-gradient-to-r from-lime-400 to-emerald-400 text-zinc-950 rounded">
                    ADMIN PRO
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">SUPERUSER</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Main Content */}
        <main className="p-4 sm:p-8 flex-1 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Admin LiveChat Modal Component */}
      <AdminChatModal
        isOpen={chatModalOpen}
        onClose={() => setChatModalOpen(false)}
        initialUserId={activeChatUserId}
      />
    </div>
  );
};