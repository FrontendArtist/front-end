/**
 * @file src/app/api/admin/settlements/route.js
 * @description مدیریت دوره‌های تسویه مالی با فروشندگان – ادمین
 *
 * 🔐 امنیت: فقط مدیران معتبر (Administrator) مجاز به فراخوانی هستند.
 * 🛡️ عدم تداخل: سفارش‌های کاربران بدون تغییر در وضعیت پرداخت باقی مانده و صرفاً به دوره تسویه منتسب می‌شوند.
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

/**
 * GET /api/admin/settlements
 * دریافت لیست تمام دوره‌های تسویه ثبت شده همراه با اطلاعات خلاصه
 */
export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role?.type !== 'administrator') {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    const authHeader = getAuthHeader(session);
    if (!authHeader) {
        return NextResponse.json({ error: 'توکن دسترسی معتبر یافت نشد' }, { status: 401 });
    }

    try {
        const endpoint = `${STRAPI_BASE_URL}/api/settlements?sort[0]=settledAt:desc&pagination[pageSize]=100`;
        const res = await fetch(endpoint, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: authHeader,
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return NextResponse.json(
                { error: err?.error?.message || 'خطا در دریافت لیست تسویه‌ها از سرور' },
                { status: res.status }
            );
        }

        const data = await res.json();
        const rawList = Array.isArray(data?.data) ? data.data : [];

        const settlements = rawList.map((item) => {
            const attrs = item.attributes || item;
            return {
                id: item.id,
                documentId: item.documentId || String(item.id),
                title: attrs.title || `دوره تسویه شماره ${attrs.periodNumber || item.id}`,
                periodNumber: attrs.periodNumber ?? item.id,
                settledAt: attrs.settledAt || attrs.createdAt,
                ordersCount: Number(attrs.ordersCount || 0),
                totalAmount: Number(attrs.totalAmount || 0),
                notes: attrs.notes || '',
            };
        });

        return NextResponse.json({ settlements, meta: data?.meta || null });
    } catch (err) {
        console.error('[Admin Settlements GET] Error:', err);
        return NextResponse.json({ error: 'خطای داخلی در برقراری ارتباط با سرور' }, { status: 500 });
    }
}

