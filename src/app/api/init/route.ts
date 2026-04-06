import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS "Admin" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "username" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'admin',
  "fullName" TEXT NOT NULL DEFAULT '',
  "mobile" TEXT NOT NULL DEFAULT '',
  "email" TEXT NOT NULL DEFAULT '',
  "theme" TEXT NOT NULL DEFAULT 'theme-blue',
  "createdBy" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "Admin_username_key" ON "Admin"("username");

CREATE TABLE IF NOT EXISTS "Shop" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "adminId" TEXT NOT NULL,
  "shopName" TEXT NOT NULL DEFAULT '',
  "gstNo" TEXT NOT NULL DEFAULT '',
  "address" TEXT NOT NULL DEFAULT '',
  "phone" TEXT NOT NULL DEFAULT '',
  "logo" TEXT NOT NULL DEFAULT '',
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "Shop_adminId_key" ON "Shop"("adminId");

CREATE TABLE IF NOT EXISTS "Customer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL DEFAULT '',
  "address" TEXT NOT NULL DEFAULT '',
  "aadharNo" TEXT NOT NULL DEFAULT '',
  "type" TEXT NOT NULL DEFAULT 'both',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "Inventory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "brand" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "ram" TEXT NOT NULL DEFAULT '',
  "storage" TEXT NOT NULL DEFAULT '',
  "color" TEXT NOT NULL DEFAULT '',
  "imeiNo" TEXT NOT NULL DEFAULT '',
  "condition" TEXT NOT NULL DEFAULT 'good',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "sellerId" TEXT,
  "buyPrice" REAL NOT NULL DEFAULT 0,
  "repairRequired" BOOLEAN NOT NULL DEFAULT 0,
  "repairDetails" TEXT NOT NULL DEFAULT '',
  "repairCost" REAL NOT NULL DEFAULT 0,
  "repairStatus" TEXT NOT NULL DEFAULT 'none',
  "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "Sale" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "inventoryId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "salePrice" REAL NOT NULL DEFAULT 0,
  "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
  "paidAmount" REAL NOT NULL DEFAULT 0,
  "pendingAmount" REAL NOT NULL DEFAULT 0,
  "warrantyMonths" INTEGER NOT NULL DEFAULT 0,
  "saleDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "Invoice" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "invoiceNo" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "totalAmount" REAL NOT NULL DEFAULT 0,
  "paidAmount" REAL NOT NULL DEFAULT 0,
  "pendingAmount" REAL NOT NULL DEFAULT 0,
  "gstAmount" REAL NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_invoiceNo_key" ON "Invoice"("invoiceNo");

CREATE TABLE IF NOT EXISTS "Order" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "customerId" TEXT NOT NULL,
  "brand" TEXT NOT NULL DEFAULT '',
  "model" TEXT NOT NULL DEFAULT '',
  "advanceAmount" REAL NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "orderDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deliveryDate" DATETIME,
  "deliveryBy" TEXT NOT NULL DEFAULT '',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
`;

export async function GET() {
  try {
    const dbUrl = process.env.DATABASE_URL;
    const authToken = process.env.DATABASE_AUTH_TOKEN;

    if (!dbUrl) {
      return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 500 });
    }

    // Connect directly to Turso using libsql client
    const libsql = createClient({
      url: dbUrl,
      authToken: authToken || '',
    });

    // Execute all CREATE TABLE statements
    const statements = CREATE_TABLES_SQL.split(';').filter(s => s.trim());
    for (const sql of statements) {
      if (sql.trim()) {
        await libsql.execute(sql.trim());
      }
    }

    // Check if master admin exists
    const hash = createHash('md5').update('goutamji100').digest('hex');
    const existing = await libsql.execute({
      sql: 'SELECT id FROM Admin WHERE username = ?',
      args: ['goutamji100'],
    });

    if (existing.rows.length === 0) {
      // Create master admin
      await libsql.execute({
        sql: `INSERT INTO Admin (id, username, password, role, fullName, theme, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        args: [
          'master-' + Date.now(),
          'goutamji100',
          hash,
          'master',
          'Goutam Ji',
          'theme-blue',
        ],
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Database initialized successfully!',
      tables: ['Admin', 'Shop', 'Customer', 'Inventory', 'Sale', 'Invoice', 'Order']
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Init error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
