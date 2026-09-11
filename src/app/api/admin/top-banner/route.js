/**
 * @file src/app/api/admin/top-banner/route.js
 * @description API Route برای دریافت و بروزرسانی تنظیمات نوار اعلان توسط ادمین
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getAdminTopBanner, updateAdminTopBanner } from '@/lib/admin/adminTopBannerApi';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const banner = await getAdminTopBanner(session.user.jwt);
    return NextResponse.json({ success: true, data: banner });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch banner settings' }, { status: 500 });
  }
}

export async function PUT(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { isActive, text, buttonText, buttonLink, badgeText, theme, canDismiss } = body;

  if (isActive && (!text || !text.trim())) {
    return NextResponse.json({ error: 'متن نوار اعلان الزامی است' }, { status: 400 });
  }

  const result = await updateAdminTopBanner(session.user.jwt, {
    isActive,
    text: text ? text.trim() : '',
    buttonText: buttonText ? buttonText.trim() : '',
    buttonLink: buttonLink ? buttonLink.trim() : '',
    badgeText: badgeText ? badgeText.trim() : '',
    theme: theme || 'gold',
    canDismiss: canDismiss !== false,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: result.data });
}
