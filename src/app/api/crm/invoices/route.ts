import { getDb, toBool } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ─── GET ─────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;
    const db = getDb();

    // Single invoice detail view
    if (id) {
      const invoiceResult = await db.execute({
        sql: `SELECT inv.*,
              s.id as sale_id, s.salePrice as sale_price, s.paidAmount as sale_paid, s.pendingAmount as sale_pending,
              s.paymentStatus as sale_paymentStatus, s.warrantyMonths as sale_warranty, s.saleDate as sale_date,
              i.id as inv_item_id, i.brand, i.model, i.ram, i.storage, i.color, i.imeiNo,
              i."condition" as item_condition, i.buyPrice as item_buyPrice,
              buyer.id as buyer_id, buyer.name as buyer_name, buyer.phone as buyer_phone,
              buyer.address as buyer_address, buyer.aadharNo as buyer_aadhar, buyer.type as buyer_type,
              cust.id as cust_id, cust.name as cust_name, cust.phone as cust_phone,
              cust.address as cust_address, cust.aadharNo as cust_aadhar, cust.type as cust_type
              FROM Invoice inv
              JOIN Sale s ON s.id = inv.saleId
              JOIN Inventory i ON i.id = s.inventoryId
              JOIN Customer buyer ON buyer.id = s.buyerId
              JOIN Customer cust ON cust.id = inv.customerId
              WHERE inv.id = ?`,
        args: [id],
      });

      if (invoiceResult.rows.length === 0) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      const row = invoiceResult.rows[0];
      const shopResult = await db.execute('SELECT * FROM Shop LIMIT 1');
      const shop = shopResult.rows.length > 0 ? rowToShop(shopResult.rows[0]) : null;

      return NextResponse.json({
        invoice: {
          id: row.id,
          invoiceNo: row.invoiceNo,
          saleId: row.saleId,
          customerId: row.customerId,
          totalAmount: row.totalAmount,
          paidAmount: row.paidAmount,
          pendingAmount: row.pendingAmount,
          gstAmount: row.gstAmount,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          sale: {
            id: row.sale_id,
            inventoryId: row.inventoryId,
            buyerId: row.buyerId,
            salePrice: row.sale_price,
            paidAmount: row.sale_paid,
            pendingAmount: row.sale_pending,
            paymentStatus: row.sale_paymentStatus,
            warrantyMonths: row.sale_warranty,
            saleDate: row.sale_date,
            inventory: {
              id: row.inv_item_id,
              brand: row.brand,
              model: row.model,
              ram: row.ram,
              storage: row.storage,
              color: row.color,
              imeiNo: row.imeiNo,
              condition: row.item_condition,
              buyPrice: row.item_buyPrice,
            },
            buyer: {
              id: row.buyer_id,
              name: row.buyer_name,
              phone: row.buyer_phone,
              address: row.buyer_address,
              aadharNo: row.buyer_aadhar,
              type: row.buyer_type,
            },
          },
          customer: {
            id: row.cust_id,
            name: row.cust_name,
            phone: row.cust_phone,
            address: row.cust_address,
            aadharNo: row.cust_aadhar,
            type: row.cust_type,
          },
        },
        shop,
      });
    }

    // List invoices with search and pagination
    const conditions: string[] = [];
    const args: any[] = [];

    if (search) {
      conditions.push(`(inv.invoiceNo LIKE ? OR cust.name LIKE ? OR cust.phone LIKE ? OR i.brand LIKE ? OR i.model LIKE ?)`);
      args.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [invoicesResult, countResult] = await Promise.all([
      db.execute({
        sql: `SELECT inv.*,
              s.id as sale_id, s.salePrice as sale_price,
              i.id as inv_item_id, i.brand, i.model, i.imeiNo,
              buyer.id as buyer_id, buyer.name as buyer_name, buyer.phone as buyer_phone,
              cust.id as cust_id, cust.name as cust_name, cust.phone as cust_phone, cust.address as cust_address
              FROM Invoice inv
              JOIN Sale s ON s.id = inv.saleId
              JOIN Inventory i ON i.id = s.inventoryId
              JOIN Customer buyer ON buyer.id = s.buyerId
              JOIN Customer cust ON cust.id = inv.customerId
              ${whereClause}
              ORDER BY inv.createdAt DESC LIMIT ? OFFSET ?`,
        args: [...args, limit, offset],
      }),
      db.execute({
        sql: `SELECT COUNT(*) as count FROM Invoice inv
              JOIN Sale s ON s.id = inv.saleId
              JOIN Inventory i ON i.id = s.inventoryId
              JOIN Customer cust ON cust.id = inv.customerId
              ${whereClause}`,
        args,
      }),
    ]);

    const total = Number(countResult.rows[0].count);
    const invoices = invoicesResult.rows.map((row: any) => ({
      id: row.id,
      invoiceNo: row.invoiceNo,
      saleId: row.saleId,
      customerId: row.customerId,
      totalAmount: row.totalAmount,
      paidAmount: row.paidAmount,
      pendingAmount: row.pendingAmount,
      gstAmount: row.gstAmount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      sale: {
        id: row.sale_id,
        salePrice: row.sale_price,
        inventory: {
          id: row.inv_item_id,
          brand: row.brand,
          model: row.model,
          imeiNo: row.imeiNo,
        },
        buyer: {
          id: row.buyer_id,
          name: row.buyer_name,
          phone: row.buyer_phone,
        },
      },
      customer: {
        id: row.cust_id,
        name: row.cust_name,
        phone: row.cust_phone,
        address: row.cust_address,
      },
    }));

    return NextResponse.json({
      invoices,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch invoices';
    console.error('Invoices GET error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function rowToShop(row: any) {
  if (!row) return null;
  return {
    id: row.id, adminId: row.adminId, shopName: row.shopName,
    gstNo: row.gstNo, address: row.address, phone: row.phone,
    logo: row.logo, updatedAt: row.updatedAt,
  };
}
