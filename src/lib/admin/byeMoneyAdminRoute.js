/**
 * @file src/lib/admin/byeMoneyAdminRoute.js
 * @description کمک‌کارهای مشترک routeهای سروری نازک ادمین بای‌مانی (BND-07، I01)
 *
 * JWT ادمین فقط از نشست سروری خوانده می‌شود و به جاوااسکریپت مرورگر برگردانده نمی‌شود.
 * مجوز در Next تصمیم‌گیری نمی‌شود: ۴۰۱/۴۰۳ بای‌مانی همان‌طور برگردانده می‌شود.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const PASS_THROUGH_STATUSES = [400, 401, 403, 404, 409];

/**
 * @returns {Promise<{ jwt: string } | { response: Response }>}
 */
export async function requireAdminJwt() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt) {
        return { response: NextResponse.json({ success: false, error: 'دسترسی غیرمجاز' }, { status: 401 }) };
    }
    if (session.user.role?.type !== 'administrator') {
        return { response: NextResponse.json({ success: false, error: 'دسترسی غیرمجاز' }, { status: 403 }) };
    }
    return { jwt: session.user.jwt };
}

/** کد HTTP متناظر نتیجهٔ نرمال‌شدهٔ توابع `byeMoneyApi`؛ خطای شبکه یا ناشناخته 502. */
export function byeMoneyResultStatus(result) {
    if (result?.success) return 200;
    if (PASS_THROUGH_STATUSES.includes(result?.status)) return result.status;
    if (result?.badRequest) return 400;
    if (result?.unauthorized) return 401;
    if (result?.forbidden) return 403;
    if (result?.notFound) return 404;
    if (result?.conflict) return 409;
    return 502;
}

/** نتیجهٔ نرمال‌شده (بدون توکن) را با کد HTTP متناظر برمی‌گرداند. */
export function respondByeMoneyResult(result) {
    const status = byeMoneyResultStatus(result);
    return NextResponse.json({ ...result, status }, { status });
}

export const invalidBody = () =>
    NextResponse.json({ success: false, status: 400, error: 'بدنهٔ درخواست نامعتبر است.' }, { status: 400 });
