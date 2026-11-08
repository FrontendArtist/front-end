/**
 * @file src/app/api/admin/noor-withdrawals/conversion-rate/route.js
 * @description نرخ فعلی (ریال به ازای هر نور) برای معادل تخمینی فرم خروج نور؛ فقط خواندنی و بدون نرخ حدسی.
 */

import { getConversionRateWithByeMoney } from '@/lib/byeMoneyApi';
import { requireAdminJwt, respondByeMoneyResult } from '@/lib/admin/byeMoneyAdminRoute';

export async function GET() {
    const auth = await requireAdminJwt();
    if (auth.response) return auth.response;

    const { success, rialPerNoor, error } = await getConversionRateWithByeMoney({ jwt: auth.jwt });
    return respondByeMoneyResult(success ? { success, rialPerNoor } : { success: false, error });
}
