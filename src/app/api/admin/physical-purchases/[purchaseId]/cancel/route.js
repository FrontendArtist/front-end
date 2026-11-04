import { cancelAdminPhysicalPurchase } from '@/lib/byeMoneyApi';
import { isGuid } from '@/lib/physicalCancel';
import { getCancelSession, unauthorized, badRequest, readCancelBody, respondCancelResult } from '@/lib/physicalCancelRoute';

export async function POST(request, { params }) {
    const jwt = await getCancelSession({ admin: true });
    if (!jwt) return unauthorized();
    const { purchaseId } = await params;
    const body = await readCancelBody(request, { withQuantity: true });
    if (!isGuid(purchaseId) || !body) return badRequest();
    return respondCancelResult(await cancelAdminPhysicalPurchase({ jwt, purchaseId, ...body }));
}
