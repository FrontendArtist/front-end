/** نمایش فیش واریز خروج نور (تصویر) — I11-W، route سروری؛ مرورگر فقط با کوکی نشست آن را باز می‌کند. */
import { NextResponse } from 'next/server';
import { getNoorWithdrawalReceiptWithByeMoney } from '@/lib/byeMoneyNoorWithdrawals';
import { byeMoneyResultStatus, requireAdminJwt } from '@/lib/admin/byeMoneyAdminRoute';

export async function GET(_request, { params }) {
    const auth = await requireAdminJwt();
    if (auth.response) return auth.response;

    const { id } = await params;
    const result = await getNoorWithdrawalReceiptWithByeMoney({ jwt: auth.jwt, id });
    if (!result.success) {
        const status = byeMoneyResultStatus(result);
        return NextResponse.json({ ...result, status }, { status });
    }
    return new NextResponse(result.data.body, {
        status: 200,
        headers: { 'Content-Type': result.data.contentType, 'Cache-Control': 'private, no-store' },
    });
}
