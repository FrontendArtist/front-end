/** پیش‌نمایش دورهٔ جاری تسویهٔ سفارش‌های بای‌مانی (I11-S) — پروکسی سروری، با نام خریدار از استرپی. */
import { getCourseOrderSettlementPreview } from '@/lib/byeMoneyApi';
import {
    badRequest, getSettlementAdminJwt, readPaging, respondSettlementResult, unauthorized, withBuyerNames,
} from '@/lib/courseOrderSettlementRoute';

export async function GET(request) {
    const jwt = await getSettlementAdminJwt();
    if (!jwt) return unauthorized();
    const paging = readPaging(request);
    if (!paging) return badRequest();
    const result = await getCourseOrderSettlementPreview({ jwt, ...paging });
    if (result.success && result.data?.orders) {
        result.data.orders.items = await withBuyerNames(jwt, result.data.orders.items);
    }
    return respondSettlementResult(result);
}
