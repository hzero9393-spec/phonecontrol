import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // ---- 1. Total customers ----
    const totalCustomers = await db.customer.count();

    // ---- 2. Customer type distribution ----
    const customersByType = await db.customer.groupBy({
      by: ['type'],
      _count: { id: true },
    });
    const customerTypeMap: Record<string, number> = { seller: 0, buyer: 0, both: 0 };
    for (const c of customersByType) customerTypeMap[c.type] = c._count.id;

    // ---- 3. Inventory stats ----
    const inventoryByStatus = await db.inventory.groupBy({ by: ['status'], _count: { id: true } });
    const inventoryStatusMap: Record<string, number> = { pending: 0, complete: 0, done: 0 };
    for (const item of inventoryByStatus) inventoryStatusMap[item.status] = item._count.id;

    const inventoryByCondition = await db.inventory.groupBy({ by: ['condition'], _count: { id: true } });
    const inventoryConditionMap: Record<string, number> = { good: 0, average: 0, poor: 0 };
    for (const item of inventoryByCondition) inventoryConditionMap[item.condition] = item._count.id;

    const totalInventory = Object.values(inventoryStatusMap).reduce((s, c) => s + c, 0);

    // ---- 4. Top brands ----
    const topBrandsRaw = await db.inventory.groupBy({
      by: ['brand'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 6,
    });
    const topBrands = topBrandsRaw.map((b) => ({ name: b.brand, count: b._count.id }));

    // ---- 5. Sales stats ----
    const totalSales = await db.sale.count();
    const revenueResult = await db.sale.aggregate({ _sum: { salePrice: true } });
    const totalRevenue = revenueResult._sum.salePrice ?? 0;

    const paidResult = await db.sale.aggregate({ _sum: { paidAmount: true } });
    const totalPaid = paidResult._sum.paidAmount ?? 0;
    const totalPending = totalRevenue - totalPaid;

    // ---- 6. Payment status distribution ----
    const salesByPayment = await db.sale.groupBy({ by: ['paymentStatus'], _count: { id: true } });
    const paymentStatusMap: Record<string, number> = { full: 0, partial: 0, pending: 0 };
    for (const s of salesByPayment) paymentStatusMap[s.paymentStatus] = s._count.id;

    // ---- 7. Monthly revenue (last 6 months) ----
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const allSales = await db.sale.findMany({
      where: { saleDate: { gte: sixMonthsAgo } },
      select: { salePrice: true, saleDate: true },
      orderBy: { saleDate: 'asc' },
    });

    const monthlyRevenueMap: Record<string, number> = {};
    for (const sale of allSales) {
      const key = sale.saleDate.toISOString().slice(0, 7); // YYYY-MM
      monthlyRevenueMap[key] = (monthlyRevenueMap[key] || 0) + sale.salePrice;
    }

    // Fill in all months (including zeros)
    const monthlyRevenue: Array<{ month: string; revenue: number }> = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      monthlyRevenue.push({ month: label, revenue: Math.round(monthlyRevenueMap[key] || 0) });
    }

    // ---- 8. Monthly sales count (histogram) ----
    const monthlySalesCountMap: Record<string, number> = {};
    for (const sale of allSales) {
      const key = sale.saleDate.toISOString().slice(0, 7);
      monthlySalesCountMap[key] = (monthlySalesCountMap[key] || 0) + 1;
    }

    const monthlySalesCount: Array<{ month: string; count: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      monthlySalesCount.push({ month: label, count: monthlySalesCountMap[key] || 0 });
    }

    // ---- 9. Profit data: salePrice - buyPrice ----
    const profitSales = await db.sale.findMany({
      take: 100,
      orderBy: { saleDate: 'desc' },
      select: {
        salePrice: true,
        saleDate: true,
        inventory: { select: { buyPrice: true } },
      },
    });

    const totalProfit = profitSales.reduce(
      (sum, s) => sum + (s.salePrice - (s.inventory?.buyPrice ?? 0)),
      0
    );
    const avgProfitPerSale = totalSales > 0 ? Math.round(totalProfit / totalSales) : 0;

    // ---- 10. Order stats ----
    const ordersByStatus = await db.order.groupBy({ by: ['status'], _count: { id: true } });
    const orderStatusMap: Record<string, number> = { pending: 0, processing: 0, completed: 0, cancelled: 0 };
    for (const order of ordersByStatus) orderStatusMap[order.status] = order._count.id;
    const totalOrders = Object.values(orderStatusMap).reduce((s, c) => s + c, 0);

    // ---- 11. Recent 5 sales ----
    const recentSales = await db.sale.findMany({
      take: 5,
      orderBy: { saleDate: 'desc' },
      include: {
        buyer: { select: { id: true, name: true, phone: true } },
        inventory: { select: { id: true, brand: true, model: true } },
      },
    });

    // ---- 12. Recent 5 inventory items ----
    const recentInventory = await db.inventory.findMany({
      take: 5,
      orderBy: { addedAt: 'desc' },
      include: { seller: { select: { id: true, name: true } } },
    });

    // ---- 13. Repair stats ----
    const repairNeededCount = await db.inventory.count({
      where: { repairRequired: true, repairStatus: { in: ['pending', 'in_progress'] } },
    });
    const repairCompletedCount = await db.inventory.count({
      where: { repairRequired: true, repairStatus: 'completed' },
    });

    // ---- 14. Today's stats ----
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todaySales = await db.sale.count({ where: { saleDate: { gte: todayStart } } });
    const todayRevenue = await db.sale.aggregate({
      where: { saleDate: { gte: todayStart } },
      _sum: { salePrice: true },
    });
    const todayRevenueAmount = todayRevenue._sum.salePrice ?? 0;

    return NextResponse.json({
      totalCustomers,
      customersByType: customerTypeMap,
      totalInventory,
      inventoryByStatus: inventoryStatusMap,
      inventoryByCondition: inventoryConditionMap,
      topBrands,
      totalSales,
      totalRevenue,
      totalPaid,
      totalPending,
      salesByPayment: paymentStatusMap,
      monthlyRevenue,
      monthlySalesCount,
      totalProfit,
      avgProfitPerSale,
      ordersByStatus: orderStatusMap,
      totalOrders,
      recentSales,
      recentInventory,
      repairNeededCount,
      repairCompletedCount,
      todaySales,
      todayRevenue: todayRevenueAmount,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard statistics' }, { status: 500 });
  }
}
