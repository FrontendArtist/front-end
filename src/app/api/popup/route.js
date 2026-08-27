/**
 * Popup Route Handler
 * @module app/api/popup/route
 */

import { getActivePopupMessage } from '@/lib/popupApi';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const popup = await getActivePopupMessage();

    return Response.json({
      success: true,
      data: popup,
    });
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
