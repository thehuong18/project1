import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Eye, 
  Phone, 
  Mail, 
  MapPin, 
  UserCheck, 
  UserX, 
  X,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Package,
  MessageSquare
} from 'lucide-react';

import { toast } from 'sonner';
import { fetchUsers, toggleUserStatus } from '../../services/auth';
import { fetchAdminOrders, mapBackendOrder } from '../../services/orders';
import type { Customer, Order } from '../../types';

function mapUserToCustomer(user: any, userOrders: Order[]): Customer {
  const userOrderList = userOrders.filter(
    (o) => (o.userId && Number(o.userId) === Number(user.id)) ||
           (o.customer?.phone && o.customer.phone === (user.phone_number || user.phone)) ||
           (o.customer?.email && user.email && o.customer.email.toLowerCase() === user.email.toLowerCase()) ||
           (o.userEmail && user.email && o.userEmail.toLowerCase() === user.email.toLowerCase())
  );
  const completedOrders = userOrderList.filter(
    (o) => (o.status === 'delivered' || o.status === 'paid' || o.paymentStatus === 'paid') && o.status !== 'cancelled'
  );
  const totalSpent = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const defaultAddr = user.addresses?.find((a: any) => a.is_default || a.isDefault) || user.addresses?.[0];
  const addrStr = defaultAddr 
    ? `${defaultAddr.street_address || defaultAddr.street || ''}, ${defaultAddr.ward || ''}, ${defaultAddr.district || ''}, ${defaultAddr.province || ''}`.replace(/^,\s*|,\s*$/g, '')
    : '';

  const joinDateFormatted = user.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : 'Mới tham gia';

  return {
    id: user.id,
    name: user.name || 'Khách hàng',
    email: user.email || '',
    phone: user.phone_number || user.phone || 'Chưa cập nhật',
    address: addrStr || 'Chưa cập nhật địa chỉ',
    status: user.is_active !== false ? 'active' : 'blocked',
    avatar: user.avatar || '',
    ordersCount: userOrderList.length,
    totalSpent: totalSpent,
    joinDate: joinDateFormatted,
    registeredAt: joinDateFormatted,
    createdAt: user.created_at,
  };
}

