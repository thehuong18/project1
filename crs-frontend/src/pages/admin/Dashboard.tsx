import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ShoppingBag,
  Users,
  Package,
  Zap,
  DollarSign,
  Plus,
  TicketPercent,
  Store,
  Layers
} from 'lucide-react';
import { fetchAdminOrders, fetchOrderStats, mapBackendOrder, type OrderStats } from '../../services/orders';
import { fetchProducts } from '../../services/catalog';
import { fetchUsers } from '../../services/auth';
import type { Order, Product } from '../../types';

// Helpers to format currency for chart axes and tags
const formatYAxis = (val: number): string => {
  if (val >= 1000000) {
    const mil = val / 1000000;
    return `${mil % 1 === 0 ? mil.toFixed(0) : mil.toFixed(1)}M`;
  }
  if (val >= 1000) {
    return `${Math.round(val / 1000)}k`;
  }
  return `${val}`;
};

const formatShortCurrency = (val: number): string => {
  if (val >= 1000000) {
    const mil = val / 1000000;
    return `${mil.toFixed(1).replace('.0', '')}Tr ₫`;
  }
  if (val >= 1000) {
    return `${Math.round(val / 1000)}k ₫`;
  }
  return `${val} ₫`;
};

// Helper to safely parse order date strings
const parseOrderDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  if (dateStr.includes('/')) {
    const parts = dateStr.split(' ')[0].split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const timePart = dateStr.split(' ')[1] || '00:00';
      const [hours, minutes] = timePart.split(':').map((v) => parseInt(v, 10) || 0);
      return new Date(year, month, day, hours, minutes);
    }
  }
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const Dashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '12months'>('7days');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [customersCount, setCustomersCount] = useState<number>(0);
  const [orderStats, setOrderStats] = useState<OrderStats>({
    total: 0,
    revenue: 0,
    pending: 0,
    shipping: 0,
    delivered: 0,
    cancelled: 0,
  });

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchAdminOrders({ per_page: 100 }).catch(() => []),
      fetchOrderStats().catch(() => ({ total: 0, pending: 0, shipping: 0, delivered: 0, cancelled: 0 })),
      fetchProducts({ per_page: 100 }).catch(() => []),
      fetchUsers({ per_page: 1 }).catch(() => ({ pagination: { total: 0 } }))
    ]).then(([ordersRes, statsRes, prodsRes, usersRes]) => {
      if (!active) return;

      const oRaw = Array.isArray(ordersRes) ? ordersRes : (ordersRes?.data ?? []);
      setOrders(oRaw.map(mapBackendOrder));
      setOrderStats(statsRes);

      const pRaw = Array.isArray(prodsRes) ? prodsRes : (prodsRes?.data ?? []);
      setProductsList(pRaw);

      const uTotal = usersRes?.pagination?.total ?? (Array.isArray(usersRes) ? usersRes.length : (usersRes?.data?.length ?? 0));
      setCustomersCount(uTotal);
    });

    return () => {
      active = false;
    };
  }, []);

  // 1. Dynamic KPI Calculations
  // Total Revenue: Chỉ tính các đơn ĐÃ GIAO THÀNH CÔNG (delivered, paid)
  const completedOrders = useMemo(
    () => orders.filter((o) => o.status === 'delivered' || o.status === 'paid'),
    [orders]
  );
  const totalRevenue = useMemo(
    () => completedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0),
    [completedOrders]
  );

  // Tổng số sản phẩm đã bán ra thực tế
  const totalSoldItemsCount = useMemo(() => {
    return completedOrders.reduce((sum, o) => {
      if (o.itemsList && o.itemsList.length > 0) {
        return sum + o.itemsList.reduce((iSum, item: any) => iSum + (item.quantity || 1), 0);
      }
      return sum + (o.itemsCount || 1);
    }, 0);
  }, [completedOrders]);

  // Total Orders & Status Breakdowns from Real Database Query
  const totalOrdersCount = orderStats.total || orders.length;
  const pendingOrdersCount = orderStats.pending;
  const shippingOrdersCount = orderStats.shipping;
  const deliveredOrdersCount = orderStats.delivered;
  const cancelledOrdersCount = orderStats.cancelled;

  // Total Customers
  const totalCustomersCount = customersCount;

  // Products & Total Inventory
  const totalSkuCount = productsList.length;
  const totalStockCount = useMemo(
    () => productsList.reduce((sum, p) => sum + (p.stock || 0), 0),
    [productsList]
  );
  const lowStockCount = useMemo(
    () => productsList.filter((p) => (p.stock || 0) > 0 && (p.stock || 0) < 10).length,
    [productsList]
  );

  // 2. Dynamic Neon Chart Dataset grouped by timeRange from real orders
  const chartData = useMemo(() => {
    if (timeRange === '7days') {
      let baseDate = new Date();
      if (orders.length > 0) {
        const dates = orders.map((o) => parseOrderDate(o.date).getTime()).filter((t) => !isNaN(t));
        if (dates.length > 0) {
          baseDate = new Date(Math.max(...dates));
        }
      }

      const days: { label: string; dateStr: string; revenue: number; orders: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() - i);
        const dayNum = String(d.getDate()).padStart(2, '0');
        const monthNum = String(d.getMonth() + 1).padStart(2, '0');
        const dayOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
        const label = `${dayOfWeek} (${dayNum}/${monthNum})`;
        const dateKey = `${dayNum}/${monthNum}`;

        let dayRevenue = 0;
        let dayOrderCount = 0;

        completedOrders.forEach((o) => {
          const od = parseOrderDate(o.date);
          if (
            od.getDate() === d.getDate() &&
            od.getMonth() === d.getMonth() &&
            od.getFullYear() === d.getFullYear()
          ) {
            const netRev = Number(o.total || (o.subtotal || 0) - (o.discountAmount || 0));
            dayRevenue += netRev;
            dayOrderCount += 1;
          }
        });

        days.push({ label, dateStr: dateKey, revenue: dayRevenue, orders: dayOrderCount });
      }
      return days;
    } else if (timeRange === '30days') {
      const weeks = [
        { label: 'Tuần 1 (1-7)', startDay: 1, endDay: 7, revenue: 0, orders: 0 },
        { label: 'Tuần 2 (8-14)', startDay: 8, endDay: 14, revenue: 0, orders: 0 },
        { label: 'Tuần 3 (15-21)', startDay: 15, endDay: 21, revenue: 0, orders: 0 },
        { label: 'Tuần 4 (22-31)', startDay: 22, endDay: 31, revenue: 0, orders: 0 },
      ];
      completedOrders.forEach((o) => {
        const od = parseOrderDate(o.date);
        const d = od.getDate();
        weeks.forEach((w) => {
          if (d >= w.startDay && d <= w.endDay) {
            const netRev = Number(o.total || (o.subtotal || 0) - (o.discountAmount || 0));
            w.revenue += netRev;
            w.orders += 1;
          }
        });
      });
      return weeks.map((w) => ({
        label: w.label,
        dateStr: w.label,
        revenue: w.revenue,
        orders: w.orders,
      }));
    } else {
      // 12 Months
      const months = [
        'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12',
      ].map((m, idx) => ({
        label: m,
        dateStr: m,
        monthIdx: idx,
        revenue: 0,
        orders: 0,
      }));

      completedOrders.forEach((o) => {
        const od = parseOrderDate(o.date);
        const mIdx = od.getMonth();
        if (months[mIdx]) {
          const netRev = Number(o.total || (o.subtotal || 0) - (o.discountAmount || 0));
          months[mIdx].revenue += netRev;
          months[mIdx].orders += 1;
        }
      });

      return months;
    }
  }, [timeRange, orders, completedOrders]);

  // Max value in dataset for proper scaling
  const maxRevenue = useMemo(() => {
    const vals = chartData.map((d) => d.revenue);
    const maxVal = Math.max(...vals, 0);
    return maxVal > 0 ? Math.ceil(maxVal * 1.2) : 5000000;
  }, [chartData]);

  // Aggregate totals
  const periodTotal = useMemo(() => chartData.reduce((sum, d) => sum + d.revenue, 0), [chartData]);
  const peakDay = useMemo(() => {
    return chartData.reduce(
      (max, d) => (d.revenue > max.revenue ? d : max),
      { label: '', revenue: 0, orders: 0 }
    );
  }, [chartData]);

  // Smooth SVG Bezier curves
  const svgCurveData = useMemo(() => {
    if (chartData.length === 0) return { linePath: '', areaPath: '', points: [] };

    const svgWidth = 1000;
    const svgHeight = 220;
    const paddingX = 60;
    const usableWidth = svgWidth - paddingX * 2;
    const usableHeight = svgHeight - 30;

    const points = chartData.map((item, idx) => {
      const step = chartData.length > 1 ? usableWidth / (chartData.length - 1) : usableWidth / 2;
      const x = paddingX + idx * step;
      const ratio = maxRevenue > 0 ? item.revenue / maxRevenue : 0;
      const y = svgHeight - ratio * usableHeight - 15;
      return { x, y, revenue: item.revenue, label: item.label };
    });

    if (points.length === 1) {
      return { linePath: '', areaPath: '', points };
    }

    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? i : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const firstPt = points[0];
    const lastPt = points[points.length - 1];
    const areaPath = `${linePath} L ${lastPt.x} ${svgHeight} L ${firstPt.x} ${svgHeight} Z`;

    return { linePath, areaPath, points };
  }, [chartData, maxRevenue]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-8">
      {/* 1. Page Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-5 sm:p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-lime-500/10 to-transparent pointer-events-none" />
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-lime-400 font-semibold uppercase tracking-widest">
            <Zap className="w-3.5 h-3.5 fill-lime-400" />
            <span>STRIKER COMMAND CENTER • REALTIME METRICS</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1 uppercase tracking-tight flex items-center gap-2">
            Bảng Điều Khiển Tổng Quan
            <span className="text-lime-400">.</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Tổng hợp dữ liệu kinh doanh, hiệu suất bán lẻ và lưu lượng giao dịch thời gian thực.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/admin/products"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-lime-400 text-zinc-950 font-bold text-xs uppercase tracking-wider hover:bg-lime-300 shadow-md shadow-lime-400/20 hover:scale-105 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Thêm sản phẩm</span>
          </Link>
          <Link
            to="/admin/vouchers"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-white hover:border-lime-500/50 transition-all"
          >
            <TicketPercent className="w-4 h-4 text-lime-400" />
            <span>Tạo Voucher</span>
          </Link>
          <Link
            to="/admin/settings"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-white hover:border-lime-500/50 transition-all"
          >
            <Store className="w-4 h-4 text-emerald-400" />
            <span>Cài đặt Shop</span>
          </Link>
        </div>
      </div>

      {/* 2. 4 Cyber-Sport Dynamic KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Doanh Thu */}
        <div className="group relative bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 hover:border-lime-500/50 p-5 rounded-2xl shadow-lg transition-all duration-300 overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tổng Doanh Thu</span>
            <div className="w-9 h-9 rounded-xl bg-lime-400/10 border border-lime-400/30 flex items-center justify-center text-lime-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono tracking-tight text-white">
              {totalRevenue.toLocaleString('vi-VN')}₫
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-lime-400 bg-lime-400/10 px-2 py-0.5 rounded-lg border border-lime-400/20">
                <ShoppingBag className="w-3 h-3" /> Đã bán {totalSoldItemsCount} sản phẩm
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Tổng Đơn Hàng */}
        <div className="group relative bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 hover:border-sky-500/50 p-5 rounded-2xl shadow-lg transition-all duration-300 overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tổng Đơn Hàng</span>
            <div className="w-9 h-9 rounded-xl bg-sky-400/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono tracking-tight text-white">
              {totalOrdersCount} <span className="text-xs font-sans font-normal text-zinc-400">đơn</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-300">
                <span className="text-amber-400 font-bold">{pendingOrdersCount}</span> chờ •
                <span className="text-sky-400 font-bold"> {shippingOrdersCount}</span> giao •
                <span className="text-emerald-400 font-bold"> {deliveredOrdersCount}</span> xong
                {cancelledOrdersCount > 0 && (
                  <span> • <span className="text-red-400 font-bold">{cancelledOrdersCount}</span> hủy</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Khách Hàng */}
        <div className="group relative bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 hover:border-purple-500/50 p-5 rounded-2xl shadow-lg transition-all duration-300 overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Khách Hàng</span>
            <div className="w-9 h-9 rounded-xl bg-purple-400/10 border border-purple-400/30 flex items-center justify-center text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono tracking-tight text-white">
              {totalCustomersCount} <span className="text-xs font-sans font-normal text-zinc-400">tài khoản</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded border border-purple-400/20">
                <TrendingUp className="w-3 h-3" /> Thành viên
              </span>
              <span className="text-[11px] text-zinc-400">Đang hoạt động</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Sản Phẩm & Tồn Kho */}
        <div className="group relative bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 hover:border-amber-500/50 p-5 rounded-2xl shadow-lg transition-all duration-300 overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Sản Phẩm & Kho</span>
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono tracking-tight text-white">
              {totalSkuCount} <span className="text-xs font-sans font-normal text-zinc-400">SKU</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                <Layers className="w-3 h-3" /> {totalStockCount} tồn kho
              </span>
              {lowStockCount > 0 && (
                <span className="text-[11px] text-red-400 font-mono">({lowStockCount} sắp hết)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Neon Area & Pillar Chart (Biểu Đồ Doanh Thu) */}
      <section className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 p-5 sm:p-7 rounded-3xl shadow-xl relative overflow-hidden">
        {/* Header toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-lime-400 animate-pulse shadow-[0_0_8px_#a3e635]" />
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-lime-400">
                DOANH THU & HIỆU SUẤT TĂNG TRƯỞNG
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white mt-1 uppercase tracking-wide">
              Biểu Đồ Doanh Thu Neon
            </h2>
          </div>

          {/* Quick Metrics & Timeframe selector */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs">
              <span className="text-zinc-400">Tổng kỳ:</span>
              <span className="font-mono font-black text-lime-400">
                {periodTotal.toLocaleString('vi-VN')}₫
              </span>
            </div>

            {peakDay.revenue > 0 && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs">
                <span className="text-zinc-400">Đỉnh cao:</span>
                <span className="font-mono font-black text-emerald-400">
                  {peakDay.revenue.toLocaleString('vi-VN')}₫
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">({peakDay.label})</span>
              </div>
            )}

            {/* Timeframe selector tabs */}
            <div className="flex items-center gap-1 p-1 bg-zinc-950/80 border border-zinc-800 rounded-xl">
              {(['7days', '30days', '12months'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setTimeRange(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeRange === key
                      ? 'bg-lime-400 text-zinc-950 shadow-md shadow-lime-400/20 font-black'
                      : 'text-zinc-400 hover:text-white'
                    }`}
                >
                  {key === '7days' ? '7 ngày' : key === '30days' ? '30 ngày' : '12 tháng'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Glowing Chart Canvas */}
        <div className="mt-6 relative">
          <div className="h-72 sm:h-80 w-full relative flex">
            {/* Left Y-Axis Labels */}
            <div className="w-14 sm:w-16 h-[220px] flex flex-col justify-between items-end pr-3 select-none text-[11px] font-mono text-zinc-400 shrink-0">
              <span>{formatYAxis(maxRevenue)}</span>
              <span>{formatYAxis(maxRevenue * 0.75)}</span>
              <span>{formatYAxis(maxRevenue * 0.5)}</span>
              <span>{formatYAxis(maxRevenue * 0.25)}</span>
              <span className="text-zinc-400">0₫</span>
            </div>

            {/* Main Chart Body (SVG Area + Bars + Ticks) */}
            <div className="flex-1 h-full relative">
              {/* Horizontal Grid lines */}
              <div className="absolute inset-x-0 top-0 h-[220px] flex flex-col justify-between pointer-events-none">
                <div className="border-b border-zinc-800/80 w-full" />
                <div className="border-b border-zinc-800/50 border-dashed w-full" />
                <div className="border-b border-zinc-800/50 border-dashed w-full" />
                <div className="border-b border-zinc-800/50 border-dashed w-full" />
                <div className="border-b border-zinc-700 w-full" />
              </div>

              {/* Background SVG Spline Wave */}
              <svg
                className="absolute inset-x-0 top-0 w-full h-[220px] overflow-visible pointer-events-none"
                viewBox="0 0 1000 220"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="neonAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a3e635" stopOpacity="0.35" />
                    <stop offset="50%" stopColor="#84cc16" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#65a30d" stopOpacity="0" />
                  </linearGradient>
                  <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {svgCurveData.areaPath && (
                  <path d={svgCurveData.areaPath} fill="url(#neonAreaGradient)" />
                )}

                {svgCurveData.linePath && (
                  <>
                    <path
                      d={svgCurveData.linePath}
                      fill="none"
                      stroke="#a3e635"
                      strokeWidth="6"
                      strokeOpacity="0.3"
                      filter="url(#neonGlow)"
                    />
                    <path
                      d={svgCurveData.linePath}
                      fill="none"
                      stroke="#bef264"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </>
                )}

                {svgCurveData.points.map((pt, idx) => (
                  <g key={idx}>
                    {hoveredPoint === idx && (
                      <line
                        x1={pt.x}
                        y1={15}
                        x2={pt.x}
                        y2={205}
                        stroke="#a3e635"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        opacity="0.8"
                      />
                    )}
                    {pt.revenue > 0 && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={hoveredPoint === idx ? 6 : 4}
                        fill="#ffffff"
                        stroke="#a3e635"
                        strokeWidth={hoveredPoint === idx ? 3 : 2}
                        className="transition-all duration-200"
                        filter="drop-shadow(0 0 6px #a3e635)"
                      />
                    )}
                  </g>
                ))}
              </svg>

              {/* Foreground Pillars & Interactive Hover Area */}
              <div className="absolute inset-x-0 top-0 h-full flex items-end justify-between gap-1 sm:gap-3 z-10">
                {chartData.map((item, idx) => {
                  const ratio = maxRevenue > 0 ? item.revenue / maxRevenue : 0;
                  const heightPercent = item.revenue > 0 ? Math.max(12, Math.min(100, ratio * 100)) : 3;
                  const isHovered = hoveredPoint === idx;

                  return (
                    <div
                      key={item.label}
                      className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                      onMouseEnter={() => setHoveredPoint(idx)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      {/* Hover Tooltip Popup */}
                      {isHovered && (
                        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-zinc-950/95 border-2 border-lime-400 p-3 rounded-2xl shadow-2xl shadow-lime-400/20 z-30 pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-lime-400" />
                            <span>{item.label}</span>
                          </div>
                          <div className="text-base font-black font-mono text-lime-400 mt-0.5">
                            {item.revenue.toLocaleString('vi-VN')}₫
                          </div>
                          <div className="text-[11px] text-zinc-300 flex items-center justify-between gap-3 mt-1 pt-1 border-t border-zinc-800">
                            <span>{item.orders} đơn hoàn tất</span>
                            {periodTotal > 0 && (
                              <span className="font-mono text-lime-400/80">
                                {((item.revenue / periodTotal) * 100).toFixed(1)}% kỳ
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bar Pillar Container */}
                      <div className="w-full max-w-[42px] sm:max-w-[54px] h-[220px] flex flex-col justify-end items-center relative">
                        {item.revenue > 0 && (
                          <div
                            className={`mb-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-black tracking-tight transition-all duration-200 whitespace-nowrap select-none ${isHovered
                                ? 'bg-white text-zinc-950 scale-110 shadow-lg shadow-white/30'
                                : 'bg-lime-400 text-zinc-950 shadow-md shadow-lime-400/30'
                              }`}
                          >
                            {formatShortCurrency(item.revenue)}
                          </div>
                        )}

                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-xl transition-all duration-500 relative flex flex-col justify-between ${item.revenue > 0
                              ? isHovered
                                ? 'bg-gradient-to-t from-lime-500 via-lime-400 to-lime-200 shadow-[0_0_25px_rgba(163,230,53,0.5)] border-t-2 border-x border-white'
                                : 'bg-gradient-to-t from-lime-500/30 via-lime-400/70 to-lime-300 shadow-[0_0_15px_rgba(163,230,53,0.25)] border-t-2 border-x border-lime-300/80 group-hover:from-lime-500/50'
                              : 'bg-zinc-800/40 border-t border-zinc-700/60'
                            }`}
                        >
                          {item.revenue > 0 && (
                            <div className="h-1 bg-white/90 rounded-t-xl w-full shadow-[0_0_6px_#ffffff]" />
                          )}
                        </div>
                      </div>

                      {/* X-axis Label */}
                      <div className="h-10 flex items-center justify-center">
                        <span
                          className={`text-[11px] sm:text-xs font-mono transition-all text-center ${isHovered
                              ? 'text-lime-400 font-bold scale-105'
                              : item.revenue > 0
                                ? 'text-zinc-200 font-semibold'
                                : 'text-zinc-500'
                            }`}
                        >
                          {item.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
