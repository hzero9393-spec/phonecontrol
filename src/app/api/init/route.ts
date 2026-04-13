import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  return globalForPrisma.prisma;
}

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
    }

    const prisma = getPrisma();
    const hash = createHash('md5').update('goutamji100').digest('hex');
    const existing = await prisma.admin.findUnique({
      where: { username: 'goutamji100' },
    });

    if (!existing) {
      await prisma.admin.create({
        data: {
          username: 'goutamji100',
          password: hash,
          role: 'master',
          fullName: 'Goutam Ji',
          theme: 'theme-blue',
        },
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Database initialized successfully using Prisma on PostgreSQL.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Init error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
