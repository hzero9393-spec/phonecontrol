import { getDb, toBool, fromBool } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/crm/inventory - List inventory items with filters and pagination
// GET /api/crm/inventory?action=sellers - Get list of seller customers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Special action: fetch sellers
    if (action === 'sellers') {
      const db = getDb();
      const result = await db.execute({
        sql: `SELECT id, name, phone, type FROM Customer
              WHERE type = 'seller' OR type = 'both'
              ORDER BY name ASC`,
        args: [],
      });
      const sellers = result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        type: row.type,
      }));
      return NextResponse.json({ sellers });
    }

    // Standard inventory listing
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const condition = searchParams.get('condition') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;
    const db = getDb();

    // Build WHERE clause
    const conditions: string[] = [];
    const args: any[] = [];

    if (search) {
      conditions.push('(brand LIKE ? OR model LIKE ? OR imeiNo LIKE ?)');
      args.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      conditions.push('status = ?');
      args.push(status);
    }
    if (condition) {
      conditions.push('"condition" = ?');
      args.push(condition);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [itemsResult, countResult] = await Promise.all([
      db.execute({
        sql: `SELECT i.*, c.id as seller_id, c.name as seller_name, c.phone as seller_phone
              FROM Inventory i
              LEFT JOIN Customer c ON c.id = i.sellerId
              ${whereClause}
              ORDER BY i.addedAt DESC LIMIT ? OFFSET ?`,
        args: [...args, limit, offset],
      }),
      db.execute({
        sql: `SELECT COUNT(*) as count FROM Inventory i ${whereClause}`,
        args,
      }),
    ]);

    const total = Number(countResult.rows[0].count);
    const items = itemsResult.rows.map(rowToInventoryWithSeller);

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error('GET /api/crm/inventory error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory items' },
      { status: 500 }
    );
  }
}

// POST /api/crm/inventory - Create a new inventory item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      brand, model, ram, storage, color, imeiNo,
      condition: cond, status, sellerId, buyPrice,
      repairRequired, repairDetails, repairCost, repairStatus,
    } = body;

    if (!brand || !model) {
      return NextResponse.json({ error: 'Brand and model are required' }, { status: 400 });
    }

    const validConditions = ['average', 'good', 'poor'];
    if (cond && !validConditions.includes(cond)) {
      return NextResponse.json({ error: `Condition must be one of: ${validConditions.join(', ')}` }, { status: 400 });
    }

    const validStatuses = ['pending', 'complete', 'done'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: `Status must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const validRepairStatuses = ['none', 'pending', 'in_progress', 'completed'];
    if (repairStatus && !validRepairStatuses.includes(repairStatus)) {
      return NextResponse.json({ error: `Repair status must be one of: ${validRepairStatuses.join(', ')}` }, { status: 400 });
    }

    const db = getDb();

    // If sellerId is provided, verify the seller exists
    if (sellerId) {
      const sellerResult = await db.execute({
        sql: 'SELECT id FROM Customer WHERE id = ?',
        args: [sellerId],
      });
      if (sellerResult.rows.length === 0) {
        return NextResponse.json({ error: 'Seller not found' }, { status: 400 });
      }
    }

    const id = 'inv-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    const finalCondition = cond || 'good';
    const finalStatus = status || 'pending';
    const finalRepairStatus = repairStatus || (repairRequired ? 'pending' : 'none');

    await db.execute({
      sql: `INSERT INTO Inventory (id, brand, model, ram, storage, color, imeiNo, "condition", status, sellerId, buyPrice, repairRequired, repairDetails, repairCost, repairStatus, addedAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, brand.trim(), model.trim(), ram || '', storage || '', color || '', imeiNo || '',
        finalCondition, finalStatus, sellerId || null,
        buyPrice || 0, fromBool(repairRequired), repairDetails || '', repairCost || 0,
        finalRepairStatus, now, now,
      ],
    });

    // Fetch the created item with seller info
    const itemResult = await db.execute({
      sql: `SELECT i.*, c.id as seller_id, c.name as seller_name, c.phone as seller_phone
            FROM Inventory i
            LEFT JOIN Customer c ON c.id = i.sellerId
            WHERE i.id = ?`,
      args: [id],
    });

    return NextResponse.json({ item: rowToInventoryWithSeller(itemResult.rows[0]) }, { status: 201 });
  } catch (error: unknown) {
    console.error('POST /api/crm/inventory error:', error);
    return NextResponse.json({ error: 'Failed to create inventory item' }, { status: 500 });
  }
}

