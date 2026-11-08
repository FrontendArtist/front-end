/** «پرداخت نشد»: برگشت نور خروج در انتظار با علت — I11-W، route سروری. */
import { reverseNoorWithdrawalWithByeMoney } from '@/lib/byeMoneyNoorWithdrawals';
import { invalidBody, requireAdminJwt, respondByeMoneyResult } from '@/lib/admin/byeMoneyAdminRoute';

export async function POST(request, { params }) {
    const auth = await requireAdminJwt();
    if (auth.response) return auth.response;

    let body;
    try {
        body = await request.json();
    } catch {
        return invalidBody();
    }
    const { id } = await params;
    return respondByeMoneyResult(await reverseNoorWithdrawalWithByeMoney({
        jwt: auth.jwt, id, reason: typeof body?.reason === 'string' ? body.reason : '',
    }));
}
