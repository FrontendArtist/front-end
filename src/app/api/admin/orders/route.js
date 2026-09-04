/**
 * @file src/app/api/admin/orders/route.js
 * @description دریافت لیست سفارش‌ها با صفحه‌بندی (برای Lazy Loading در پنل ادمین)
 *
 * 🔐 امنیت: فقط ادمین‌های لاگین‌شده با توکن معتبر مجاز به دسترسی هستند.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getOrders } from '@/lib/admin/adminOrdersApi';

export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const startParam = searchParams.get('start');
        const limitParam = searchParams.get('limit');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

        const options = (startParam !== null && limitParam !== null)
            ? { start: parseInt(startParam, 10), limit: parseInt(limitParam, 10) }
            : { page, pageSize };

        const { orders, meta, error } = await getOrders(session.user.jwt, options);

        if (error) {
            return NextResponse.json({ error: 'خطا در دریافت سفارش‌ها از سرور' }, { status: 500 });
        }

        return NextResponse.json({ orders, meta });
    } catch (err) {
        console.error('[AdminOrdersAPI GET] Error:', err);
        return NextResponse.json({ error: 'خطای داخلی سرور' }, { status: 500 });
    }
}
