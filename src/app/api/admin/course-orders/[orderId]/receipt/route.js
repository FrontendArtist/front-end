/**
 * @file src/app/api/admin/course-orders/[orderId]/receipt/route.js
 * @description رسید سفارش برای ادمین (I11-O) از route سروری (BND-07)؛ JWT فقط از نشست سروری.
 */

import { getAdminCourseOrderReceipt } from '@/lib/byeMoneyApi';
import { requireAdminJwt, respondByeMoneyResult } from '@/lib/admin/byeMoneyAdminRoute';

export async function GET(_request, { params }) {
    const auth = await requireAdminJwt();
    if (auth.response) return auth.response;

    const { orderId } = await params;
    const result = await getAdminCourseOrderReceipt({ jwt: auth.jwt, orderId });
    return respondByeMoneyResult(result);
}
