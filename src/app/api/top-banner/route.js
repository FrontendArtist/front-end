/**
 * @file src/app/api/top-banner/route.js
 * @description API Route عمومی برای دریافت اطلاعات نوار اعلان بالای سایت
 */

import { getTopBanner } from '@/lib/topBannerApi';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const banner = await getTopBanner();
    return NextResponse.json({
      success: true,
      data: banner,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'خطا در دریافت اطلاعات نوار اعلان',
        data: null,
      },
      { status: 500 }
    );
  }
}