// PUT /api/crm/inventory?id=xxx - Update an inventory item
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Item id is required' }, { status: 400 });
    }

    const db = getDb();

    const existingResult = await db.execute({
      sql: 'SELECT id FROM Inventory WHERE id = ?',
      args: [id],
    });
    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      brand, model, ram, storage, color, imeiNo,
      condition: cond, status, sellerId, buyPrice,
      repairRequired, repairDetails, repairCost, repairStatus,
    } = body;

    const validConditions = ['average', 'good', 'poor'];
    if (cond && !validConditions.includes(cond)) {
      return NextResponse.json({ error: `Condition must be one of: ${validConditions.join(', ')}` }, { status: 400 });
    }

    const validStatuses = ['pending', 'complete', 'done'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: `Status must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const validRepairStatuses = ['none', 'pending', 'in_progress', 'completed'];
    if (repairStatus && !validRepairStatuses.includes(repairStatus)) {
      return NextResponse.json({ error: `Repair status must be one of: ${validRepairStatuses.join(', ')}` }, { status: 400 });
    }

    // If sellerId is provided, verify the seller exists
    if (sellerId) {
      const sellerResult = await db.execute({
        sql: 'SELECT id FROM Customer WHERE id = ?',
        args: [sellerId],
      });
      if (sellerResult.rows.length === 0) {
        return NextResponse.json({ error: 'Seller not found' }, { status: 400 });
      }
    }

    const sets: string[] = [];
    const args: any[] = [];

    if (brand !== undefined) { sets.push('brand = ?'); args.push(brand.trim()); }
    if (model !== undefined) { sets.push('model = ?'); args.push(model.trim()); }
    if (ram !== undefined) { sets.push('ram = ?'); args.push(ram); }
    if (storage !== undefined) { sets.push('storage = ?'); args.push(storage); }
    if (color !== undefined) { sets.push('color = ?'); args.push(color); }
    if (imeiNo !== undefined) { sets.push('imeiNo = ?'); args.push(imeiNo); }
    if (cond !== undefined) { sets.push('"condition" = ?'); args.push(cond); }
    if (status !== undefined) { sets.push('status = ?'); args.push(status); }
    if (sellerId !== undefined) { sets.push('sellerId = ?'); args.push(sellerId || null); }
    if (buyPrice !== undefined) { sets.push('buyPrice = ?'); args.push(buyPrice); }
    if (repairRequired !== undefined) { sets.push('repairRequired = ?'); args.push(fromBool(repairRequired)); }
    if (repairDetails !== undefined) { sets.push('repairDetails = ?'); args.push(repairDetails); }
    if (repairCost !== undefined) { sets.push('repairCost = ?'); args.push(repairCost); }
    if (repairStatus !== undefined) { sets.push('repairStatus = ?'); args.push(repairStatus); }

    sets.push("updatedAt = ?");
    args.push(new Date().toISOString());
    args.push(id);

    await db.execute({
      sql: `UPDATE Inventory SET ${sets.join(', ')} WHERE id = ?`,
      args,
    });

    const itemResult = await db.execute({
      sql: `SELECT i.*, c.id as seller_id, c.name as seller_name, c.phone as seller_phone
            FROM Inventory i
            LEFT JOIN Customer c ON c.id = i.sellerId
            WHERE i.id = ?`,
      args: [id],
    });

    return NextResponse.json({ item: rowToInventoryWithSeller(itemResult.rows[0]) });
  } catch (error: unknown) {
    console.error('PUT /api/crm/inventory error:', error);
    return NextResponse.json({ error: 'Failed to update inventory item' }, { status: 500 });
  }
}

// DELETE /api/crm/inventory?id=xxx - Delete an inventory item (only if not sold)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Item id is required' }, { status: 400 });
    }

    const db = getDb();

    const existingResult = await db.execute({
      sql: 'SELECT id FROM Inventory WHERE id = ?',
      args: [id],
    });
    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    // Prevent deletion if item has been sold
    const salesResult = await db.execute({
      sql: 'SELECT id FROM Sale WHERE inventoryId = ? LIMIT 1',
      args: [id],
    });
    if (salesResult.rows.length > 0) {
      return NextResponse.json({ error: 'Cannot delete this item because it has associated sale records' }, { status: 400 });
    }

    await db.execute({
      sql: 'DELETE FROM Inventory WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ message: 'Inventory item deleted successfully' });
  } catch (error: unknown) {
    console.error('DELETE /api/crm/inventory error:', error);
    return NextResponse.json({ error: 'Failed to delete inventory item' }, { status: 500 });
  }
}

function rowToInventoryWithSeller(row: any) {
  if (!row) return null;
  const seller = row.seller_id ? {
    id: row.seller_id,
    name: row.seller_name,
    phone: row.seller_phone,
  } : null;
  return {
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
    seller,
  };
}
