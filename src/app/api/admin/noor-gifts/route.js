/**
 * @file src/app/api/admin/noor-gifts/route.js
 * @description ثبت هدیهٔ نور ادمین در بای‌مانی از route سروری (BND-07)؛ JWT فقط از نشست سروری.
 */

import { sendNoorGiftWithByeMoney } from '@/lib/byeMoneyApi';
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

    const result = await sendNoorGiftWithByeMoney({
        externalUserIds: body?.externalUserIds,
        amountNoor: body?.amountNoor,
        reason: body?.reason,
        idempotencyKey: request.headers.get('Idempotency-Key'),
        jwt: auth.jwt,
    });
    return respondByeMoneyResult(result);
}
