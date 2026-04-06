import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminId = request.headers.get('x-admin-id');
    if (!adminId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const db = getDb();

    const requesterResult = await db.execute({
      sql: 'SELECT id, role FROM Admin WHERE id = ?',
      args: [adminId],
    });
    if (requesterResult.rows.length === 0 || requesterResult.rows[0].role !== 'master') {
      return NextResponse.json({ error: 'Access denied. Master role required.' }, { status: 403 });
    }

    const result = await db.execute({
      sql: `SELECT id, username, role, fullName, mobile, email, createdBy, createdAt, updatedAt
            FROM Admin ORDER BY createdAt DESC`,
      args: [],
    });

    const admins = result.rows.map((row: any) => ({
      id: row.id,
      username: row.username,
      role: row.role,
      fullName: row.fullName,
      mobile: row.mobile,
      email: row.email,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    return NextResponse.json(admins);
  } catch (error) {
    console.error('Admins GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminId = request.headers.get('x-admin-id');
    if (!adminId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const db = getDb();

    const requesterResult = await db.execute({
      sql: 'SELECT id, role FROM Admin WHERE id = ?',
      args: [adminId],
    });
    if (requesterResult.rows.length === 0 || requesterResult.rows[0].role !== 'master') {
      return NextResponse.json({ error: 'Access denied. Master role required.' }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, role, fullName, mobile, email } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const existingResult = await db.execute({
      sql: 'SELECT id FROM Admin WHERE username = ?',
      args: [username],
    });
    if (existingResult.rows.length > 0) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    const hash = createHash('md5').update(password).digest('hex');
    const id = 'admin-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO Admin (id, username, password, role, fullName, mobile, email, createdBy, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, username, hash, role || 'admin', fullName || '', mobile || '', email || '', adminId, now, now],
    });

    return NextResponse.json({
      id, username, role: role || 'admin', fullName: fullName || '',
      mobile: mobile || '', email: email || '', createdBy: adminId,
      createdAt: now, updatedAt: now,
    }, { status: 201 });
  } catch (error) {
    console.error('Admins POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminId = request.headers.get('x-admin-id');
    if (!adminId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const db = getDb();

    const requesterResult = await db.execute({
      sql: 'SELECT id, role FROM Admin WHERE id = ?',
      args: [adminId],
    });
    if (requesterResult.rows.length === 0 || requesterResult.rows[0].role !== 'master') {
      return NextResponse.json({ error: 'Access denied. Master role required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Admin ID is required' }, { status: 400 });
    }

    const existingResult = await db.execute({
      sql: 'SELECT id, username FROM Admin WHERE id = ?',
      args: [id],
    });
    if (existingResult.rows.length === 0) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }
    const existing = existingResult.rows[0];

    const body = await request.json();
    const { username, password, role, fullName, mobile, email } = body;

    // Check username uniqueness if changing
    if (username && username !== existing.username) {
      const duplicateResult = await db.execute({
        sql: 'SELECT id FROM Admin WHERE username = ?',
        args: [username],
      });
      if (duplicateResult.rows.length > 0) {
        return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
      }
    }

    const sets: string[] = [];
    const args: any[] = [];

    if (username !== undefined) { sets.push('username = ?'); args.push(username); }
    if (password) { sets.push('password = ?'); args.push(createHash('md5').update(password).digest('hex')); }
    if (role !== undefined) { sets.push('role = ?'); args.push(role); }
    if (fullName !== undefined) { sets.push('fullName = ?'); args.push(fullName); }
    if (mobile !== undefined) { sets.push('mobile = ?'); args.push(mobile); }
    if (email !== undefined) { sets.push('email = ?'); args.push(email); }

    sets.push("updatedAt = ?");
    args.push(new Date().toISOString());
    args.push(id);

    await db.execute({
      sql: `UPDATE Admin SET ${sets.join(', ')} WHERE id = ?`,
      args,
    });

    const result = await db.execute({
      sql: `SELECT id, username, role, fullName, mobile, email, createdBy, createdAt, updatedAt FROM Admin WHERE id = ?`,
      args: [id],
    });
    const admin = result.rows[0];

    return NextResponse.json({
      id: admin.id, username: admin.username, role: admin.role,
      fullName: admin.fullName, mobile: admin.mobile, email: admin.email,
      createdBy: admin.createdBy, createdAt: admin.createdAt, updatedAt: admin.updatedAt,
    });
  } catch (error) {
    console.error('Admins PUT error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminId = request.headers.get('x-admin-id');
    if (!adminId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const db = getDb();

    const requesterResult = await db.execute({
      sql: 'SELECT id, role FROM Admin WHERE id = ?',
      args: [adminId],
    });
    if (requesterResult.rows.length === 0 || requesterResult.rows[0].role !== 'master') {
      return NextResponse.json({ error: 'Access denied. Master role required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Admin ID is required' }, { status: 400 });
    }

    if (id === adminId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const targetResult = await db.execute({
      sql: 'SELECT id, role FROM Admin WHERE id = ?',
      args: [id],
    });
    if (targetResult.rows.length === 0) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    if (targetResult.rows[0].role === 'master') {
      return NextResponse.json({ error: 'Cannot delete master admin' }, { status: 400 });
    }

    await db.execute({
      sql: 'DELETE FROM Admin WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admins DELETE error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
