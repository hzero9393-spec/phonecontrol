import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createHash } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// GET /api/crm/profile — Fetch admin + shop info
export async function GET(request: NextRequest) {
  try {
    const adminId = request.headers.get('x-admin-id');
    if (!adminId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const admin = await db.admin.findUnique({
      where: { id: adminId },
      select: { id: true, username: true, role: true, fullName: true, mobile: true, email: true, theme: true, createdAt: true },
    });
    if (!admin) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });

    const shop = await db.shop.findUnique({ where: { adminId } });

    return NextResponse.json({ admin, shop });
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

    if (type === 'personal') {
      const { fullName, mobile, email } = data;
      const admin = await db.admin.update({
        where: { id: adminId },
        data: { fullName: fullName || undefined, mobile: mobile || undefined, email: email || undefined },
        select: { id: true, username: true, role: true, fullName: true, mobile: true, email: true },
      });
      return NextResponse.json({ success: true, admin });
    }

    if (type === 'password') {
      const { oldPassword, newPassword } = data;
      if (!oldPassword || !newPassword) {
        return NextResponse.json({ error: 'Both passwords required' }, { status: 400 });
      }
      if (newPassword.length < 4) {
        return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
      }

      const admin = await db.admin.findUnique({ where: { id: adminId } });
      if (!admin) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });

      const oldHash = createHash('md5').update(oldPassword).digest('hex');
      if (admin.password !== oldHash) {
        return NextResponse.json({ error: 'Old password is incorrect' }, { status: 401 });
      }

      const newHash = createHash('md5').update(newPassword).digest('hex');
      await db.admin.update({ where: { id: adminId }, data: { password: newHash } });
      return NextResponse.json({ success: true, message: 'Password changed successfully' });
    }

    if (type === 'shop') {
      const { shopName, gstNo, address, phone } = data;
      const existing = await db.shop.findUnique({ where: { adminId } });

      if (existing) {
        const shop = await db.shop.update({
          where: { adminId },
          data: { shopName: shopName || undefined, gstNo: gstNo || undefined, address: address || undefined, phone: phone || undefined },
        });
        return NextResponse.json({ success: true, shop });
      } else {
        const shop = await db.shop.create({
          data: { adminId, shopName: shopName || '', gstNo: gstNo || '', address: address || '', phone: phone || '' },
        });
        return NextResponse.json({ success: true, shop });
      }
    }

    if (type === 'photo') {
      const { imageData } = data;
      if (!imageData) return NextResponse.json({ error: 'No image data' }, { status: 400 });

      // Extract base64 data
      const matches = imageData.match(/^data:image\/(jpg|jpeg|png);base64,(.+)$/);
      if (!matches) return NextResponse.json({ error: 'Invalid image format. Only JPG/PNG allowed.' }, { status: 400 });

      const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      const buffer = Buffer.from(matches[2], 'base64');

      // Max 2MB
      if (buffer.length > 2 * 1024 * 1024) {
        return NextResponse.json({ error: 'Image too large. Max 2MB allowed.' }, { status: 400 });
      }

      // Save to public/profiles/
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
      await db.admin.update({ where: { id: adminId }, data: { theme: themeName } });
      return NextResponse.json({ success: true, theme: themeName });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Profile PUT error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
