import { getDb, toBool } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ─── GET ────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '';

    switch (type) {
      case 'invoice':
        return printInvoice(searchParams);
      case 'customers':
        return printCustomers();
      case 'buysell':
        return printBuySellReport(searchParams);
      case 'stock':
        return printStockReport();
      default:
        return NextResponse.json({ error: 'Invalid print type. Use: invoice, customers, buysell, stock' }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Print data fetch failed';
    console.error('Print API error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Print Invoice ─────────────────────────────────
async function printInvoice(searchParams: URLSearchParams) {
  const invoiceNo = searchParams.get('invoiceNo') || '';

  if (!invoiceNo) {
    return NextResponse.json({ error: 'Invoice number is required' }, { status: 400 });
  }

  const db = getDb();

  const invoiceResult = await db.execute({
    sql: `SELECT inv.*,
          s.warrantyMonths as sale_warranty, s.saleDate as sale_date,
          i.brand, i.model, i.ram, i.storage, i.color, i.imeiNo, i."condition" as item_condition,
          buyer.name as buyer_name, buyer.phone as buyer_phone, buyer.address as buyer_address,
          cust.name as cust_name, cust.phone as cust_phone, cust.address as cust_address
          FROM Invoice inv
          JOIN Sale s ON s.id = inv.saleId
          JOIN Inventory i ON i.id = s.inventoryId
          JOIN Customer buyer ON buyer.id = s.buyerId
          JOIN Customer cust ON cust.id = inv.customerId
          WHERE inv.invoiceNo = ?`,
    args: [invoiceNo],
  });

  if (invoiceResult.rows.length === 0) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const row = invoiceResult.rows[0];

  const shopResult = await db.execute('SELECT * FROM Shop LIMIT 1');
  const shopRow = shopResult.rows.length > 0 ? shopResult.rows[0] : null;

  const totalAmount = Number(row.totalAmount);
  const gstAmount = Number(row.gstAmount);
  const subTotal = Math.round((totalAmount / 1.18) * 100) / 100;

  return NextResponse.json({
    invoice: {
      invoiceNo: row.invoiceNo,
      date: String(row.createdAt).split('T')[0],
      totalAmount: row.totalAmount,
      paidAmount: row.paidAmount,
      pendingAmount: row.pendingAmount,
      gstAmount: row.gstAmount,
      subTotal,
      cgst: Math.round(gstAmount / 2 * 100) / 100,
      sgst: Math.round(gstAmount / 2 * 100) / 100,
      warrantyMonths: row.sale_warranty,
    },
    phone: {
      brand: row.brand,
      model: row.model,
      ram: row.ram,
      storage: row.storage,
      color: row.color,
      imeiNo: row.imeiNo,
      condition: row.item_condition,
    },
    buyer: {
      name: row.cust_name,
      phone: row.cust_phone,
      address: row.cust_address,
    },
    shop: shopRow ? {
      name: shopRow.shopName,
      gstNo: shopRow.gstNo,
      address: shopRow.address,
      phone: shopRow.phone,
    } : null,
  });
}

// ─── Print Customer List ───────────────────────────
async function printCustomers() {
  const db = getDb();

  const customersResult = await db.execute({
    sql: 'SELECT * FROM Customer ORDER BY name ASC',
    args: [],
  });

  const customerData = customersResult.rows.map((c: any) => ({
    name: c.name,
    phone: c.phone,
    address: c.address,
    aadharNo: c.aadharNo,
    type: c.type,
    createdAt: String(c.createdAt).split('T')[0],
  }));

  const shopResult = await db.execute('SELECT * FROM Shop LIMIT 1');
  const shopRow = shopResult.rows.length > 0 ? shopResult.rows[0] : null;

  return NextResponse.json({
    customers: customerData,
    totalCustomers: customersResult.rows.length,
    generatedAt: new Date().toISOString(),
    shop: shopRow ? {
      name: shopRow.shopName,
      gstNo: shopRow.gstNo,
      address: shopRow.address,
      phone: shopRow.phone,
    } : null,
  });
}

// ─── Print Buy/Sell Report ─────────────────────────
async function printBuySellReport(searchParams: URLSearchParams) {
  const fromStr = searchParams.get('from') || '';
  const toStr = searchParams.get('to') || '';
  const from = fromStr ? new Date(fromStr) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = toStr ? new Date(toStr) : new Date();
  to.setHours(23, 59, 59, 999);
  from.setHours(0, 0, 0, 0);

  const db = getDb();

  const [inventoryResult, salesResult] = await Promise.all([
    db.execute({
      sql: `SELECT inv.*, c.name as seller_name, c.phone as seller_phone
            FROM Inventory inv
            LEFT JOIN Customer c ON c.id = inv.sellerId
            WHERE inv.addedAt >= ? AND inv.addedAt <= ?
            ORDER BY inv.addedAt ASC`,
      args: [from.toISOString(), to.toISOString()],
    }),
    db.execute({
      sql: `SELECT s.*,
            i.brand, i.model, i.buyPrice as inv_buyPrice, i.repairCost as inv_repairCost,
            c.name as buyer_name, c.phone as buyer_phone
            FROM Sale s
            JOIN Inventory i ON i.id = s.inventoryId
            LEFT JOIN Customer c ON c.id = s.buyerId
            WHERE s.saleDate >= ? AND s.saleDate <= ?
            ORDER BY s.saleDate ASC`,
      args: [from.toISOString(), to.toISOString()],
    }),
  ]);

  const inventoryItems = inventoryResult.rows;
  const sales = salesResult.rows;

  const totalBuy = inventoryItems.reduce((s: number, i: any) => s + i.buyPrice, 0);
  const totalSell = sales.reduce((s: number, sa: any) => s + sa.salePrice, 0);
  const totalRepairs = inventoryItems.reduce((s: number, i: any) => s + i.repairCost, 0);

  const shopResult = await db.execute('SELECT * FROM Shop LIMIT 1');
  const shopRow = shopResult.rows.length > 0 ? shopResult.rows[0] : null;

  return NextResponse.json({
    buys: inventoryItems.map((item: any) => ({
      date: String(item.addedAt).split('T')[0],
      brand: item.brand,
      model: item.model,
      imeiNo: item.imeiNo || 'N/A',
      condition: item.condition,
      buyPrice: item.buyPrice,
      repairCost: item.repairCost,
      seller: item.seller_name || 'Walk-in',
    })),
    sells: sales.map((sale: any) => ({
      date: String(sale.saleDate).split('T')[0],
      brand: sale.brand,
      model: sale.model,
      buyer: sale.buyer_name || 'Unknown',
      salePrice: sale.salePrice,
      paymentStatus: sale.paymentStatus,
    })),
    summary: {
      totalBuyCount: inventoryItems.length,
      totalBuyAmount: totalBuy,
      totalRepairCosts: totalRepairs,
      totalSellCount: sales.length,
      totalSellAmount: totalSell,
      grossProfit: totalSell - totalBuy,
      netProfit: totalSell - totalBuy - totalRepairs,
    },
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
    generatedAt: new Date().toISOString(),
    shop: shopRow ? {
      name: shopRow.shopName,
      gstNo: shopRow.gstNo,
      address: shopRow.address,
      phone: shopRow.phone,
    } : null,
  });
}

// ─── Print Stock Report ────────────────────────────
async function printStockReport() {
  const db = getDb();

  const unsoldResult = await db.execute({
    sql: `SELECT inv.*, c.name as seller_name, c.phone as seller_phone
          FROM Inventory inv
          LEFT JOIN Customer c ON c.id = inv.sellerId
          WHERE inv.status IN ('pending', 'complete')
          ORDER BY inv.addedAt DESC`,
    args: [],
  });

  const unsoldItems = unsoldResult.rows;
  const now = new Date();

  const stockData = unsoldItems.map((item: any) => {
    const addedDate = new Date(item.addedAt);
    const daysInStock = Math.floor((now.getTime() - addedDate.getTime()) / (1000 * 60 * 60 * 24));
    return {
      date: String(item.addedAt).split('T')[0],
      brand: item.brand,
      model: item.model,
      imeiNo: item.imeiNo || 'N/A',
      condition: item.condition,
      status: item.status,
      buyPrice: item.buyPrice,
      repairCost: item.repairCost,
      seller: item.seller_name || 'Walk-in',
      daysInStock,
    };
  });

  const totalInvested = unsoldItems.reduce((s: number, i: any) => s + i.buyPrice, 0);
  const totalRepairPending = unsoldItems.reduce((s: number, i: any) => s + i.repairCost, 0);

  const shopResult = await db.execute('SELECT * FROM Shop LIMIT 1');
  const shopRow = shopResult.rows.length > 0 ? shopResult.rows[0] : null;

  return NextResponse.json({
    stock: stockData,
    totalItems: unsoldItems.length,
    totalInvested,
    totalRepairPending,
    generatedAt: new Date().toISOString(),
    shop: shopRow ? {
      name: shopRow.shopName,
      gstNo: shopRow.gstNo,
      address: shopRow.address,
      phone: shopRow.phone,
    } : null,
  });
}
