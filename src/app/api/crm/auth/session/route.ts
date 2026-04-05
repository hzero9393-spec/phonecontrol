import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const adminId = request.headers.get('x-admin-id');
    if (!adminId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const admin = await db.admin.findUnique({
      where: { id: adminId },
      select: { id: true, username: true, role: true, fullName: true, mobile: true, email: true, theme: true },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 401 });
    }

    return NextResponse.json(admin);
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
