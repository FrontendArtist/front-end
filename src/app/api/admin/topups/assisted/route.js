/**
 * @file src/app/api/admin/topups/assisted/route.js
 * @description ثبت شارژ کارت‌به‌کارت ادمین به‌نیابت از کاربر از route سروری (BND-07)؛ JWT فقط از نشست سروری.
 * بدنه multipart است تا تصویر فیش بدون تغییر به بای‌مانی برسد.
 */

import { createAdminAssistedTopUpWithByeMoney } from '@/lib/byeMoneyApi';
import { invalidBody, requireAdminJwt, respondByeMoneyResult } from '@/lib/admin/byeMoneyAdminRoute';

const text = (formData, name) => {
    const value = formData.get(name);
    return typeof value === 'string' ? value : undefined;
};

export async function POST(request) {
    const auth = await requireAdminJwt();
    if (auth.response) return auth.response;

    let formData;
    try {
        formData = await request.formData();
    } catch {
        return invalidBody();
    }

    const receipt = formData.get('receipt');
    const result = await createAdminAssistedTopUpWithByeMoney({
        beneficiaryExternalUserId: text(formData, 'beneficiaryExternalUserId'),
        amountToman: text(formData, 'amountToman'),
        amountRial: text(formData, 'amountRial'),
        receipt: receipt && typeof receipt !== 'string' ? receipt : null,
        externalTransactionId: text(formData, 'externalTransactionId'),
        idempotencyKey: request.headers.get('Idempotency-Key'),
        jwt: auth.jwt,
    });
    return respondByeMoneyResult(result);
}