/**
 * POST /api/admin/settlements
 * بستن دوره مالی جاری و آرشیو سفارش‌های پرداخت‌شده
 */
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
        body = {};
    }

    try {
        // ۱. دریافت تمام سفارش‌های تسویه‌نشده دوره جاری
        const fieldsParams = 'fields[0]=totalPrice&fields[1]=orderStatus&fields[2]=paymentStatus&fields[3]=discountAmount&fields[4]=originalTotalPrice&fields[5]=settledAt&fields[6]=documentId';
        const pageSize = 100;
        let page = 1;
        let allUnsettled = [];
        let hasMorePages = true;

        while (hasMorePages && page <= 10) {
            const url = `${STRAPI_BASE_URL}/api/orders?${fieldsParams}&filters[settledAt][$null]=true&pagination[page]=${page}&pagination[pageSize]=${pageSize}`;
            const r = await fetch(url, {
                headers: { 'Content-Type': 'application/json', Authorization: authHeader },
                cache: 'no-store',
            });
            if (!r.ok) break;
            const resData = await r.json();
            const items = resData?.data || [];
            allUnsettled.push(...items);

            const pageCount = resData?.meta?.pagination?.pageCount || 1;
            if (page >= pageCount || items.length < pageSize) {
                hasMorePages = false;
            } else {
                page++;
            }
        }

        // ۲. فیلتر فقط سفارش‌های تأیید شده / پرداخت‌شده
        const confirmedStatuses = ['paid', 'shipped', 'delivered'];
        const eligibleOrders = allUnsettled.filter((order) => {
            const attrs = order.attributes || order;
            // اطمینان از اینکه قبلاً تسویه نشده باشد
            if (attrs.settledAt || attrs.settlement) return false;

            const oStatus = (attrs.orderStatus || '').trim().toLowerCase();
            const pStatus = (attrs.paymentStatus || '').trim().toLowerCase();
            return pStatus === 'paid' || confirmedStatuses.includes(oStatus);
        });

        if (eligibleOrders.length === 0) {
            return NextResponse.json(
                { error: 'هیچ سفارش پرداخت‌شده و واجد شرایطی برای تسویه در دوره جاری وجود ندارد.' },
                { status: 400 }
            );
        }

        // ۳. محاسبه دقیق درآمد و تعداد
        let totalRevenue = 0;
        for (const order of eligibleOrders) {
            const attrs = order.attributes || order;
            let paidAmount = Number(attrs.totalPrice ?? 0);
            const discount = Number(attrs.discountAmount ?? 0);
            const original = attrs.originalTotalPrice !== null && attrs.originalTotalPrice !== undefined
                ? Number(attrs.originalTotalPrice)
                : null;

            if (discount > 0 && original !== null) {
                paidAmount = Math.min(paidAmount, Math.max(0, original - discount));
            }
            totalRevenue += Number(paidAmount || 0);
        }

        // ۴. دریافت تعداد دوره‌های قبلی برای شماره‌گذاری دوره
        let nextPeriodNumber = 1;
        try {
            const countRes = await fetch(`${STRAPI_BASE_URL}/api/settlements?pagination[limit]=1`, {
                headers: { Authorization: authHeader },
                cache: 'no-store',
            });
            if (countRes.ok) {
                const countData = await countRes.json();
                nextPeriodNumber = (countData?.meta?.pagination?.total || 0) + 1;
            }
        } catch (e) {
            console.warn('[Admin Settlements] Could not fetch period count:', e);
        }

        const now = new Date();
        const formattedDate = new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(now);

        const title = (body.title && body.title.trim())
            ? body.title.trim()
            : `دوره تسویه شماره ${nextPeriodNumber} — ${formattedDate}`;

        const notes = body.notes ? String(body.notes).trim() : '';

        // ۵. ایجاد سند تسویه در Strapi
        const createRes = await fetch(`${STRAPI_BASE_URL}/api/settlements`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: authHeader,
            },
            body: JSON.stringify({
                data: {
                    title,
                    periodNumber: nextPeriodNumber,
                    settledAt: now.toISOString(),
                    ordersCount: eligibleOrders.length,
                    totalAmount: totalRevenue,
                    notes,
                },
            }),
        });

        if (!createRes.ok) {
            const errData = await createRes.json().catch(() => ({}));
            console.error('[Admin Settlements POST] Strapi creation failed:', errData);
            return NextResponse.json(
                { error: errData?.error?.message || 'خطا در ثبت سند تسویه در سرور' },
                { status: createRes.status }
            );
        }

        const createdData = await createRes.json();
        const createdSettlement = createdData?.data || {};
        const settlementId = createdSettlement.id;
        const settlementDocId = createdSettlement.documentId || settlementId;

        // ۶. بروزرسانی سفارش‌ها و انتساب به دوره تسویه
        const updatePromises = eligibleOrders.map((order) => {
            const orderDocId = order.documentId || order.id;
            return fetch(`${STRAPI_BASE_URL}/api/orders/${orderDocId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: authHeader,
                },
                body: JSON.stringify({
                    data: {
                        settledAt: now.toISOString(),
                        settlement: settlementDocId || settlementId,
                    },
                }),
            });
        });

        await Promise.allSettled(updatePromises);

        return NextResponse.json({
            success: true,
            settlement: {
                id: settlementId,
                documentId: settlementDocId,
                title,
                periodNumber: nextPeriodNumber,
                settledAt: now.toISOString(),
                ordersCount: eligibleOrders.length,
                totalAmount: totalRevenue,
                notes,
            },
        });
    } catch (err) {
        console.error('[Admin Settlements POST] Error:', err);
        return NextResponse.json({ error: 'خطای غیرمنتظره در ثبت دوره تسویه' }, { status: 500 });
    }
}
