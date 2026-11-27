/**
 * @file src/app/api/top-banner/route.js
 * @description API Route عمومی برای دریافت اطلاعات نوار اعلان بالای سایت
 */

import { getTopBanner } from '@/lib/topBannerApi';
import { NextResponse } from 'next/server';

export const revalidate = 3600;

export async function GET() {
  try {
    const banner = await getTopBanner();
    return NextResponse.json(
      {
        success: true,
        data: banner,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
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
