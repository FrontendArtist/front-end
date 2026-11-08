/**
 * @file src/app/api/admin/noor-withdrawals/refundable-topups/route.js
 * @description شارژهای تأییدشدهٔ یک کاربر برای انتخاب در «استرداد پرداخت تکراری» (I11-W)؛ JWT فقط از نشست سروری.
 */

import { listRefundableTopUpsWithByeMoney } from '@/lib/byeMoneyNoorWithdrawals';
import { requireAdminJwt, respondByeMoneyResult } from '@/lib/admin/byeMoneyAdminRoute';

export async function GET(request) {
    const auth = await requireAdminJwt();
    if (auth.response) return auth.response;

    const userExternalId = new URL(request.url).searchParams.get('userExternalId') || '';
    return respondByeMoneyResult(await listRefundableTopUpsWithByeMoney({ jwt: auth.jwt, userExternalId }));
}
