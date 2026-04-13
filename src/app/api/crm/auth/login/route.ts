import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  return globalForPrisma.prisma;
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    const hash = createHash('md5').update(password).digest('hex');
    const prisma = getPrisma();
    const admin = await prisma.admin.findUnique({ where: { username } });

    if (!admin || admin.password !== hash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    return NextResponse.json({
      id: admin.id,
      username: admin.username,
      role: admin.role,
      fullName: admin.fullName,
      mobile: admin.mobile,
      email: admin.email,
      theme: admin.theme,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
