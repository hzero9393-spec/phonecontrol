import { getDb, toBool } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/crm/customers/history?id=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Customer id is required' }, { status: 400 });
    }

    const db = getDb();

    const customerResult = await db.execute({
      sql: 'SELECT id, name, phone, type FROM Customer WHERE id = ?',
      args: [id],
    });
    if (customerResult.rows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    const customer = customerResult.rows[0];

    // Phones they sold to shop (from inventory via sellerId)
    const soldToShopResult = await db.execute({
      sql: `SELECT i.*, s.id as saleId, s.salePrice as salePrice, s.saleDate as saleDate
            FROM Inventory i
            LEFT JOIN Sale s ON s.inventoryId = i.id
            WHERE i.sellerId = ?
            ORDER BY i.addedAt DESC`,
      args: [id],
    });

    const soldToShop = soldToShopResult.rows.map((row: any) => ({
      id: row.id,
      brand: row.brand,
      model: row.model,
      imeiNo: row.imeiNo,
      condition: row.condition,
      buyPrice: row.buyPrice,
      status: row.status,
      addedAt: String(row.addedAt).split('T')[0],
      soldToCustomer: row.saleId ? {
        salePrice: row.salePrice,
        saleDate: String(row.saleDate).split('T')[0],
      } : null,
    }));

    const totalSoldToShop = soldToShop.reduce((sum: number, item: any) => sum + item.buyPrice, 0);

    // Phones they bought from shop (from sales via buyerId)
    const boughtFromShopResult = await db.execute({
      sql: `SELECT s.*, i.brand, i.model, i.imeiNo, i."condition"
            FROM Sale s
            JOIN Inventory i ON i.id = s.inventoryId
            WHERE s.buyerId = ?
            ORDER BY s.saleDate DESC`,
      args: [id],
    });

    const boughtFromShop = boughtFromShopResult.rows.map((row: any) => ({
      id: row.id,
      brand: row.brand,
      model: row.model,
      imeiNo: row.imeiNo,
      condition: row.condition,
      salePrice: row.salePrice,
      paidAmount: row.paidAmount,
      pendingAmount: row.pendingAmount,
      paymentStatus: row.paymentStatus,
      saleDate: String(row.saleDate).split('T')[0],
      warrantyMonths: row.warrantyMonths,
    }));

    const totalBought = boughtFromShop.reduce((sum: number, s: any) => sum + s.salePrice, 0);
    const totalPaid = boughtFromShop.reduce((sum: number, s: any) => sum + s.paidAmount, 0);
    const totalPending = boughtFromShop.reduce((sum: number, s: any) => sum + s.pendingAmount, 0);

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        type: customer.type,
      },
      soldToShop,
      totalSoldToShop,
      boughtFromShop,
      totalBought,
      totalPaid,
      totalPending,
    });
  } catch (error) {
    console.error('Customer History error:', error);
    return NextResponse.json({ error: 'Failed to fetch customer history' }, { status: 500 });
  }
}
