import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: List customers with search and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;
    const db = getDb();

    let whereClause = '';
    const args: any[] = [];

    if (search) {
      whereClause = 'WHERE name LIKE ? OR phone LIKE ?';
      args.push(`%${search}%`, `%${search}%`);
    }

    const [customers, countResult] = await Promise.all([
      db.execute({
        sql: `SELECT * FROM Customer ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
        args: [...args, limit, offset],
      }),
      db.execute({
        sql: `SELECT COUNT(*) as count FROM Customer ${whereClause}`,
        args,
      }),
    ]);

    const total = Number(countResult.rows[0].count);

    return NextResponse.json({
      customers: customers.rows.map(rowToCustomer),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Customers GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

// POST: Create a new customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, address, aadharNo, type } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }

    const validTypes = ['seller', 'buyer', 'both'];
    const customerType = validTypes.includes(type) ? type : 'both';
    const id = 'cust-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    const db = getDb();

    await db.execute({
      sql: `INSERT INTO Customer (id, name, phone, address, aadharNo, type, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, name.trim(), phone?.trim() || '', address?.trim() || '', aadharNo?.trim() || '', customerType, now, now],
    });

    return NextResponse.json({
      customer: {
        id,
        name: name.trim(),
        phone: phone?.trim() || '',
        address: address?.trim() || '',
        aadharNo: aadharNo?.trim() || '',
        type: customerType,
        createdAt: now,
        updatedAt: now,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Customers POST error:', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}

// PUT: Update a customer by id
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Customer id is required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, phone, address, aadharNo, type } = body;
    const db = getDb();

    const existing = await db.execute({
      sql: 'SELECT id FROM Customer WHERE id = ?',
      args: [id],
    });
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const sets: string[] = [];
    const args: any[] = [];

    if (name !== undefined) { sets.push('name = ?'); args.push(name.trim()); }
    if (phone !== undefined) { sets.push('phone = ?'); args.push(phone.trim()); }
    if (address !== undefined) { sets.push('address = ?'); args.push(address.trim()); }
    if (aadharNo !== undefined) { sets.push('aadharNo = ?'); args.push(aadharNo.trim()); }
    if (type !== undefined && ['seller', 'buyer', 'both'].includes(type)) { sets.push('type = ?'); args.push(type); }

    if (sets.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    sets.push("updatedAt = ?");
    args.push(new Date().toISOString());
    args.push(id);

    await db.execute({
      sql: `UPDATE Customer SET ${sets.join(', ')} WHERE id = ?`,
      args,
    });

    const updated = await db.execute({
      sql: 'SELECT * FROM Customer WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ customer: rowToCustomer(updated.rows[0]) });
  } catch (error) {
    console.error('Customers PUT error:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

// DELETE: Delete a customer by id
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Customer id is required' }, { status: 400 });
    }

    const db = getDb();
    const existing = await db.execute({
      sql: 'SELECT id FROM Customer WHERE id = ?',
      args: [id],
    });
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    await db.execute({
      sql: 'DELETE FROM Customer WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Customers DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}

function rowToCustomer(row: any) {
  if (!row) return null;
  return {
    id: row.id as string,
    name: row.name as string,
    phone: row.phone as string,
    address: row.address as string,
    aadharNo: row.aadharNo as string,
    type: row.type as string,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  };
}
