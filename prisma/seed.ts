import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'
import { createHash } from 'crypto'

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL || 'file:./db/custom.db'

  if (dbUrl.startsWith('libsql://') || dbUrl.startsWith('https://')) {
    const libsql = createClient({
      url: dbUrl,
      authToken: process.env.DATABASE_AUTH_TOKEN || '',
    })
    const adapter = new PrismaLibSQL(libsql)
    return new PrismaClient({ adapter })
  }

  return new PrismaClient()
}

async function seed() {
  const prisma = createPrismaClient();
  
  try {
    // Check if master admin exists
    const existing = await prisma.admin.findUnique({ where: { username: 'goutamji100' } });
    
    if (!existing) {
      const hash = createHash('md5').update('goutamji100').digest('hex');
      await prisma.admin.create({
        data: {
          username: 'goutamji100',
          password: hash,
          role: 'master',
          fullName: 'Goutam Ji',
          theme: 'theme-blue',
        },
      });
      console.log('✅ Master admin created: goutamji100');
    } else {
      console.log('✅ Master admin already exists');
    }

    // Create default shop if not exists
    const shopExists = await prisma.shop.findFirst();
    if (!shopExists) {
      console.log('ℹ️ No shop found. Create one via Shop Settings after login.');
    }
  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
