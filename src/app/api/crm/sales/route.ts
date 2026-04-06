import { getDb, toBool } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ─── Price formatter ─────────────────────────────────────
function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── GET ─────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;
    const db = getDb();

    // Build WHERE clause
    const conditions: string[] = [];
    const args: any[] = [];

    if (search) {
      conditions.push(`(c.name LIKE ? OR c.phone LIKE ? OR i.brand LIKE ? OR i.model LIKE ? OR i.imeiNo LIKE ?)`);
      args.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [salesResult, countResult] = await Promise.all([
      db.execute({
        sql: `SELECT s.*,
              i.id as inv_id, i.brand as inv_brand, i.model as inv_model, i.ram as inv_ram,
              i.storage as inv_storage, i.color as inv_color, i.imeiNo as inv_imeiNo,
              i."condition" as inv_condition, i.buyPrice as inv_buyPrice, i.status as inv_status,
              c.id as buyer_id, c.name as buyer_name, c.phone as buyer_phone,
              c.address as buyer_address, c.type as buyer_type
              FROM Sale s
              JOIN Inventory i ON i.id = s.inventoryId
              JOIN Customer c ON c.id = s.buyerId
              ${whereClause}
              ORDER BY s.saleDate DESC LIMIT ? OFFSET ?`,
        args: [...args, limit, offset],
      }),
      db.execute({
        sql: `SELECT COUNT(*) as count FROM Sale s
              JOIN Inventory i ON i.id = s.inventoryId
              JOIN Customer c ON c.id = s.buyerId
              ${whereClause}`,
        args,
      }),
    ]);

    const total = Number(countResult.rows[0].count);

    // Get invoice info for each sale
    const saleIds = salesResult.rows.map((r: any) => r.id);
    let invoiceMap: Record<string, any[]> = {};
    if (saleIds.length > 0) {
      const placeholders = saleIds.map(() => '?').join(',');
      const invResult = await db.execute({
        sql: `SELECT id, invoiceNo, saleId FROM Invoice WHERE saleId IN (${placeholders})`,
        args: saleIds,
      });
      for (const inv of invResult.rows) {
        const sid = (inv as any).saleId;
        if (!invoiceMap[sid]) invoiceMap[sid] = [];
        invoiceMap[sid].push({ id: inv.id, invoiceNo: inv.invoiceNo });
      }
    }

    const sales = salesResult.rows.map((row: any) => ({
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
      inventory: {
        id: row.inv_id,
        brand: row.inv_brand,
        model: row.inv_model,
        ram: row.inv_ram,
        storage: row.inv_storage,
        color: row.inv_color,
        imeiNo: row.inv_imeiNo,
        condition: row.inv_condition,
        buyPrice: row.inv_buyPrice,
        status: row.inv_status,
      },
      buyer: {
        id: row.buyer_id,
        name: row.buyer_name,
        phone: row.buyer_phone,
        address: row.buyer_address,
        type: row.buyer_type,
      },
      invoices: invoiceMap[row.id] || [],
    }));

    return NextResponse.json({
      sales,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch sales';
    console.error('Sales GET error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST ────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      inventoryId, buyerId, salePrice, paymentStatus,
      paidAmount, pendingAmount, warrantyMonths, saleDate,
    } = body;

    if (!inventoryId || !buyerId || !salePrice) {
      return NextResponse.json({ error: 'inventoryId, buyerId, and salePrice are required' }, { status: 400 });
    }

    const validStatuses = ['full', 'partial', 'pending'];
    if (!validStatuses.includes(paymentStatus)) {
      return NextResponse.json({ error: `paymentStatus must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const db = getDb();

    // Generate invoice number: INV-YYYYMMDD-XXXX
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

    // Count today's invoices
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    const todayCountResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM Invoice WHERE createdAt >= ? AND createdAt < ?',
      args: [todayStart, todayEnd],
    });
    const todayInvoiceCount = Number(todayCountResult.rows[0].count);
    const seq = String(todayInvoiceCount + 1).padStart(4, '0');
    const invoiceNo = `INV-${dateStr}-${seq}`;

    const totalAmount = Number(salePrice);
    const gstAmount = Math.round(totalAmount * 0.18 * 100) / 100;
    const paid = Number(paidAmount || 0);
    const pending = Number(pendingAmount || totalAmount - paid);
    const saleDateStr = saleDate ? new Date(saleDate).toISOString() : new Date().toISOString();

    // Transaction: create sale + invoice + update inventory
    await db.execute('BEGIN');

    try {
      const saleId = 'sale-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      const saleNow = new Date().toISOString();

      await db.execute({
        sql: `INSERT INTO Sale (id, inventoryId, buyerId, salePrice, paymentStatus, paidAmount, pendingAmount, warrantyMonths, saleDate, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [saleId, inventoryId, buyerId, totalAmount, paymentStatus, paid, pending, warrantyMonths || 0, saleDateStr, saleNow, saleNow],
      });

      const invoiceId = 'invc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      await db.execute({
        sql: `INSERT INTO Invoice (id, invoiceNo, saleId, customerId, totalAmount, paidAmount, pendingAmount, gstAmount, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [invoiceId, invoiceNo, saleId, buyerId, totalAmount, paid, pending, gstAmount, saleNow, saleNow],
      });

      await db.execute({
        sql: 'UPDATE Inventory SET status = ?, updatedAt = ? WHERE id = ?',
        args: ['done', saleNow, inventoryId],
      });

      await db.execute('COMMIT');

      // Fetch the created sale with inventory and buyer info
      const saleResult = await db.execute({
        sql: `SELECT s.*, i.brand as inv_brand, i.model as inv_model, i.ram as inv_ram,
              i.storage as inv_storage, i.color as inv_color, i.imeiNo as inv_imeiNo,
              i."condition" as inv_condition, i.buyPrice as inv_buyPrice, i.status as inv_status,
              i.repairRequired as inv_repairRequired, i.repairDetails as inv_repairDetails,
              i.repairCost as inv_repairCost, i.repairStatus as inv_repairStatus,
              i.sellerId as inv_sellerId, i.addedAt as inv_addedAt, i.updatedAt as inv_updatedAt,
              c.id as buyer_cid, c.name as buyer_name, c.phone as buyer_phone,
              c.address as buyer_address, c.aadharNo as buyer_aadharNo, c.type as buyer_type
              FROM Sale s
              JOIN Inventory i ON i.id = s.inventoryId
              JOIN Customer c ON c.id = s.buyerId
              WHERE s.id = ?`,
        args: [saleId],
      });
      const saleRow = saleResult.rows[0];

      const sale = {
        id: saleRow.id,
        inventoryId: saleRow.inventoryId,
        buyerId: saleRow.buyerId,
        salePrice: saleRow.salePrice,
        paymentStatus: saleRow.paymentStatus,
        paidAmount: saleRow.paidAmount,
        pendingAmount: saleRow.pendingAmount,
        warrantyMonths: saleRow.warrantyMonths,
        saleDate: saleRow.saleDate,
        createdAt: saleRow.createdAt,
        updatedAt: saleRow.updatedAt,
        inventory: {
          id: saleRow.inventoryId,
          brand: saleRow.inv_brand,
          model: saleRow.inv_model,
          ram: saleRow.inv_ram,
          storage: saleRow.inv_storage,
          color: saleRow.inv_color,
          imeiNo: saleRow.inv_imeiNo,
          condition: saleRow.inv_condition,
          status: saleRow.inv_status,
          buyPrice: saleRow.inv_buyPrice,
          repairRequired: toBool(saleRow.inv_repairRequired),
          repairDetails: saleRow.inv_repairDetails,
          repairCost: saleRow.inv_repairCost,
          repairStatus: saleRow.inv_repairStatus,
          sellerId: saleRow.inv_sellerId,
          addedAt: saleRow.inv_addedAt,
          updatedAt: saleRow.inv_updatedAt,
        },
        buyer: {
          id: saleRow.buyer_cid,
          name: saleRow.buyer_name,
          phone: saleRow.buyer_phone,
          address: saleRow.buyer_address,
          aadharNo: saleRow.buyer_aadharNo,
          type: saleRow.buyer_type,
        },
      };

      const invoice = {
        id: invoiceId,
        invoiceNo,
        saleId: saleId,
        customerId: buyerId,
        totalAmount,
        paidAmount: paid,
        pendingAmount: pending,
        gstAmount,
        createdAt: saleNow,
        updatedAt: saleNow,
      };

      return NextResponse.json({ message: 'Sale created successfully', sale, invoice }, { status: 201 });
    } catch (txError) {
      await db.execute('ROLLBACK');
      throw txError;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create sale';
    console.error('Sales POST error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PUT ─────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Sale id is required as ?id=' }, { status: 400 });
    }

    const body = await request.json();
    const { salePrice, paymentStatus, paidAmount, pendingAmount, warrantyMonths, saleDate } = body;

    if (paymentStatus) {
      const validStatuses = ['full', 'partial', 'pending'];
      if (!validStatuses.includes(paymentStatus)) {
        return NextResponse.json({ error: `paymentStatus must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
      }
    }

    const db = getDb();

    // Check sale exists
    const existingResult = await db.execute({
      sql: 'SELECT * FROM Sale WHERE id = ?',
      args: [id],
    });
    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }
    const existing = existingResult.rows[0];

    // Update sale
    const sets: string[] = [];
    const args: any[] = [];

    if (salePrice !== undefined) { sets.push('salePrice = ?'); args.push(Number(salePrice)); }
    if (paymentStatus !== undefined) { sets.push('paymentStatus = ?'); args.push(paymentStatus); }
    if (paidAmount !== undefined) { sets.push('paidAmount = ?'); args.push(Number(paidAmount)); }
    if (pendingAmount !== undefined) { sets.push('pendingAmount = ?'); args.push(Number(pendingAmount)); }
    if (warrantyMonths !== undefined) { sets.push('warrantyMonths = ?'); args.push(Number(warrantyMonths)); }
    if (saleDate !== undefined) { sets.push('saleDate = ?'); args.push(new Date(saleDate).toISOString()); }

    sets.push("updatedAt = ?");
    args.push(new Date().toISOString());
    args.push(id);

    await db.execute('BEGIN');
    try {
      await db.execute({
        sql: `UPDATE Sale SET ${sets.join(', ')} WHERE id = ?`,
        args,
      });

      // Recalculate invoice values
      const newTotal = salePrice !== undefined ? Number(salePrice) : Number(existing.salePrice);
      const newPaid = paidAmount !== undefined ? Number(paidAmount) : Number(existing.paidAmount);
      const newPending = pendingAmount !== undefined ? Number(pendingAmount) : Number(existing.pendingAmount);
      const newGst = Math.round(newTotal * 0.18 * 100) / 100;

      await db.execute({
        sql: `UPDATE Invoice SET totalAmount = ?, paidAmount = ?, pendingAmount = ?, gstAmount = ?, updatedAt = ? WHERE saleId = ?`,
        args: [newTotal, newPaid, newPending, newGst, new Date().toISOString(), id],
      });

      await db.execute('COMMIT');
    } catch (txError) {
      await db.execute('ROLLBACK');
      throw txError;
    }

    // Fetch updated sale with full info
    const saleResult = await db.execute({
      sql: `SELECT s.*,
            i.brand as inv_brand, i.model as inv_model, i.ram as inv_ram,
            i.storage as inv_storage, i.color as inv_color, i.imeiNo as inv_imeiNo,
            i."condition" as inv_condition, i.buyPrice as inv_buyPrice, i.status as inv_status,
            i.repairRequired as inv_repairRequired, i.repairDetails as inv_repairDetails,
            i.repairCost as inv_repairCost, i.repairStatus as inv_repairStatus,
            i.sellerId as inv_sellerId, i.addedAt as inv_addedAt, i.updatedAt as inv_updatedAt,
            c.id as buyer_cid, c.name as buyer_name, c.phone as buyer_phone,
            c.address as buyer_address, c.aadharNo as buyer_aadharNo, c.type as buyer_type
            FROM Sale s
            JOIN Inventory i ON i.id = s.inventoryId
            JOIN Customer c ON c.id = s.buyerId
            WHERE s.id = ?`,
      args: [id],
    });
    const saleRow = saleResult.rows[0];

    // Get invoices
    const invResult = await db.execute({
      sql: 'SELECT id, invoiceNo, saleId, customerId, totalAmount, paidAmount, pendingAmount, gstAmount, createdAt, updatedAt FROM Invoice WHERE saleId = ?',
      args: [id],
    });

    const updatedSale = {
      id: saleRow.id,
      inventoryId: saleRow.inventoryId,
      buyerId: saleRow.buyerId,
      salePrice: saleRow.salePrice,
      paymentStatus: saleRow.paymentStatus,
      paidAmount: saleRow.paidAmount,
      pendingAmount: saleRow.pendingAmount,
      warrantyMonths: saleRow.warrantyMonths,
      saleDate: saleRow.saleDate,
      createdAt: saleRow.createdAt,
      updatedAt: saleRow.updatedAt,
      inventory: {
        id: saleRow.inventoryId,
        brand: saleRow.inv_brand,
        model: saleRow.inv_model,
        ram: saleRow.inv_ram,
        storage: saleRow.inv_storage,
        color: saleRow.inv_color,
        imeiNo: saleRow.inv_imeiNo,
        condition: saleRow.inv_condition,
        status: saleRow.inv_status,
        buyPrice: saleRow.inv_buyPrice,
        repairRequired: toBool(saleRow.inv_repairRequired),
        repairDetails: saleRow.inv_repairDetails,
        repairCost: saleRow.inv_repairCost,
        repairStatus: saleRow.inv_repairStatus,
        sellerId: saleRow.inv_sellerId,
        addedAt: saleRow.inv_addedAt,
        updatedAt: saleRow.inv_updatedAt,
      },
      buyer: {
        id: saleRow.buyer_cid,
        name: saleRow.buyer_name,
        phone: saleRow.buyer_phone,
        address: saleRow.buyer_address,
        aadharNo: saleRow.buyer_aadharNo,
        type: saleRow.buyer_type,
      },
      invoices: invResult.rows.map((r: any) => ({
        id: r.id,
        invoiceNo: r.invoiceNo,
        saleId: r.saleId,
        customerId: r.customerId,
        totalAmount: r.totalAmount,
        paidAmount: r.paidAmount,
        pendingAmount: r.pendingAmount,
        gstAmount: r.gstAmount,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    };

    return NextResponse.json({ message: 'Sale updated successfully', sale: updatedSale });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update sale';
    console.error('Sales PUT error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
