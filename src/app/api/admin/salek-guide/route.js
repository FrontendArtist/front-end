/**
 * @file src/app/api/admin/salek-guide/route.js
 * @description API Route برای دریافت و بروزرسانی تنظیمات راهنمای سالک توسط ادمین
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getAdminSalekGuide, updateAdminSalekGuide } from '@/lib/admin/adminSalekGuideApi';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const guide = await getAdminSalekGuide(session.user.jwt);
    return NextResponse.json({ success: true, data: guide });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch salek guide settings' }, { status: 500 });
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

  const { isActive, message, subText, buttonText, buttonLink } = body;

  if (isActive && (!message || !message.trim())) {
    return NextResponse.json({ error: 'متن پیام راهنمای سالک الزامی است' }, { status: 400 });
  }

  const result = await updateAdminSalekGuide(session.user.jwt, {
    isActive,
    message: message ? message.trim() : '',
    subText: subText ? subText.trim() : '',
    buttonText: buttonText ? buttonText.trim() : '',
    buttonLink: buttonLink ? buttonLink.trim() : '',
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: result.data });
}
