/**
 * @file src/app/api/admin/wallets/batch-balances/route.js
 * @description موجودی دسته‌ای کاربران برای فهرست کاربران و فرم سفارش دستی (BND-07)؛ JWT فقط از نشست سروری.
 */

import { getBatchBalancesWithByeMoney } from '@/lib/byeMoneyApi';
import { invalidBody, requireAdminJwt, respondByeMoneyResult } from '@/lib/admin/byeMoneyAdminRoute';

export async function POST(request) {
    const auth = await requireAdminJwt();
    if (auth.response) return auth.response;

    let body;
    try {
        body = await request.json();
    } catch {
        return invalidBody();
    }

    const result = await getBatchBalancesWithByeMoney({ userIds: body?.userIds, jwt: auth.jwt });
    return respondByeMoneyResult(result);
}
