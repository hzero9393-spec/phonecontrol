import { NextResponse } from 'next/server';
import { getDb, toBool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();

    // ---- 1. Total customers ----
    const totalCustomersResult = await db.execute('SELECT COUNT(*) as count FROM Customer');
    const totalCustomers = Number(totalCustomersResult.rows[0].count);

    // ---- 2. Customer type distribution ----
    const customerTypeResult = await db.execute(
      `SELECT type, COUNT(*) as count FROM Customer GROUP BY type`
    );
    const customerTypeMap: Record<string, number> = { seller: 0, buyer: 0, both: 0 };
    for (const row of customerTypeResult.rows) {
      customerTypeMap[(row as any).type] = Number((row as any).count);
    }

    // ---- 3. Inventory stats ----
    const inventoryStatusResult = await db.execute(
      `SELECT status, COUNT(*) as count FROM Inventory GROUP BY status`
    );
    const inventoryStatusMap: Record<string, number> = { pending: 0, complete: 0, done: 0 };
    for (const row of inventoryStatusResult.rows) {
      inventoryStatusMap[(row as any).status] = Number((row as any).count);
    }

    const inventoryConditionResult = await db.execute(
      `SELECT "condition", COUNT(*) as count FROM Inventory GROUP BY "condition"`
    );
    const inventoryConditionMap: Record<string, number> = { good: 0, average: 0, poor: 0 };
    for (const row of inventoryConditionResult.rows) {
      inventoryConditionMap[(row as any).condition] = Number((row as any).count);
    }

    const totalInventory = Object.values(inventoryStatusMap).reduce((s, c) => s + c, 0);

    // ---- 4. Top brands ----
    const topBrandsResult = await db.execute(
      `SELECT brand, COUNT(*) as count FROM Inventory GROUP BY brand ORDER BY count DESC LIMIT 6`
    );
    const topBrands = topBrandsResult.rows.map((b: any) => ({ name: b.brand, count: Number(b.count) }));

    // ---- 5. Sales stats ----
    const totalSalesResult = await db.execute('SELECT COUNT(*) as count FROM Sale');
    const totalSales = Number(totalSalesResult.rows[0].count);

    const revenueResult = await db.execute('SELECT COALESCE(SUM(salePrice), 0) as total FROM Sale');
    const totalRevenue = Number(revenueResult.rows[0].total);

    const paidResult = await db.execute('SELECT COALESCE(SUM(paidAmount), 0) as total FROM Sale');
    const totalPaid = Number(paidResult.rows[0].total);
    const totalPending = totalRevenue - totalPaid;

    // ---- 6. Payment status distribution ----
    const paymentStatusResult = await db.execute(
      `SELECT paymentStatus, COUNT(*) as count FROM Sale GROUP BY paymentStatus`
    );
    const paymentStatusMap: Record<string, number> = { full: 0, partial: 0, pending: 0 };
    for (const row of paymentStatusResult.rows) {
      paymentStatusMap[(row as any).paymentStatus] = Number((row as any).count);
    }

    // ---- 7 & 8. Monthly revenue and sales count (last 6 months) ----
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const allSalesResult = await db.execute({
      sql: `SELECT salePrice, saleDate FROM Sale WHERE saleDate >= ? ORDER BY saleDate ASC`,
      args: [sixMonthsAgo.toISOString()],
    });

    const monthlyRevenueMap: Record<string, number> = {};
    const monthlySalesCountMap: Record<string, number> = {};

    for (const sale of allSalesResult.rows) {
      const saleDateStr = String((sale as any).saleDate);
      const key = new Date(saleDateStr).toISOString().slice(0, 7);
      monthlyRevenueMap[key] = (monthlyRevenueMap[key] || 0) + Number((sale as any).salePrice);
      monthlySalesCountMap[key] = (monthlySalesCountMap[key] || 0) + 1;
    }

    // Fill in all months (including zeros)
    const monthlyRevenue: Array<{ month: string; revenue: number }> = [];
    const monthlySalesCount: Array<{ month: string; count: number }> = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      monthlyRevenue.push({ month: label, revenue: Math.round(monthlyRevenueMap[key] || 0) });
      monthlySalesCount.push({ month: label, count: monthlySalesCountMap[key] || 0 });
    }

    // ---- 9. Profit data: salePrice - buyPrice ----
    const profitSalesResult = await db.execute({
      sql: `SELECT s.salePrice, s.saleDate, i.buyPrice
            FROM Sale s
            JOIN Inventory i ON i.id = s.inventoryId
            ORDER BY s.saleDate DESC LIMIT 100`,
      args: [],
    });

    const totalProfit = profitSalesResult.rows.reduce(
      (sum: number, s: any) => sum + (Number(s.salePrice) - Number(s.buyPrice)),
      0
    );
    const avgProfitPerSale = totalSales > 0 ? Math.round(totalProfit / totalSales) : 0;

    // ---- 10. Order stats ----
    const orderStatusResult = await db.execute(
      `SELECT status, COUNT(*) as count FROM "Order" GROUP BY status`
    );
    const orderStatusMap: Record<string, number> = { pending: 0, processing: 0, completed: 0, cancelled: 0 };
    for (const row of orderStatusResult.rows) {
      orderStatusMap[(row as any).status] = Number((row as any).count);
    }
    const totalOrders = Object.values(orderStatusMap).reduce((s, c) => s + c, 0);

    // ---- 11. Recent 5 sales ----
    const recentSalesResult = await db.execute({
      sql: `SELECT s.*,
            i.id as inv_id, i.brand as inv_brand, i.model as inv_model,
            b.id as buyer_id, b.name as buyer_name, b.phone as buyer_phone
            FROM Sale s
            JOIN Inventory i ON i.id = s.inventoryId
            LEFT JOIN Customer b ON b.id = s.buyerId
            ORDER BY s.saleDate DESC LIMIT 5`,
      args: [],
    });

    const recentSales = recentSalesResult.rows.map((row: any) => ({
      id: row.id,
      inventoryId: row.inventoryId,
      buyerId: row.buyerId,
      salePrice: row.salePrice,
      paymentStatus: row.paymentStatus,
      paidAmount: row.paidAmount,
      pendingAmount: row.pendingAmount,
      warrantyMonths: row.warrantyMonths,
      saleDate: row.saleDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      buyer: {
        id: row.buyer_id,
        name: row.buyer_name,
        phone: row.buyer_phone,
      },
      inventory: {
        id: row.inv_id,
        brand: row.inv_brand,
        model: row.inv_model,
      },
    }));

    // ---- 12. Recent 5 inventory items ----
    const recentInventoryResult = await db.execute({
      sql: `SELECT inv.*, c.id as seller_id, c.name as seller_name
            FROM Inventory inv
            LEFT JOIN Customer c ON c.id = inv.sellerId
            ORDER BY inv.addedAt DESC LIMIT 5`,
      args: [],
    });

    const recentInventory = recentInventoryResult.rows.map((row: any) => ({
      id: row.id,
      brand: row.brand,
      model: row.model,
      ram: row.ram,
      storage: row.storage,
      color: row.color,
      imeiNo: row.imeiNo,
      condition: row.condition,
      status: row.status,
      sellerId: row.sellerId,
      buyPrice: row.buyPrice,
      repairRequired: toBool(row.repairRequired),
      repairDetails: row.repairDetails,
      repairCost: row.repairCost,
      repairStatus: row.repairStatus,
      addedAt: row.addedAt,
      updatedAt: row.updatedAt,
      seller: row.seller_id ? {
        id: row.seller_id,
        name: row.seller_name,
      } : null,
    }));

    // ---- 13. Repair stats ----
    const repairNeededResult = await db.execute(
      `SELECT COUNT(*) as count FROM Inventory WHERE repairRequired = 1 AND repairStatus IN ('pending', 'in_progress')`
    );
    const repairNeededCount = Number(repairNeededResult.rows[0].count);

    const repairCompletedResult = await db.execute(
      `SELECT COUNT(*) as count FROM Inventory WHERE repairRequired = 1 AND repairStatus = 'completed'`
    );
    const repairCompletedCount = Number(repairCompletedResult.rows[0].count);

    // ---- 14. Today's stats (AAJ cards) ----
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartISO = todayStart.toISOString();

    // Aaj Buy
    const todayBuyResult = await db.execute({
      sql: 'SELECT COALESCE(SUM(buyPrice), 0) as total, COUNT(*) as count FROM Inventory WHERE addedAt >= ?',
      args: [todayStartISO],
    });
    const aajBuyCount = Number(todayBuyResult.rows[0].count);
    const aajBuyAmount = Number(todayBuyResult.rows[0].total);

    // Aaj Sell
    const todaySellResult = await db.execute({
      sql: 'SELECT COALESCE(SUM(salePrice), 0) as total, COUNT(*) as count FROM Sale WHERE saleDate >= ?',
      args: [todayStartISO],
    });
    const aajSellCount = Number(todaySellResult.rows[0].count);
    const aajSellAmount = Number(todaySellResult.rows[0].total);

    const todayProfit = aajSellAmount - aajBuyAmount;

    // Pending: repair not done + unpaid sales
    const repairPendingResult = await db.execute(
      `SELECT COUNT(*) as count FROM Inventory WHERE repairRequired = 1 AND repairStatus != 'completed'`
    );
    const repairPendingCount = Number(repairPendingResult.rows[0].count);

    const unpaidSalesResult = await db.execute(
      `SELECT COUNT(*) as count FROM Sale WHERE paymentStatus != 'full'`
    );
    const unpaidSalesCount = Number(unpaidSalesResult.rows[0].count);
    const totalPendingItems = repairPendingCount + unpaidSalesCount;

    const todaySales = aajSellCount;
    const todayRevenueAmount = aajSellAmount;

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
      aajBuyCount,
      aajBuyAmount,
      aajSellCount,
      aajSellAmount,
      todayProfit,
      totalPendingItems,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard statistics' }, { status: 500 });
  }
}
