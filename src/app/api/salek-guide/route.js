/**
 * @file src/app/api/salek-guide/route.js
 * @description API Route عمومی برای دریافت تنظیمات داینامیک راهنمای سالک
 */

import { getSalekGuide } from '@/lib/salekGuideApi';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const guide = await getSalekGuide();
    return NextResponse.json({
      success: true,
      data: guide,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'خطا در دریافت تنظیمات راهنمای سالک',
        data: null,
      },
      { status: 500 }
    );
  }
}
