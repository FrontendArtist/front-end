/**
 * @file src/app/api/admin/orders/bulk-delete/route.js
 * @description حذف دسته‌جمعی سفارش‌های رد شده (canceled) یا در انتظار پرداخت (pending)
 *
 * 🔐 امنیت: فقط مدیران ارشد سیستم (administrator) مجاز به انجام این عملیات هستند.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

const STRAPI_BASE_URL = (process.env.NEXT_PUBLIC_STRAPI_API_URL || process.env.STRAPI_API_URL || 'http://localhost:1337')
    .replace(/\/+$/, '');
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

function getAuthHeader(session) {
    // احراز هویت با JWT کاربر ادمین لاگین‌شده
    if (session?.user?.jwt) {
        return `Bearer ${session.user.jwt}`;
    }
    if (STRAPI_TOKEN) {
        return `Bearer ${STRAPI_TOKEN}`;
    }
    return null;
}

export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role?.type !== 'administrator') {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    const authHeader = getAuthHeader(session);
    if (!authHeader) {
        return NextResponse.json({ error: 'توکن دسترسی معتبر یافت نشد' }, { status: 401 });
    }

    let body = {};
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'بدنه درخواست نامعتبر است' }, { status: 400 });
    }

    const { status } = body;
    if (status !== 'canceled' && status !== 'pending') {
        return NextResponse.json(
            { error: 'تنها سفارش‌های رد شده (canceled) یا در انتظار پرداخت (pending) قابل حذف گروهی هستند.' },
            { status: 400 }
        );
    }

    try {
        // ۱. واکشی تمام سفارش‌های دارای وضعیت درخواستی
        let page = 1;
        const pageSize = 100;
        let ordersToDelete = [];
        let hasMore = true;

        while (hasMore && page <= 10) {
            const endpoint = `${STRAPI_BASE_URL}/api/orders?filters[orderStatus][$eq]=${status}&fields[0]=id&fields[1]=documentId&pagination[page]=${page}&pagination[pageSize]=${pageSize}`;
            const res = await fetch(endpoint, {
                headers: { 'Content-Type': 'application/json', Authorization: authHeader },
                cache: 'no-store',
            });

            if (!res.ok) break;

            const resData = await res.json();
            const items = resData?.data || [];
            ordersToDelete.push(...items);

            const pageCount = resData?.meta?.pagination?.pageCount || 1;
            if (page >= pageCount || items.length < pageSize) {
                hasMore = false;
            } else {
                page++;
            }
        }

        if (ordersToDelete.length === 0) {
            return NextResponse.json({
                success: true,
                deletedCount: 0,
                message: 'هیچ سفارشی با این وضعیت برای حذف یافت نشد.',
            });
        }

        // ۲. حذف موازی سفارش‌ها از Strapi
        const deletePromises = ordersToDelete.map(async (order) => {
            const strapiId = order.documentId || order.id;
            try {
                const delRes = await fetch(`${STRAPI_BASE_URL}/api/orders/${strapiId}`, {
                    method: 'DELETE',
                    headers: { Authorization: authHeader },
                });
                return delRes.ok;
            } catch {
                return false;
            }
        });

        const results = await Promise.allSettled(deletePromises);
        const deletedCount = results.filter((r) => r.status === 'fulfilled' && r.value === true).length;

        const statusLabel = status === 'canceled' ? 'رد شده' : 'در انتظار پرداخت';

        return NextResponse.json({
            success: true,
            deletedCount,
            message: `تعداد ${deletedCount} سفارش ${statusLabel} با موفقیت حذف شدند.`,
        });
    } catch (err) {
        console.error('[Bulk Delete Orders Error]:', err);
        return NextResponse.json({ error: 'خطای داخلی سرور در حذف سفارش‌ها' }, { status: 500 });
    }
}
