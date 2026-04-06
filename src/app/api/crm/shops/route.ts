import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId');
    const db = getDb();

    // Try to find shop settings
    let rows: any[] = [];

    if (adminId) {
      const result = await db.execute({
        sql: 'SELECT * FROM Shop WHERE adminId = ?',
        args: [adminId],
      });
      rows = result.rows;
    }

    // If not found, try to get the first record
    if (rows.length === 0) {
      const result = await db.execute('SELECT * FROM Shop LIMIT 1');
      rows = result.rows;
    }

    // If still no record, create a default one
    if (rows.length === 0) {
      const now = new Date().toISOString();
      await db.execute({
        sql: `INSERT INTO Shop (id, adminId, shopName, gstNo, address, phone, logo, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          'shop-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
          adminId || 'default',
          'My Mobile Shop',
          '',
          '',
          '',
          '',
          now,
        ],
      });

      const newResult = await db.execute('SELECT * FROM Shop LIMIT 1');
      return NextResponse.json(rowToShop(newResult.rows[0]));
    }

    return NextResponse.json(rowToShop(rows[0]));
  } catch (error) {
    console.error('Shop GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { shopName, gstNo, address, phone, logo, adminId } = body;
    const db = getDb();

    const existing = await db.execute({
      sql: 'SELECT id FROM Shop WHERE id = ?',
      args: [id],
    });
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Shop settings not found' }, { status: 404 });
    }

    // Build dynamic update
    const sets: string[] = [];
    const args: any[] = [];

    if (shopName !== undefined) { sets.push('shopName = ?'); args.push(shopName); }
    if (gstNo !== undefined) { sets.push('gstNo = ?'); args.push(gstNo); }
    if (address !== undefined) { sets.push('address = ?'); args.push(address); }
    if (phone !== undefined) { sets.push('phone = ?'); args.push(phone); }
    if (logo !== undefined) { sets.push('logo = ?'); args.push(logo); }
    if (adminId !== undefined) { sets.push('adminId = ?'); args.push(adminId); }

    if (sets.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    sets.push("updatedAt = ?");
    args.push(new Date().toISOString());
    args.push(id);

    await db.execute({
      sql: `UPDATE Shop SET ${sets.join(', ')} WHERE id = ?`,
      args,
    });

    const updated = await db.execute({
      sql: 'SELECT * FROM Shop WHERE id = ?',
      args: [id],
    });

    return NextResponse.json(rowToShop(updated.rows[0]));
  } catch (error) {
    console.error('Shop PUT error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function rowToShop(row: any) {
  if (!row) return null;
  return {
    id: row.id as string,
    adminId: row.adminId as string,
    shopName: row.shopName as string,
    gstNo: row.gstNo as string,
    address: row.address as string,
    phone: row.phone as string,
    logo: row.logo as string,
    updatedAt: row.updatedAt as string,
  };
}