export const Customers: React.FC = () => {
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, ordersRes] = await Promise.all([
        fetchUsers({ per_page: 100 }),
        fetchAdminOrders({ per_page: 100 }).catch(() => [])
      ]);

      const uList = Array.isArray(usersRes) ? usersRes : (usersRes?.data ?? []);
      const oRaw = Array.isArray(ordersRes) ? ordersRes : (ordersRes?.data ?? []);
      const oList = oRaw.map(mapBackendOrder);

      setOrdersList(oList);
      setCustomersList(uList.map((u: any) => mapUserToCustomer(u, oList)));
    } catch (err) {
      console.error('Lỗi tải danh sách khách hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Toggle Account Status (Active / Blocked) in Database
  const handleToggleStatus = async (id: string | number) => {
    const current = customersList.find((c) => String(c.id) === String(id));
    if (!current) return;
    const nextStatus = current.status === 'active' ? 'blocked' : 'active';
    try {
      await toggleUserStatus(id, nextStatus === 'active');
      toast.info(
        `${nextStatus === 'active' ? 'Đã mở khóa' : 'Đã tạm khóa'} tài khoản "${current.name}"`
      );
      setCustomersList((prev) =>
        prev.map((c) => {
          if (String(c.id) === String(id)) {
            const updated = { ...c, status: nextStatus as 'active' | 'blocked' };
            if (selectedCustomer && selectedCustomer.id === id) {
              setSelectedCustomer(updated);
            }
            return updated;
          }
          return c;
        })
      );
    } catch {
      toast.error('Không thể cập nhật trạng thái tài khoản trên máy chủ.');
    }
  };

  // Helper: Get initial character for Avatar
  const getInitialAvatar = (name: string): string => {
    if (!name) return '?';
    return name.trim().charAt(0).toUpperCase();
  };

  // Filter Customers
  const filteredCustomers = useMemo(() => {
    return customersList.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.address && c.address.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [customersList, searchQuery, statusFilter]);

  // Orders associated with currently selected customer
  const selectedCustomerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return ordersList.filter(
      (o) =>
        (o.userId && Number(o.userId) === selectedCustomer.id) ||
        (o.customer?.phone && o.customer.phone === selectedCustomer.phone) ||
        (o.customer?.email && o.customer.email.toLowerCase() === selectedCustomer.email.toLowerCase()) ||
        (o.userEmail && o.userEmail.toLowerCase() === selectedCustomer.email.toLowerCase())
    );
  }, [selectedCustomer, ordersList]);

  // Order status badge helper
  const renderOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" /> Chờ xử lý
          </span>
        );
      case 'shipping':
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Truck className="w-3 h-3" /> Đang giao
          </span>
        );
      case 'delivered':
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Đã giao
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3 h-3" /> Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-zinc-800 text-zinc-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Toolbar */}
      <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-6 rounded-3xl shadow-xl">
        <h1 className="text-2xl font-black text-white uppercase tracking-tight">
          QUẢN LÝ KHÁCH HÀNG
        </h1>
        <p className="text-xs text-zinc-400 mt-1 font-mono">
          Tổng số: <b className="text-lime-400">{customersList.length}</b> khách hàng
        </p>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-4 rounded-2xl shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên khách hàng, email, số điện thoại, địa chỉ..."
            className="w-full bg-zinc-950/80 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-500 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-lime-400/60 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-lime-400"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="blocked">Bị khóa</option>
          </select>
        </div>
      </div>

      {/* 3. Customers Data Table (5 Clean Columns) */}
      <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-3xl shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/40 text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                <th className="py-4 px-6">KHÁCH HÀNG</th>
                <th className="py-4 px-4">LIÊN HỆ</th>
                <th className="py-4 px-4">ĐƠN HÀNG</th>
                <th className="py-4 px-4">TỔNG CHI TIÊU</th>
                <th className="py-4 px-6 text-right">TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-lime-400 border-t-transparent mb-2" />
                    <p className="text-xs font-mono">Đang tải dữ liệu từ máy chủ...</p>
                  </td>
                </tr>
              ) : filteredCustomers.map((customer) => {
                const isBlocked = customer.status === 'blocked';

                return (
                  <tr
                    key={customer.id}
                    className="hover:bg-zinc-800/40 transition-colors group"
                  >
                    {/* Cột 1: KHÁCH HÀNG (Initial Avatar + Tên + Ngày tham gia) */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-full bg-zinc-800 border border-zinc-700/80 text-lime-400 font-bold font-mono text-base flex items-center justify-center flex-shrink-0 shadow-inner group-hover:border-lime-400/50 transition">
                          {getInitialAvatar(customer.name)}
                        </div>

                        <div>
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(customer)}
                            className="font-bold text-white group-hover:text-lime-400 transition leading-snug text-left hover:underline"
                          >
                            {customer.name}
                          </button>
                          <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                            Tham gia: {customer.joinDate}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: LIÊN HỆ (SĐT + Email mờ bên dưới) */}
                    <td className="py-4 px-4">
                      <div className="font-mono text-xs font-semibold text-zinc-200">
                        {customer.phone}
                      </div>
                      <div className="text-xs text-zinc-400 mt-0.5">
                        {customer.email}
                      </div>
                    </td>

                    {/* Cột 3: ĐƠN HÀNG (Số đơn đã đặt) */}
                    <td className="py-4 px-4">
                      <span className="font-mono font-bold text-sm text-white">
                        {customer.ordersCount} <span className="text-xs font-normal text-zinc-500">đơn</span>
                      </span>
                    </td>

                    {/* Cột 4: TỔNG CHI TIÊU (Số tiền tích lũy) */}
                    <td className="py-4 px-4">
                      <span className="font-mono font-bold text-lime-400 text-sm">
                        {customer.totalSpent.toLocaleString('vi-VN')}₫
                      </span>
                    </td>

                    {/* Cột 5: TRẠNG THÁI (Badge Clickable + Nút Nhắn tin + Nút Xem hồ sơ) */}
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('open-admin-chat', { detail: { userId: customer.id } }));
                          }}
                          className="p-1.5 rounded-xl bg-zinc-800/80 hover:bg-lime-400 hover:text-zinc-950 text-lime-400 text-xs font-bold transition"
                          title="Nhắn tin với khách hàng"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(customer.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                            !isBlocked
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                          }`}
                          title="Bấm để Khóa / Mở khóa tài khoản"
                        >
                          {!isBlocked ? (
                            <UserCheck className="w-3.5 h-3.5" />
                          ) : (
                            <UserX className="w-3.5 h-3.5" />
                          )}
                          <span>{!isBlocked ? 'Hoạt động' : 'Bị khóa'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedCustomer(customer)}
                          className="p-1.5 rounded-xl bg-zinc-800/80 hover:bg-lime-400 hover:text-zinc-950 text-zinc-300 text-xs font-bold transition"
                          title="Xem hồ sơ chi tiết"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}

              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30 text-lime-400" />
                    <p className="text-sm font-semibold">Không tìm thấy khách hàng nào phù hợp.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 text-lime-400 font-bold font-mono text-2xl flex items-center justify-center shadow-inner flex-shrink-0">
                  {getInitialAvatar(selectedCustomer.name)}
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">
                    Chi tiết khách hàng: {selectedCustomer.name}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                    ID: #{selectedCustomer.id} • Gia nhập ngày {selectedCustomer.joinDate}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stats Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                <span className="text-xs text-zinc-400 font-medium">Tổng chi tiêu</span>
                <div className="text-lg font-black font-mono text-lime-400 mt-1">
                  {selectedCustomer.totalSpent.toLocaleString('vi-VN')}₫
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                <span className="text-xs text-zinc-400 font-medium">Số đơn đã đặt</span>
                <div className="text-lg font-black font-mono text-white mt-1">
                  {selectedCustomer.ordersCount} đơn
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
                <span className="text-xs text-zinc-400 font-medium">Trạng thái tài khoản</span>
                <button
                  type="button"
                  onClick={() => handleToggleStatus(selectedCustomer.id)}
                  className={`mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold w-fit transition ${
                    selectedCustomer.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                  }`}
                >
                  {selectedCustomer.status === 'active' ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" /> Hoạt động
                    </>
                  ) : (
                    <>
                      <UserX className="w-3.5 h-3.5" /> Bị khóa
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Contact & Default Shipping Address */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2.5 text-xs sm:text-sm mb-6">
              <div className="flex items-center gap-2.5 text-zinc-300">
                <Mail className="w-4 h-4 text-lime-400 flex-shrink-0" />
                <span>Email: <b className="text-white">{selectedCustomer.email}</b></span>
              </div>
              <div className="flex items-center gap-2.5 text-zinc-300">
                <Phone className="w-4 h-4 text-lime-400 flex-shrink-0" />
                <span>SĐT: <b className="text-white font-mono">{selectedCustomer.phone}</b></span>
              </div>
              <div className="flex items-start gap-2.5 text-zinc-300">
                <MapPin className="w-4 h-4 text-lime-400 flex-shrink-0 mt-0.5" />
                <span>
                  Địa chỉ giao hàng mặc định: <b className="text-white">{selectedCustomer.address || 'TP. Hồ Chí Minh'}</b>
                </span>
              </div>
            </div>

            {/* Customer's Recent Orders History */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold text-lime-400 uppercase tracking-wider flex items-center gap-2">
                  <ShoppingBag className="w-3.5 h-3.5" /> Đơn hàng gần nhất ({selectedCustomerOrders.length})
                </h3>
              </div>

              {selectedCustomerOrders.length > 0 ? (
                <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/60">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 font-mono text-[11px] uppercase">
                        <th className="py-2.5 px-3.5">Mã đơn</th>
                        <th className="py-2.5 px-3">Ngày đặt</th>
                        <th className="py-2.5 px-3">Tổng tiền</th>
                        <th className="py-2.5 px-3.5 text-right">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {selectedCustomerOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-zinc-900/40 transition">
                          <td className="py-2.5 px-3.5 font-mono font-bold text-lime-400">
                            {ord.id}
                            {ord.ghnTrackingCode && (
                              <div className="text-[10px] text-zinc-400 font-normal">
                                {ord.ghnTrackingCode}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-zinc-300 text-[11px]">
                            {ord.date}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-white">
                            {ord.total.toLocaleString('vi-VN')}₫
                          </td>
                          <td className="py-2.5 px-3.5 text-right">
                            {renderOrderStatusBadge(ord.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 text-center text-zinc-400 text-xs">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-zinc-600 opacity-50" />
                  <p>Khách hàng chưa phát sinh đơn hàng nào trên hệ thống.</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end pt-5 mt-6 border-t border-zinc-800 gap-3">
              <button
                type="button"
                onClick={() => {
                  const id = selectedCustomer.id;
                  setSelectedCustomer(null);
                  window.dispatchEvent(new CustomEvent('open-admin-chat', { detail: { userId: id } }));
                }}
                className="px-4 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-lime-400/20 transition"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Nhắn tin trao đổi với khách</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
