import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const db = getDb();

    const conditions: string[] = [];
    const args: any[] = [];

    if (search) {
      conditions.push(`(o.brand LIKE ? OR o.model LIKE ? OR c.name LIKE ? OR c.phone LIKE ? OR o.deliveryBy LIKE ?)`);
      args.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      conditions.push('o.status = ?');
      args.push(status);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [ordersResult, countResult] = await Promise.all([
      db.execute({
        sql: `SELECT o.*, c.id as customer_id, c.name as customer_name, c.phone as customer_phone
              FROM "Order" o
              LEFT JOIN Customer c ON c.id = o.customerId
              ${whereClause}
              ORDER BY o.orderDate DESC LIMIT ? OFFSET ?`,
        args: [...args, limit, offset],
      }),
      db.execute({
        sql: `SELECT COUNT(*) as count FROM "Order" o
              LEFT JOIN Customer c ON c.id = o.customerId
              ${whereClause}`,
        args,
      }),
    ]);

    const total = Number(countResult.rows[0].count);
    const orders = ordersResult.rows.map((row: any) => ({
      id: row.id,
      customerId: row.customerId,
      brand: row.brand,
      model: row.model,
      advanceAmount: row.advanceAmount,
      status: row.status,
      orderDate: row.orderDate,
      deliveryDate: row.deliveryDate,
      deliveryBy: row.deliveryBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      customer: {
        id: row.customer_id,
        name: row.customer_name,
        phone: row.customer_phone,
      },
    }));

    return NextResponse.json({
      orders, total, page, limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Orders GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, brand, model, advanceAmount, status, orderDate, deliveryDate, deliveryBy } = body;

    if (!customerId || !brand) {
      return NextResponse.json({ error: 'Customer and brand are required' }, { status: 400 });
    }

    const db = getDb();
    const id = 'ord-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    const orderDateStr = orderDate ? new Date(orderDate).toISOString() : now;
    const deliveryDateStr = deliveryDate ? new Date(deliveryDate).toISOString() : null;

    await db.execute({
      sql: `INSERT INTO "Order" (id, customerId, brand, model, advanceAmount, status, orderDate, deliveryDate, deliveryBy, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, customerId, brand || '', model || '',
        parseFloat(advanceAmount) || 0, status || 'pending',
        orderDateStr, deliveryDateStr, deliveryBy || '',
        now, now,
      ],
    });

    // Fetch with customer
    const result = await db.execute({
      sql: `SELECT o.*, c.id as customer_id, c.name as customer_name, c.phone as customer_phone
            FROM "Order" o
            LEFT JOIN Customer c ON c.id = o.customerId
            WHERE o.id = ?`,
      args: [id],
    });
    const row = result.rows[0];

    const order = {
      id: row.id,
      customerId: row.customerId,
      brand: row.brand,
      model: row.model,
      advanceAmount: row.advanceAmount,
      status: row.status,
      orderDate: row.orderDate,
      deliveryDate: row.deliveryDate,
      deliveryBy: row.deliveryBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      customer: {
        id: row.customer_id,
        name: row.customer_name,
        phone: row.customer_phone,
      },
    };

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Orders POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { customerId, brand, model, advanceAmount, status, orderDate, deliveryDate, deliveryBy } = body;
    const db = getDb();

    const existingResult = await db.execute({
      sql: 'SELECT id FROM "Order" WHERE id = ?',
      args: [id],
    });
    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const sets: string[] = [];
    const args: any[] = [];

    if (customerId) { sets.push('customerId = ?'); args.push(customerId); }
    if (brand !== undefined) { sets.push('brand = ?'); args.push(brand); }
    if (model !== undefined) { sets.push('model = ?'); args.push(model); }
    if (advanceAmount !== undefined) { sets.push('advanceAmount = ?'); args.push(parseFloat(advanceAmount)); }
    if (status) { sets.push('status = ?'); args.push(status); }
    if (orderDate) { sets.push('orderDate = ?'); args.push(new Date(orderDate).toISOString()); }
    if (deliveryDate !== undefined) { sets.push('deliveryDate = ?'); args.push(deliveryDate ? new Date(deliveryDate).toISOString() : null); }
    if (deliveryBy !== undefined) { sets.push('deliveryBy = ?'); args.push(deliveryBy); }

    sets.push("updatedAt = ?");
    args.push(new Date().toISOString());
    args.push(id);

    await db.execute({
      sql: `UPDATE "Order" SET ${sets.join(', ')} WHERE id = ?`,
      args,
    });

    const result = await db.execute({
      sql: `SELECT o.*, c.id as customer_id, c.name as customer_name, c.phone as customer_phone
            FROM "Order" o
            LEFT JOIN Customer c ON c.id = o.customerId
            WHERE o.id = ?`,
      args: [id],
    });
    const row = result.rows[0];

    const order = {
      id: row.id,
      customerId: row.customerId,
      brand: row.brand,
      model: row.model,
      advanceAmount: row.advanceAmount,
      status: row.status,
      orderDate: row.orderDate,
      deliveryDate: row.deliveryDate,
      deliveryBy: row.deliveryBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      customer: {
        id: row.customer_id,
        name: row.customer_name,
        phone: row.customer_phone,
      },
    };

    return NextResponse.json(order);
  } catch (error) {
    console.error('Orders PUT error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
