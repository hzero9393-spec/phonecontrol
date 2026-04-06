import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createHash } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// GET /api/crm/profile — Fetch admin + shop info
export async function GET(request: NextRequest) {
  try {
    const adminId = request.headers.get('x-admin-id');
    if (!adminId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const db = getDb();
    const adminResult = await db.execute({
      sql: `SELECT id, username, role, fullName, mobile, email, theme, createdAt FROM Admin WHERE id = ?`,
      args: [adminId],
    });
    if (adminResult.rows.length === 0) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });

    const admin = adminResult.rows[0];

    const shopResult = await db.execute({
      sql: 'SELECT * FROM Shop WHERE adminId = ?',
      args: [adminId],
    });
    const shop = shopResult.rows.length > 0 ? shopResult.rows[0] : null;

    return NextResponse.json({
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
        fullName: admin.fullName,
        mobile: admin.mobile,
        email: admin.email,
        theme: admin.theme,
        createdAt: admin.createdAt,
      },
      shop: shop ? {
        id: shop.id,
        adminId: shop.adminId,
        shopName: shop.shopName,
        gstNo: shop.gstNo,
        address: shop.address,
        phone: shop.phone,
        logo: shop.logo,
        updatedAt: shop.updatedAt,
      } : null,
    });
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

// PUT /api/crm/profile — Update personal info
export async function PUT(request: NextRequest) {
  try {
    const adminId = request.headers.get('x-admin-id');
    if (!adminId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { type, ...data } = await request.json();
    const db = getDb();

    if (type === 'personal') {
      const { fullName, mobile, email } = data;
      const sets: string[] = [];
      const args: any[] = [];

      if (fullName) { sets.push('fullName = ?'); args.push(fullName); }
      if (mobile) { sets.push('mobile = ?'); args.push(mobile); }
      if (email) { sets.push('email = ?'); args.push(email); }

      if (sets.length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
      }

      sets.push("updatedAt = ?");
      args.push(new Date().toISOString());
      args.push(adminId);

      await db.execute({
        sql: `UPDATE Admin SET ${sets.join(', ')} WHERE id = ?`,
        args,
      });

      const result = await db.execute({
        sql: 'SELECT id, username, role, fullName, mobile, email FROM Admin WHERE id = ?',
        args: [adminId],
      });
      const admin = result.rows[0];
      return NextResponse.json({ success: true, admin: { id: admin.id, username: admin.username, role: admin.role, fullName: admin.fullName, mobile: admin.mobile, email: admin.email } });
    }

    if (type === 'password') {
      const { oldPassword, newPassword } = data;
      if (!oldPassword || !newPassword) {
        return NextResponse.json({ error: 'Both passwords required' }, { status: 400 });
      }
      if (newPassword.length < 4) {
        return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
      }

      const adminResult = await db.execute({
        sql: 'SELECT id, password FROM Admin WHERE id = ?',
        args: [adminId],
      });
      if (adminResult.rows.length === 0) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });

      const admin = adminResult.rows[0];
      const oldHash = createHash('md5').update(oldPassword).digest('hex');
      if (admin.password !== oldHash) {
        return NextResponse.json({ error: 'Old password is incorrect' }, { status: 401 });
      }

      const newHash = createHash('md5').update(newPassword).digest('hex');
      await db.execute({
        sql: 'UPDATE Admin SET password = ?, updatedAt = ? WHERE id = ?',
        args: [newHash, new Date().toISOString(), adminId],
      });
      return NextResponse.json({ success: true, message: 'Password changed successfully' });
    }

    if (type === 'shop') {
      const { shopName, gstNo, address, phone } = data;

      const existingResult = await db.execute({
        sql: 'SELECT id FROM Shop WHERE adminId = ?',
        args: [adminId],
      });

      if (existingResult.rows.length > 0) {
        const sets: string[] = [];
        const args: any[] = [];

        if (shopName) { sets.push('shopName = ?'); args.push(shopName); }
        if (gstNo) { sets.push('gstNo = ?'); args.push(gstNo); }
        if (address) { sets.push('address = ?'); args.push(address); }
        if (phone) { sets.push('phone = ?'); args.push(phone); }

        if (sets.length > 0) {
          sets.push("updatedAt = ?");
          args.push(new Date().toISOString());
          args.push(adminId);

          await db.execute({
            sql: `UPDATE Shop SET ${sets.join(', ')} WHERE adminId = ?`,
            args,
          });
        }

        const shopResult = await db.execute({
          sql: 'SELECT * FROM Shop WHERE adminId = ?',
          args: [adminId],
        });
        return NextResponse.json({ success: true, shop: shopResult.rows[0] });
      } else {
        const id = 'shop-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const now = new Date().toISOString();
        await db.execute({
          sql: `INSERT INTO Shop (id, adminId, shopName, gstNo, address, phone, logo, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [id, adminId, shopName || '', gstNo || '', address || '', phone || '', '', now],
        });

        const shopResult = await db.execute({
          sql: 'SELECT * FROM Shop WHERE id = ?',
          args: [id],
        });
        return NextResponse.json({ success: true, shop: shopResult.rows[0] });
      }
    }

    if (type === 'photo') {
      const { imageData } = data;
      if (!imageData) return NextResponse.json({ error: 'No image data' }, { status: 400 });

      const matches = imageData.match(/^data:image\/(jpg|jpeg|png);base64,(.+)$/);
      if (!matches) return NextResponse.json({ error: 'Invalid image format. Only JPG/PNG allowed.' }, { status: 400 });

      const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      const buffer = Buffer.from(matches[2], 'base64');

      if (buffer.length > 2 * 1024 * 1024) {
        return NextResponse.json({ error: 'Image too large. Max 2MB allowed.' }, { status: 400 });
      }

      const dir = path.join(process.cwd(), 'public', 'profiles');
      if (!existsSync(dir)) await mkdir(dir, { recursive: true });
      const filePath = path.join(dir, `${adminId}.${ext}`);
      await writeFile(filePath, buffer);

      return NextResponse.json({ success: true, photoUrl: `/profiles/${adminId}.${ext}` });
    }

    if (type === 'theme') {
      const { theme: themeName } = data;
      const allowed = ['theme-blue','theme-dark','theme-purple','theme-orange','theme-teal',
        'theme-rose','theme-indigo','theme-green','theme-slate','theme-amber','theme-cyan','theme-pink'];
      if (!allowed.includes(themeName)) {
        return NextResponse.json({ error: 'Invalid theme' }, { status: 400 });
      }
      await db.execute({
        sql: 'UPDATE Admin SET theme = ?, updatedAt = ? WHERE id = ?',
        args: [themeName, new Date().toISOString(), adminId],
      });
      return NextResponse.json({ success: true, theme: themeName });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Profile PUT error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
