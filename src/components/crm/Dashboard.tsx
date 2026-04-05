'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Users,
  Smartphone,
  Receipt,
  IndianRupee,
  ShoppingBag,
  Wrench,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  Clock,
  Activity,
  Package,
} from 'lucide-react';
import { useCRMStore } from '@/store/use-crm-store';

/* ──────────────────────────── Types ──────────────────────────── */
interface DashboardStats {
  totalCustomers: number;
  customersByType: Record<string, number>;
  totalInventory: number;
  inventoryByStatus: Record<string, number>;
  inventoryByCondition: Record<string, number>;
  topBrands: Array<{ name: string; count: number }>;
  totalSales: number;
  totalRevenue: number;
  totalPaid: number;
  totalPending: number;
  salesByPayment: Record<string, number>;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  monthlySalesCount: Array<{ month: string; count: number }>;
  totalProfit: number;
  avgProfitPerSale: number;
  ordersByStatus: Record<string, number>;
  totalOrders: number;
  recentSales: Array<{
    id: string;
    salePrice: number;
    paymentStatus: string;
    saleDate: string;
    buyer: { fullName: string; phone: string } | null;
    inventory: { brand: string; model: string } | null;
  }>;
  recentInventory: Array<{
    id: string;
    brand: string;
    model: string;
    condition: string;
    status: string;
    buyPrice: number;
    repairRequired: boolean;
    repairStatus: string;
    addedAt: string;
    seller: { fullName: string } | null;
  }>;
  repairNeededCount: number;
  repairCompletedCount: number;
  todaySales: number;
  todayRevenue: number;
  aajBuyCount: number;
  aajBuyAmount: number;
  aajSellCount: number;
  aajSellAmount: number;
  todayProfit: number;
  totalPendingItems: number;
}

/* ──────────────────────────── Helpers ──────────────────────────── */
const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const formatCompact = (amount: number) => {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
};

/* ──────────────────────────── Color Palette ──────────────────────────── */
const PIE_COLORS = ['#FF5F00', '#059669', '#D97706', '#6366F1', '#EC4899', '#14B8A6'];
const PIE_COLORS_ALT = ['#059669', '#FF5F00', '#DC2626'];

