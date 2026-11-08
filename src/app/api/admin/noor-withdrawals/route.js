/**
 * @file src/app/api/admin/noor-withdrawals/route.js
 * @description فهرست و ثبت خروج نور ادمین (I11-W) از route سروری؛ JWT فقط از نشست سروری (BND-07).
 * مجوز Noor.Withdraw را بای‌مانی اعمال می‌کند (۴۰۳ عبور داده می‌شود).
 */

import { createNoorWithdrawalWithByeMoney, listNoorWithdrawalsWithByeMoney } from '@/lib/byeMoneyNoorWithdrawals';
import { invalidBody, requireAdminJwt, respondByeMoneyResult } from '@/lib/admin/byeMoneyAdminRoute';
import { lookupPeople } from '@/lib/courseOrderSettlementRoute';

export async function GET(request) {
    const auth = await requireAdminJwt();
    if (auth.response) return auth.response;

    const params = new URL(request.url).searchParams;
    const result = await listNoorWithdrawalsWithByeMoney({
        jwt: auth.jwt,
        status: params.get('status') || undefined,
        userExternalId: params.get('userExternalId') || undefined,
        limit: params.get('limit') || undefined,
    });
    // DTO بای‌مانی فقط documentId دارد؛ نام از استرپی اضافه می‌شود و شکستش فقط نام را خالی می‌گذارد.
    if (result.success && Array.isArray(result.data)) {
        const people = await lookupPeople(auth.jwt, result.data.map((w) => w.userExternalId));
        result.data = result.data.map((w) => ({ ...w, userName: people.get(w.userExternalId)?.name ?? null }));
    }
    return respondByeMoneyResult(result);
}

export async function POST(request) {
    const auth = await requireAdminJwt();
    if (auth.response) return auth.response;

    let formData;
    try {
        formData = await request.formData();
    } catch {
        return invalidBody();
    }

    const fields = {};
    for (const [name, value] of formData.entries()) {
        if (typeof value === 'string') fields[name] = value;
    }
    const receipt = formData.get('receipt');
    return respondByeMoneyResult(await createNoorWithdrawalWithByeMoney({
        jwt: auth.jwt,
        fields,
        receipt: receipt && typeof receipt !== 'string' ? receipt : null,
    }));
}
