import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/crm/customers/history?id=xxx
// Returns: phones sold to shop, phones bought from shop, pending payments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Customer id is required' }, { status: 400 });
    }

    const customer = await db.customer.findUnique({ where: { id } });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Phones they sold to shop (from inventory via sellerId)
    const soldToShop = await db.inventory.findMany({
      where: { sellerId: id },
      include: {
        sales: {
          select: { id: true, salePrice: true, saleDate: true },
        },
      },
      orderBy: { addedAt: 'desc' },
    });

    const totalSoldToShop = soldToShop.reduce((sum, item) => sum + item.buyPrice, 0);

    // Phones they bought from shop (from sales via buyerId)
    const boughtFromShop = await db.sale.findMany({
      where: { buyerId: id },
      include: {
        inventory: {
          select: { brand: true, model: true, imeiNo: true, condition: true },
        },
      },
      orderBy: { saleDate: 'desc' },
    });

    const totalBought = boughtFromShop.reduce((sum, s) => sum + s.salePrice, 0);
    const totalPaid = boughtFromShop.reduce((sum, s) => sum + s.paidAmount, 0);
    const totalPending = boughtFromShop.reduce((sum, s) => sum + s.pendingAmount, 0);

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        type: customer.type,
      },
      soldToShop: soldToShop.map((item) => ({
        id: item.id,
        brand: item.brand,
        model: item.model,
        imeiNo: item.imeiNo,
        condition: item.condition,
        buyPrice: item.buyPrice,
        status: item.status,
        addedAt: item.addedAt.toISOString().split('T')[0],
        soldToCustomer: item.sales.length > 0 ? {
          salePrice: item.sales[0].salePrice,
          saleDate: item.sales[0].saleDate.toISOString().split('T')[0],
        } : null,
      })),
      totalSoldToShop,
      boughtFromShop: boughtFromShop.map((sale) => ({
        id: sale.id,
        brand: sale.inventory.brand,
        model: sale.inventory.model,
        imeiNo: sale.inventory.imeiNo,
        condition: sale.inventory.condition,
        salePrice: sale.salePrice,
        paidAmount: sale.paidAmount,
        pendingAmount: sale.pendingAmount,
        paymentStatus: sale.paymentStatus,
        saleDate: sale.saleDate.toISOString().split('T')[0],
        warrantyMonths: sale.warrantyMonths,
      })),
      totalBought,
      totalPaid,
      totalPending,
    });
  } catch (error) {
    console.error('Customer History error:', error);
    return NextResponse.json({ error: 'Failed to fetch customer history' }, { status: 500 });
  }
}
