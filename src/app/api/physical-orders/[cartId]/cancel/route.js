import { cancelMyPhysicalOrder } from '@/lib/byeMoneyApi';
import { isGuid } from '@/lib/physicalCancel';
import { getCancelSession, unauthorized, badRequest, readCancelBody, respondCancelResult } from '@/lib/physicalCancelRoute';

// هویت از JWT نشست و مبلغ از سرور می‌آید؛ بدنه فقط operationId و علت دارد.
export async function POST(request, { params }) {
    const jwt = await getCancelSession({ admin: false });
    if (!jwt) return unauthorized();
    const { cartId } = await params;
    const body = await readCancelBody(request, { withQuantity: false });
    if (!isGuid(cartId) || !body) return badRequest();
    return respondCancelResult(await cancelMyPhysicalOrder({ jwt, cartId, ...body }));
}