/* ──────────────────────────── Animation Variants ──────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: 'easeOut' },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.45, ease: 'easeOut' } },
};

/* ──────────────────────────── Custom Tooltip ──────────────────────────── */
function ChartTooltip({ active, payload, label, isCurrency }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string; isCurrency?: boolean }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card rounded-lg shadow-xl border border-border px-4 py-3 text-sm">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}: </span>
          <span className="font-semibold text-foreground">{isCurrency ? formatINR(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────── Pie Label ──────────────────────────── */
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: { cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number }) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs fill-muted-foreground font-medium">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

/* ──────────────────────────── Empty Chart State ──────────────────────────── */
function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground/50">
      <Activity size={32} className="mb-2 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

/* ──────────────────────────── Main Component ──────────────────────────── */
export default function Dashboard() {
  const { admin } = useCRMStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/crm/dashboard');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setStats(data);
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  /* ─── Chart Data Prep ─── */
  const conditionPieData = stats
    ? Object.entries(stats.inventoryByCondition)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v }))
    : [];

  const paymentPieData = stats
    ? Object.entries(stats.salesByPayment)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v }))
    : [];

  const customerTypeData = stats
    ? Object.entries(stats.customersByType)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v }))
    : [];

  /* ─── Badges ─── */
  const statusBadge = (s: string) => {
    const m: Record<string, string> = { pending: 'badge-warning', complete: 'badge-success', done: 'badge-info', full: 'badge-success', partial: 'badge-warning', cancelled: 'badge-danger' };
    return `badge ${m[s] || 'badge-default'}`;
  };
  const conditionBadge = (c: string) => {
    const m: Record<string, string> = { good: 'badge-success', average: 'badge-warning', poor: 'badge-danger' };
    return `badge ${m[c] || 'badge-default'}`;
  };

  /* ─────────── Loading State ─────────── */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-[88px] rounded-xl bg-muted animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="crm-card animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-muted" />
                <div className="w-16 h-4 bg-muted rounded" />
              </div>
              <div className="h-7 bg-muted rounded w-20 mb-1" />
              <div className="h-3 bg-muted rounded w-28" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="crm-card animate-pulse h-[320px]" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-destructive mb-3">{error}</p>
        <button onClick={fetchStats} className="crm-btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══════ Welcome Banner ═══════ */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl p-6 text-white overflow-hidden bg-gradient-to-r from-[#00092C] via-[#0A1040] to-[#0A1A4A] dark:from-[#070A12] dark:via-[#0A0E1A] dark:to-[#0D1225]"
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-primary/5 rounded-full translate-y-1/2" />
        <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-red-500/10 rounded-full" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Welcome back, {admin?.fullName || 'Admin'}! 👋</h2>
            <p className="text-white/50 text-sm mt-1">Here&apos;s your shop performance at a glance.</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/10">
              <p className="text-[0.65rem] text-white/40 uppercase tracking-wider font-medium">Today&apos;s Sales</p>
              <p className="text-lg font-bold text-white">{stats.todaySales}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/10">
              <p className="text-[0.65rem] text-white/40 uppercase tracking-wider font-medium">Today&apos;s Revenue</p>
              <p className="text-lg font-bold text-emerald-400">{formatINR(stats.todayRevenue)}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══════ "Aaj" Hero Cards — 2x2 Grid ═══════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Aaj Buy */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="rounded-xl p-5 text-white relative overflow-hidden group cursor-pointer bg-gradient-to-br from-[#00092C] to-[#0A1A4A] dark:from-[#070A12] dark:to-[#0D1225]"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-500" />
          <div className="relative">
            <span className="text-2xl">📱</span>
            <p className="text-xs text-white/40 font-medium mt-1.5 uppercase tracking-wider">Aaj Buy</p>
            <p className="text-2xl font-bold mt-0.5 tracking-tight">{stats.aajBuyCount}</p>
            <p className="text-xs text-emerald-400 font-semibold mt-1">{formatINR(stats.aajBuyAmount)}</p>
          </div>
        </motion.div>

        {/* Aaj Sell */}
        <motion.div
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="rounded-xl p-5 text-white relative overflow-hidden group cursor-pointer bg-gradient-to-br from-[#0A1A4A] to-[#1A2560] dark:from-[#0D1225] dark:to-[#151C38]"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/15 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-500" />
          <div className="relative">
            <span className="text-2xl">💰</span>
            <p className="text-xs text-white/40 font-medium mt-1.5 uppercase tracking-wider">Aaj Sell</p>
            <p className="text-2xl font-bold mt-0.5 tracking-tight">{stats.aajSellCount}</p>
            <p className="text-xs text-emerald-400 font-semibold mt-1">{formatINR(stats.aajSellAmount)}</p>
          </div>
        </motion.div>

        {/* Today Profit */}
        <motion.div
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className={`rounded-xl p-5 text-white relative overflow-hidden group cursor-pointer ${
            stats.todayProfit >= 0
              ? 'bg-gradient-to-br from-emerald-700 to-emerald-600 dark:from-emerald-900 dark:to-emerald-800'
              : 'bg-gradient-to-br from-red-800 to-red-700 dark:from-red-950 dark:to-red-900'
          }`}
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-500" />
          <div className="relative">
            <span className="text-2xl">📊</span>
            <p className="text-xs text-white/60 font-medium mt-1.5 uppercase tracking-wider">Today Profit</p>
            <p className="text-2xl font-bold mt-0.5 tracking-tight">{formatINR(Math.abs(stats.todayProfit))}</p>
            <p className="text-xs font-semibold mt-1 text-white/70">
              {stats.todayProfit >= 0 ? '✅ In profit' : '⚠️ In loss'}
            </p>
          </div>
        </motion.div>

        {/* Pending */}
        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="rounded-xl p-5 text-white relative overflow-hidden group cursor-pointer bg-gradient-to-br from-orange-600 to-primary dark:from-orange-800 dark:to-orange-700"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-500" />
          <div className="relative">
            <span className="text-2xl">⏳</span>
            <p className="text-xs text-white/60 font-medium mt-1.5 uppercase tracking-wider">Pending</p>
            <p className="text-2xl font-bold mt-0.5 tracking-tight">{stats.totalPendingItems}</p>
            <p className="text-xs text-white/70 font-semibold mt-1">
              {stats.repairNeededCount} repairs · {stats.salesByPayment.pending + stats.salesByPayment.partial} unpaid
            </p>
          </div>
        </motion.div>
      </div>

      {/* ═══════ Stat Cards ═══════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Customers', value: stats.totalCustomers, icon: Users, iconBg: 'bg-primary/10', iconColor: 'text-primary', sub: `${stats.customersByType.seller} sellers · ${stats.customersByType.buyer} buyers` },
          { label: 'Total Inventory', value: stats.totalInventory, icon: Smartphone, iconBg: 'bg-indigo-500/10', iconColor: 'text-indigo-500 dark:text-indigo-400', sub: `${stats.inventoryByStatus.pending} pending · ${stats.inventoryByStatus.done} sold` },
          { label: 'Total Revenue', value: formatINR(stats.totalRevenue), icon: IndianRupee, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500 dark:text-emerald-400', sub: `₹${formatCompact(stats.totalPaid)} received`, trend: 'up' as const },
          { label: 'Total Sales', value: stats.totalSales, icon: Receipt, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500 dark:text-emerald-400', sub: `₹${formatCompact(stats.avgProfitPerSale)} avg profit`, trend: 'up' as const },
          { label: 'Pending Amount', value: formatINR(stats.totalPending), icon: CircleDollarSign, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500 dark:text-amber-400', sub: `${stats.salesByPayment.pending} unpaid invoices`, trend: stats.totalPending > 0 ? 'down' as const : undefined },
          { label: 'Total Profit', value: formatINR(stats.totalProfit), icon: TrendingUp, iconBg: stats.totalProfit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10', iconColor: stats.totalProfit >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400', sub: `${((stats.totalProfit / Math.max(stats.totalRevenue, 1)) * 100).toFixed(1)}% margin`, trend: stats.totalProfit >= 0 ? 'up' as const : 'down' as const },
          { label: 'Pending Orders', value: stats.totalOrders > 0 ? stats.ordersByStatus.pending : 0, icon: ShoppingBag, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500 dark:text-amber-400', sub: `${stats.ordersByStatus.processing} processing · ${stats.ordersByStatus.completed} done` },
          { label: 'Repairs', value: stats.repairNeededCount, icon: Wrench, iconBg: 'bg-red-500/10', iconColor: 'text-red-500 dark:text-red-400', sub: `${stats.repairCompletedCount} completed`, trend: stats.repairNeededCount > 0 ? 'down' as const : undefined },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="crm-card group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                  <Icon size={20} className={card.iconColor} />
                </div>
                {card.trend && (
                  <div className={`flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                    card.trend === 'up'
                      ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
                      : 'bg-red-500/10 text-red-500 dark:text-red-400'
                  }`}>
                    {card.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-medium mb-0.5">{card.label}</p>
              <p className="text-2xl font-bold text-foreground leading-tight tracking-tight">{card.value}</p>
              <p className="text-[0.7rem] text-muted-foreground/70 mt-1">{card.sub}</p>
            </motion.div>
          );
        })}
      </div>

      {/* ═══════ Charts Row 1: Pie Charts ═══════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Inventory by Condition */}
        <motion.div variants={scaleIn} initial="hidden" animate="visible" className="crm-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Inventory Condition</h3>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Distribution by physical state</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Smartphone size={16} className="text-indigo-500 dark:text-indigo-400" />
            </div>
          </div>
          {conditionPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={conditionPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" labelLine={false} label={PieLabel} stroke="none">
                  {conditionPieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS_ALT[i % PIE_COLORS_ALT.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No inventory data yet" />
          )}
          <div className="flex justify-center gap-4 mt-2">
            {conditionPieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS_ALT[i % PIE_COLORS_ALT.length] }} />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="font-bold text-foreground">{d.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Payment Status */}
        <motion.div variants={scaleIn} initial="hidden" animate="visible" transition={{ delay: 0.1 }} className="crm-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Payment Status</h3>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Sales by payment completion</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CircleDollarSign size={16} className="text-emerald-500 dark:text-emerald-400" />
            </div>
          </div>
          {paymentPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={paymentPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" labelLine={false} label={PieLabel} stroke="none">
                  {paymentPieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No sales data yet" />
          )}
          <div className="flex justify-center gap-4 mt-2">
            {paymentPieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="font-bold text-foreground">{d.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Customer Type */}
        <motion.div variants={scaleIn} initial="hidden" animate="visible" transition={{ delay: 0.2 }} className="crm-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Customer Types</h3>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Seller vs Buyer breakdown</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users size={16} className="text-primary" />
            </div>
          </div>
          {customerTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={customerTypeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" labelLine={false} label={PieLabel} stroke="none">
                  {customerTypeData.map((_, i) => (
                    <Cell key={i} fill={['#FF5F00', '#059669', '#6366F1'][i % 3]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No customer data yet" />
          )}
          <div className="flex justify-center gap-4 mt-2">
            {customerTypeData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ['#FF5F00', '#059669', '#6366F1'][i % 3] }} />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="font-bold text-foreground">{d.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ═══════ Charts Row 2: Bar Charts ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue */}
        <motion.div variants={scaleIn} initial="hidden" animate="visible" transition={{ delay: 0.25 }} className="crm-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Monthly Revenue</h3>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Last 6 months performance</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <IndianRupee size={16} className="text-emerald-500 dark:text-emerald-400" />
            </div>
          </div>
          {stats.monthlyRevenue.some(m => m.revenue > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.monthlyRevenue} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompact(v)} />
                <Tooltip content={<ChartTooltip isCurrency />} />
                <Bar dataKey="revenue" fill="#FF5F00" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No revenue data in the last 6 months" />
          )}
        </motion.div>

        {/* Monthly Sales Count */}
        <motion.div variants={scaleIn} initial="hidden" animate="visible" transition={{ delay: 0.3 }} className="crm-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Monthly Sales Volume</h3>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Units sold per month</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Receipt size={16} className="text-indigo-500 dark:text-indigo-400" />
            </div>
          </div>
          {stats.monthlySalesCount.some(m => m.count > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.monthlySalesCount} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" fill="#6366F1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No sales in the last 6 months" />
          )}
        </motion.div>
      </div>

      {/* ═══════ Charts Row 3: Top Brands + Order Status ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Brands */}
        <motion.div variants={scaleIn} initial="hidden" animate="visible" transition={{ delay: 0.35 }} className="lg:col-span-2 crm-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Top Brands</h3>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Most stocked phone brands</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package size={16} className="text-primary" />
            </div>
          </div>
          {stats.topBrands.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(stats.topBrands.length * 50, 200)}>
              <BarChart data={stats.topBrands} layout="vertical" barCategoryGap="15%" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'var(--foreground)', fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {stats.topBrands.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No inventory brands yet" />
          )}
        </motion.div>

        {/* Order Status */}
        <motion.div variants={scaleIn} initial="hidden" animate="visible" transition={{ delay: 0.4 }} className="crm-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Order Status</h3>
              <p className="text-xs text-muted-foreground/60 mt-0.5">{stats.totalOrders} total orders</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <ShoppingBag size={16} className="text-amber-500 dark:text-amber-400" />
            </div>
          </div>
          {(() => {
            const orderData = Object.entries(stats.ordersByStatus)
              .filter(([, v]) => v > 0)
              .map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v }));
            const orderColors = ['#D97706', '#FF5F00', '#059669', '#DC2626'];
            if (orderData.length === 0) return <EmptyChart message="No orders yet" />;
            return (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={orderData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" stroke="none">
                      {orderData.map((_, i) => (
                        <Cell key={i} fill={orderColors[i % orderColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
                  {orderData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: orderColors[i % orderColors.length] }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-bold text-foreground">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </motion.div>
      </div>

      {/* ═══════ Recent Tables ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <motion.div variants={scaleIn} initial="hidden" animate="visible" transition={{ delay: 0.45 }} className="crm-card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Recent Sales</h3>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Last 5 transactions</p>
            </div>
            <Receipt size={18} className="text-muted-foreground/30" />
          </div>
          {stats.recentSales.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground/50 text-sm">No sales yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="crm-table">
                <thead><tr><th>Customer</th><th>Phone</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>
                  {stats.recentSales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="font-medium">{sale.buyer?.fullName || '—'}</td>
                      <td>{sale.inventory ? `${sale.inventory.brand} ${sale.inventory.model}` : '—'}</td>
                      <td className="font-semibold">{formatINR(sale.salePrice)}</td>
                      <td><span className={statusBadge(sale.paymentStatus)}>{sale.paymentStatus}</span></td>
                      <td className="text-muted-foreground text-xs flex items-center gap-1"><Clock size={10} />{new Date(sale.saleDate).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Recent Inventory */}
        <motion.div variants={scaleIn} initial="hidden" animate="visible" transition={{ delay: 0.5 }} className="crm-card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Recent Inventory</h3>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Latest phone additions</p>
            </div>
            <Smartphone size={18} className="text-muted-foreground/30" />
          </div>
          {stats.recentInventory.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground/50 text-sm">No inventory yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="crm-table">
                <thead><tr><th>Phone</th><th>Condition</th><th>Buy Price</th><th>Status</th><th>Repair</th></tr></thead>
                <tbody>
                  {stats.recentInventory.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="font-medium">{item.brand} {item.model}</div>
                        {item.seller && <div className="text-xs text-muted-foreground">From: {item.seller.fullName}</div>}
                      </td>
                      <td><span className={conditionBadge(item.condition)}>{item.condition}</span></td>
                      <td className="font-semibold">{formatINR(item.buyPrice)}</td>
                      <td><span className={statusBadge(item.status)}>{item.status}</span></td>
                      <td>
                        {item.repairRequired && (
                          <span className="inline-flex items-center gap-1 text-destructive text-xs">
                            <Wrench size={12} />
                            {item.repairStatus === 'completed' ? 'Done' : 'Needed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
