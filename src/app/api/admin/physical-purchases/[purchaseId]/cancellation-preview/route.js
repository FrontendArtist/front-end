import { getAdminPhysicalCancelPreview } from '@/lib/byeMoneyApi';
import { isGuid } from '@/lib/physicalCancel';
import { getCancelSession, unauthorized, badRequest, respondCancelResult } from '@/lib/physicalCancelRoute';

export async function GET(request, { params }) {
    const jwt = await getCancelSession({ admin: true });
    if (!jwt) return unauthorized();
    const { purchaseId } = await params;
    const quantity = Number(new URL(request.url).searchParams.get('quantity'));
    if (!isGuid(purchaseId) || !Number.isInteger(quantity) || quantity < 1) return badRequest();
    return respondCancelResult(await getAdminPhysicalCancelPreview({ jwt, purchaseId, quantity }));
}
