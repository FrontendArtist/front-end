/**
 * Popup Route Handler
 * @module app/api/popup/route
 */

import { getActivePopupMessage } from '@/lib/popupApi';

export const revalidate = 3600;

export async function GET() {
  try {
    const popup = await getActivePopupMessage();

    return Response.json(
      {
        success: true,
        data: popup,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: 'خطا در دریافت اطلاعات پاپ‌آپ',
        data: null,
      },
      { status: 500 }
    );
  }
}
