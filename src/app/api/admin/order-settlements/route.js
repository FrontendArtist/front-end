/** فهرست دوره‌ها (GET) و بستن دورهٔ جاری (POST) تسویهٔ سفارش‌های بای‌مانی (I11-S) — پروکسی سروری. */
import { closeCourseOrderSettlementPeriod, getCourseOrderSettlementPeriods } from '@/lib/byeMoneyApi';
import {
    badRequest, getSettlementAdminJwt, readCloseBody, readPaging, respondSettlementResult, unauthorized,
    withClosedByNames,
} from '@/lib/courseOrderSettlementRoute';

export async function GET(request) {
    const jwt = await getSettlementAdminJwt();
    if (!jwt) return unauthorized();
    const paging = readPaging(request);
    if (!paging) return badRequest();
    const result = await getCourseOrderSettlementPeriods({ jwt, ...paging });
    if (result.success && result.data) {
        result.data.items = await withClosedByNames(jwt, result.data.items);
    }
    return respondSettlementResult(result);
}

export async function POST(request) {
    const jwt = await getSettlementAdminJwt();
    if (!jwt) return unauthorized();
    let body;
    try { body = await request.json(); } catch { return badRequest(); }
    const input = readCloseBody(body);
    if (!input) return badRequest();
    return respondSettlementResult(await closeCourseOrderSettlementPeriod({ jwt, ...input }));
}
