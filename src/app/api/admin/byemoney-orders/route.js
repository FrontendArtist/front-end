/**
 * @file src/app/api/admin/byemoney-orders/route.js
 * @description فهرست سفارش‌های بای‌مانی صفحهٔ «سفارش‌ها» (فقط GET؛ JWT فقط از نشست سروری، BND-07)
 *
 * query: tab، q، view=restock، start، limit و counts=1 برای افزودن شمارندهٔ تب‌ها.
 */

import { NextResponse } from 'next/server';
import { getByeMoneyAdminOrders, getByeMoneyOrderCounts, readOrderFilters } from '@/lib/admin/byeMoneyAdminOrders';
import { requireAdminJwt } from '@/lib/admin/byeMoneyAdminRoute';

export async function GET(request) {
    const auth = await requireAdminJwt();
    if (auth.response) return auth.response;
    const jwt = auth.jwt;

    try {
        const { searchParams } = new URL(request.url);
        const filters = readOrderFilters(searchParams);
        const start = Math.max(0, parseInt(searchParams.get('start') || '0', 10) || 0);
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));

        const list = await getByeMoneyAdminOrders(jwt, { ...filters, start, limit });
        const counts = searchParams.get('counts') === '1'
            ? await getByeMoneyOrderCounts(jwt, {
                q: filters.q,
                actionCount: filters.tab === 'action' && !filters.view ? list.total : undefined,
            })
            : undefined;

        return NextResponse.json({ ...list, counts });
    } catch (err) {
        console.error('[AdminCourseOrders GET] Error:', err);
        return NextResponse.json({ error: 'خطای داخلی سرور' }, { status: 500 });
    }
}
