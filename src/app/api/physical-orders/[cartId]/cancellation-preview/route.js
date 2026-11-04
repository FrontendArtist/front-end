import { getMyPhysicalCancelPreview } from '@/lib/byeMoneyApi';
import { isGuid } from '@/lib/physicalCancel';
import { getCancelSession, unauthorized, badRequest, respondCancelResult } from '@/lib/physicalCancelRoute';

export async function GET(request, { params }) {
    const jwt = await getCancelSession({ admin: false });
    if (!jwt) return unauthorized();
    const { cartId } = await params;
    if (!isGuid(cartId)) return badRequest();
    return respondCancelResult(await getMyPhysicalCancelPreview({ jwt, cartId }));
}
