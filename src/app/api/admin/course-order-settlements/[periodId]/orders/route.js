/** سفارش‌های یک دورهٔ بسته‌شدهٔ تسویه (I11-S) — پروکسی سروری، با نام خریدار از استرپی. */
import { getCourseOrderSettlementPeriodOrders } from '@/lib/byeMoneyApi';
import {
    badRequest, getSettlementAdminJwt, isPeriodId, readPaging, respondSettlementResult, unauthorized, withBuyerNames,
} from '@/lib/courseOrderSettlementRoute';

export async function GET(request, { params }) {
    const jwt = await getSettlementAdminJwt();
    if (!jwt) return unauthorized();
    const { periodId } = await params;
    const paging = readPaging(request);
    if (!isPeriodId(periodId) || !paging) return badRequest();
    const result = await getCourseOrderSettlementPeriodOrders({ jwt, periodId, ...paging });
    if (result.success && result.data) {
        result.data.items = await withBuyerNames(jwt, result.data.items);
    }
    return respondSettlementResult(result);
}
