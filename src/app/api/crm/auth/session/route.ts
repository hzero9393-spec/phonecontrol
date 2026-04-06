import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminId = request.headers.get('x-admin-id');
    if (!adminId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const db = getDb();
    const result = await db.execute({
      sql: `SELECT id, username, role, fullName, mobile, email, theme FROM Admin WHERE id = ?`,
      args: [adminId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 401 });
    }

    const admin = result.rows[0];
    return NextResponse.json({
      id: admin.id as string,
      username: admin.username as string,
      role: admin.role as string,
      fullName: admin.fullName as string,
      mobile: admin.mobile as string,
      email: admin.email as string,
      theme: admin.theme as string,
    });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
