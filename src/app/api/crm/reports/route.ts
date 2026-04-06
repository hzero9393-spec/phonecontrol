import { getDb, toBool } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ─── Helper ─────────────────────────────────────────
function parseDateRange(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fromStr = searchParams.get('from') || '';
  const toStr = searchParams.get('to') || '';
  const from = fromStr ? new Date(fromStr) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = toStr ? new Date(toStr) : new Date();
  to.setHours(23, 59, 59, 999);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

// ─── GET ────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'buy';

    switch (type) {
      case 'buy':
        return buyReport(request);
      case 'sell':
        return sellReport(request);
      case 'profit':
        return profitLossReport(request);
      case 'top':
        return topReport();
      default:
        return NextResponse.json({ error: 'Invalid report type. Use: buy, sell, profit, top' }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Report generation failed';
    console.error('Reports API error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Section 1: Buy Report ─────────────────────────
async function buyReport(request: NextRequest) {
  const { from, to } = parseDateRange(request);
  const db = getDb();

  const itemsResult = await db.execute({
    sql: `SELECT i.*, c.id as seller_id, c.name as seller_name, c.phone as seller_phone
          FROM Inventory i
          LEFT JOIN Customer c ON c.id = i.sellerId
          WHERE i.addedAt >= ? AND i.addedAt <= ?
          ORDER BY i.addedAt DESC`,
    args: [from.toISOString(), to.toISOString()],
  });

  const items = itemsResult.rows;
  const count = items.length;
  const totalBuyAmount = items.reduce((sum: number, item: any) => sum + item.buyPrice, 0);
  const totalRepairCost = items.reduce((sum: number, item: any) => sum + item.repairCost, 0);

  const tableData = items.map((item: any) => ({
    id: item.id,
    date: String(item.addedAt).split('T')[0],
    brand: item.brand,
    model: item.model,
    imeiNo: item.imeiNo || 'N/A',
    seller: item.seller_name || 'Walk-in',
    buyPrice: item.buyPrice,
    condition: item.condition,
    status: item.status,
    repairCost: item.repairCost,
  }));

  return NextResponse.json({
    count,
    totalBuyAmount,
    totalRepairCost,
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
    items: tableData,
  });
}

// ─── Section 2: Sell Report ────────────────────────
async function sellReport(request: NextRequest) {
  const { from, to } = parseDateRange(request);
  const db = getDb();

  const salesResult = await db.execute({
    sql: `SELECT s.*,
          i.brand, i.model, i.buyPrice as inv_buyPrice,
          c.id as buyer_id, c.name as buyer_name, c.phone as buyer_phone
          FROM Sale s
          JOIN Inventory i ON i.id = s.inventoryId
          LEFT JOIN Customer c ON c.id = s.buyerId
          WHERE s.saleDate >= ? AND s.saleDate <= ?
          ORDER BY s.saleDate DESC`,
    args: [from.toISOString(), to.toISOString()],
  });

  const sales = salesResult.rows;
  const count = sales.length;
  const totalSellAmount = sales.reduce((sum: number, s: any) => sum + s.salePrice, 0);
  const totalPaid = sales.reduce((sum: number, s: any) => sum + s.paidAmount, 0);
  const totalPending = sales.reduce((sum: number, s: any) => sum + s.pendingAmount, 0);

  const tableData = sales.map((sale: any) => ({
    id: sale.id,
    date: String(sale.saleDate).split('T')[0],
    brand: sale.brand,
    model: sale.model,
    buyer: sale.buyer_name || 'Unknown',
    salePrice: sale.salePrice,
    paidAmount: sale.paidAmount,
    pendingAmount: sale.pendingAmount,
    paymentStatus: sale.paymentStatus,
    warrantyMonths: sale.warrantyMonths,
  }));

  return NextResponse.json({
    count,
    totalSellAmount,
    totalPaid,
    totalPending,
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
    sales: tableData,
  });
}

// ─── Section 3: Profit/Loss Report ─────────────────
async function profitLossReport(request: NextRequest) {
  const { from, to } = parseDateRange(request);
  const db = getDb();

  const salesResult = await db.execute({
    sql: `SELECT s.*,
          i.brand, i.model, i.buyPrice as inv_buyPrice, i.repairCost as inv_repairCost
          FROM Sale s
          JOIN Inventory i ON i.id = s.inventoryId
          WHERE s.saleDate >= ? AND s.saleDate <= ?`,
    args: [from.toISOString(), to.toISOString()],
  });

  const inventoryResult = await db.execute({
    sql: 'SELECT * FROM Inventory WHERE addedAt >= ? AND addedAt <= ?',
    args: [from.toISOString(), to.toISOString()],
  });

  const sales = salesResult.rows;
  const inventoryItems = inventoryResult.rows;

  const totalSellAmount = sales.reduce((sum: number, s: any) => sum + s.salePrice, 0);
  const totalBuyAmount = sales.reduce((sum: number, s: any) => sum + s.inv_buyPrice, 0);
  const totalRepairCosts = sales.reduce((sum: number, s: any) => sum + s.inv_repairCost, 0);
  const totalUnsoldBuyAmount = inventoryItems.reduce((sum: number, item: any) => sum + item.buyPrice, 0);
  const totalUnsoldRepairCosts = inventoryItems.reduce((sum: number, item: any) => sum + item.repairCost, 0);

  const grossProfit = totalSellAmount - totalBuyAmount;
  const netProfit = grossProfit - totalRepairCosts;
  const totalInvestment = totalBuyAmount + totalRepairCosts + totalUnsoldBuyAmount + totalUnsoldRepairCosts;
  const profitMargin = totalSellAmount > 0 ? ((netProfit / totalSellAmount) * 100) : 0;

  return NextResponse.json({
    totalSellAmount,
    totalBuyAmount,
    totalRepairCosts,
    grossProfit,
    netProfit,
    totalUnsoldItems: inventoryItems.filter((i: any) => i.status !== 'done').length,
    totalUnsoldBuyAmount,
    totalUnsoldRepairCosts,
    totalInvestment,
    profitMargin,
    totalSalesCount: sales.length,
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  });
}

// ─── Section 4: Top Reports ────────────────────────
async function topReport() {
  const db = getDb();

  // Top 5 customers by purchase amount
  const topCustomersResult = await db.execute({
    sql: `SELECT buyerId, SUM(salePrice) as totalAmount, COUNT(*) as purchaseCount
          FROM Sale GROUP BY buyerId ORDER BY totalAmount DESC LIMIT 5`,
    args: [],
  });

  const topCustomersData = await Promise.all(
    topCustomersResult.rows.map(async (tc: any, index: number) => {
      const customerResult = await db.execute({
        sql: 'SELECT name, phone FROM Customer WHERE id = ?',
        args: [tc.buyerId],
      });
      const customer = customerResult.rows[0];
      return {
        rank: index + 1,
        name: customer?.name || 'Unknown',
        phone: customer?.phone || '',
        totalAmount: tc.totalAmount || 0,
        purchaseCount: tc.purchaseCount,
      };
    })
  );

  // Top 5 brands by sales count
  const topBrandsResult = await db.execute({
    sql: `SELECT brand FROM Inventory WHERE status = 'done'`,
    args: [],
  });

  const brandCountMap: Record<string, number> = {};
  for (const item of topBrandsResult.rows) {
    const brand = (item as any).brand;
    brandCountMap[brand] = (brandCountMap[brand] || 0) + 1;
  }

  const topBrandsData = Object.entries(brandCountMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count], i) => ({ rank: i + 1, name, salesCount: count }));

  // Top 5 highest profit phones
  const profitableSalesResult = await db.execute({
    sql: `SELECT s.salePrice, i.brand, i.model, i.buyPrice, i.repairCost
          FROM Sale s
          JOIN Inventory i ON i.id = s.inventoryId
          WHERE s.paymentStatus = 'full'
          ORDER BY s.salePrice DESC LIMIT 50`,
    args: [],
  });

  const profitPhones = profitableSalesResult.rows
    .map((s: any) => ({
      brand: s.brand,
      model: s.model,
      buyPrice: s.buyPrice,
      sellPrice: s.salePrice,
      repairCost: s.repairCost,
      profit: s.salePrice - s.buyPrice - s.repairCost,
    }))
    .sort((a: any, b: any) => b.profit - a.profit)
    .slice(0, 5)
    .map((p: any, i: number) => ({ ...p, rank: i + 1 }));

  return NextResponse.json({
    topCustomers: topCustomersData,
    topBrands: topBrandsData,
    topProfitPhones: profitPhones,
  });
}
