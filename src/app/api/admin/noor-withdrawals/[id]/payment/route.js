/** ثبت پرداخت (شناسهٔ پرداخت + فیش) روی خروج نور در انتظار — I11-W، route سروری. */
import { markNoorWithdrawalPaidWithByeMoney } from '@/lib/byeMoneyNoorWithdrawals';
import { invalidBody, requireAdminJwt, respondByeMoneyResult } from '@/lib/admin/byeMoneyAdminRoute';

export async function POST(request, { params }) {
    const auth = await requireAdminJwt();
    if (auth.response) return auth.response;

    let formData;
    try {
        formData = await request.formData();
    } catch {
        return invalidBody();
    }
    const { id } = await params;
    const reference = formData.get('paymentReference');
    const receipt = formData.get('receipt');
    return respondByeMoneyResult(await markNoorWithdrawalPaidWithByeMoney({
        jwt: auth.jwt,
        id,
        paymentReference: typeof reference === 'string' ? reference : '',
        receipt: receipt && typeof receipt !== 'string' ? receipt : null,
    }));
}
