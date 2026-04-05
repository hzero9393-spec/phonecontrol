'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Smartphone,
  Receipt,
  IndianRupee,
  ShoppingBag,
  Wrench,
  ArrowUpRight,
} from 'lucide-react';
import { useCRMStore } from '@/store/use-crm-store';

interface DashboardStats {
  totalCustomers: number;
  inventoryByStatus: Record<string, number>;
  totalSales: number;
  totalRevenue: number;
  ordersByStatus: Record<string, number>;
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
  repairNeeded: number;
}

const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const statCards = [
  { key: 'totalCustomers', label: 'Total Customers', icon: Users, bg: 'bg-[#FFF5F0]', iconColor: 'text-[#FF5F00]', valueColor: 'text-[#CC4D00]' },
  { key: 'inventoryTotal', label: 'Total Inventory', icon: Smartphone, bg: 'bg-[#EEEEF5]', iconColor: 'text-[#00092C]', valueColor: 'text-[#00092C]' },
  { key: 'totalSales', label: 'Total Sales', icon: Receipt, bg: 'bg-[#ECFDF5]', iconColor: 'text-[#0FA968]', valueColor: 'text-[#0A8A54]' },
  { key: 'totalRevenue', label: 'Total Revenue', icon: IndianRupee, bg: 'bg-[#F0FFF5]', iconColor: 'text-[#0FA968]', valueColor: 'text-[#0A8A54]' },
  { key: 'pendingOrders', label: 'Pending Orders', icon: ShoppingBag, bg: 'bg-[#FFF8EB]', iconColor: 'text-[#E8960C]', valueColor: 'text-[#C47D08]' },
  { key: 'repairNeeded', label: 'Repair Needed', icon: Wrench, bg: 'bg-[#FFF5F3]', iconColor: 'text-[#B20600]', valueColor: 'text-[#8B0500]' },
];

export default function Dashboard() {
  const { admin } = useCRMStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

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

  const getStatValue = (key: string) => {
    if (!stats) return 0;
    switch (key) {
      case 'totalCustomers':
        return stats.totalCustomers;
      case 'inventoryTotal':
        return Object.values(stats.inventoryByStatus).reduce((a, b) => a + b, 0);
      case 'totalSales':
        return stats.totalSales;
      case 'totalRevenue':
        return formatINR(stats.totalRevenue);
      case 'pendingOrders':
        return stats.ordersByStatus['pending'] || 0;
      case 'repairNeeded':
        return stats.repairNeeded;
      default:
        return 0;
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'badge-warning',
      complete: 'badge-success',
      done: 'badge-info',
      full: 'badge-success',
      partial: 'badge-warning',
      cancelled: 'badge-danger',
    };
    return `badge ${map[status] || 'badge-default'}`;
  };

  const conditionBadge = (condition: string) => {
    const map: Record<string, string> = {
      good: 'badge-success',
      average: 'badge-warning',
      poor: 'badge-danger',
    };
    return `badge ${map[condition] || 'badge-default'}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-[88px] rounded-xl bg-[#DCDCDC] animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#DCDCDC]" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-[#DCDCDC] rounded w-24" />
                  <div className="h-6 bg-[#DCDCDC] rounded w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-[#D1D1D1] p-6 animate-pulse">
              <div className="h-5 bg-[#DCDCDC] rounded w-32 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-10 bg-[#F0F0F0] rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-[#B20600] mb-3">{error}</p>
        <button onClick={fetchStats} className="px-4 py-2 bg-[#FF5F00] text-white rounded-lg text-sm hover:bg-[#CC4D00] transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#00092C] to-[#0A1A4A] rounded-xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF5F00]/10 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-1/2 w-32 h-32 bg-[#FF5F00]/5 rounded-full translate-y-1/2" />
        <div className="relative">
          <h2 className="text-xl font-bold">Welcome back, {admin?.fullName || 'Admin'}!</h2>
          <p className="text-[#8892B0] text-sm mt-1">Here&apos;s what&apos;s happening at your shop today.</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const value = getStatValue(card.key);
          return (
            <div key={card.key} className="stat-card cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <Icon size={20} className={card.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#555555] font-medium truncate">{card.label}</p>
                  <p className={`text-xl font-bold ${card.valueColor}`}>{value}</p>
                </div>
                <ArrowUpRight size={16} className="text-[#BBBBBB] group-hover:text-[#555555] transition-colors" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Inventory + Orders Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[#D1D1D1] p-5">
          <h3 className="text-sm font-semibold text-[#00092C] mb-3">Inventory Status</h3>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(stats.inventoryByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${status === 'pending' ? 'bg-[#E8960C]' : status === 'complete' ? 'bg-[#0FA968]' : 'bg-[#00092C]'}`} />
                <span className="text-sm text-[#555555] capitalize">{status}:</span>
                <span className="text-sm font-bold text-[#00092C]">{count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-[#D1D1D1] p-5">
          <h3 className="text-sm font-semibold text-[#00092C] mb-3">Order Status</h3>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(stats.ordersByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${status === 'pending' ? 'bg-[#E8960C]' : status === 'processing' ? 'bg-[#FF5F00]' : status === 'completed' ? 'bg-[#0FA968]' : 'bg-[#B20600]'}`} />
                <span className="text-sm text-[#555555] capitalize">{status}:</span>
                <span className="text-sm font-bold text-[#00092C]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-xl border border-[#D1D1D1] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EEEEEE] flex items-center justify-between">
            <h3 className="font-semibold text-[#00092C]">Recent Sales</h3>
            <Receipt size={18} className="text-[#BBBBBB]" />
          </div>
          {stats.recentSales.length === 0 ? (
            <div className="p-8 text-center text-[#888888] text-sm">No sales yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentSales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="font-medium">{sale.buyer?.fullName || '—'}</td>
                      <td>{sale.inventory ? `${sale.inventory.brand} ${sale.inventory.model}` : '—'}</td>
                      <td className="font-semibold">{formatINR(sale.salePrice)}</td>
                      <td><span className={statusBadge(sale.paymentStatus)}>{sale.paymentStatus}</span></td>
                      <td className="text-[#555555] text-xs">{new Date(sale.saleDate).toLocaleDateString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Inventory */}
        <div className="bg-white rounded-xl border border-[#D1D1D1] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EEEEEE] flex items-center justify-between">
            <h3 className="font-semibold text-[#00092C]">Recent Inventory</h3>
            <Smartphone size={18} className="text-[#BBBBBB]" />
          </div>
          {stats.recentInventory.length === 0 ? (
            <div className="p-8 text-center text-[#888888] text-sm">No inventory yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Phone</th>
                    <th>Condition</th>
                    <th>Buy Price</th>
                    <th>Status</th>
                    <th>Repair</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentInventory.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="font-medium">{item.brand} {item.model}</div>
                        {item.seller && <div className="text-xs text-[#888888]">From: {item.seller.fullName}</div>}
                      </td>
                      <td><span className={conditionBadge(item.condition)}>{item.condition}</span></td>
                      <td className="font-semibold">{formatINR(item.buyPrice)}</td>
                      <td><span className={statusBadge(item.status)}>{item.status}</span></td>
                      <td>
                        {item.repairRequired && (
                          <span className="inline-flex items-center gap-1 text-[#B20600] text-xs">
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
        </div>
      </div>
    </div>
  );
}
