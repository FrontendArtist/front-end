import { resolveAdminPhysicalRestock } from '@/lib/byeMoneyApi';
import { isGuid } from '@/lib/physicalCancel';
import { getCancelSession, unauthorized, badRequest, respondCancelResult } from '@/lib/physicalCancelRoute';

export async function POST(_request, { params }) {
    const jwt = await getCancelSession({ admin: true });
    if (!jwt) return unauthorized();
    const { operationId } = await params;
    if (!isGuid(operationId)) return badRequest();
    return respondCancelResult(await resolveAdminPhysicalRestock({ jwt, operationId }));
}
