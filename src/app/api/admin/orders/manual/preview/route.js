/**
 * @file src/app/api/admin/orders/manual/preview/route.js
 * @description پیش‌نمایش قیمت سفارش دستی ادمین به‌نام ذینفع (بدون رزرو و اثر مالی)؛ قیمت فقط از quote استرپی
 */

import { NextResponse } from 'next/server';
import { STRAPI_API_URL } from '@/lib/api';
import { requireAdminJwt, invalidBody } from '@/lib/admin/byeMoneyAdminRoute';
import { parseManualOrderItems, resolveBeneficiary } from '@/lib/admin/manualOrderInput';

const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

export async function POST(request) {
    const auth = await requireAdminJwt();
    if (auth.response) return auth.response;

    let body;
    try {
        body = await request.json();
    } catch {
        return invalidBody();
    }

    const parsed = parseManualOrderItems(body?.items);
    if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const beneficiary = await resolveBeneficiary({
        strapiBaseUrl: STRAPI_API_URL, token: STRAPI_TOKEN || auth.jwt, userId: body?.userId,
    });
    if (beneficiary.error) return NextResponse.json({ error: beneficiary.error }, { status: beneficiary.status });

    try {
        const res = await fetch(`${STRAPI_API_URL}/api/course-carts/admin-preview`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${auth.jwt}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ beneficiaryExternalUserId: beneficiary.id, items: parsed.items }),
            cache: 'no-store',
            signal: request.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return NextResponse.json({
                error: data.error?.message || data.error || data.message || 'پیش‌نمایش قیمت ممکن نیست.',
                code: data.code || null,
                lineError: data.lineError || null,
            }, { status: res.status });
        }
        return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
        return NextResponse.json({ error: 'ارتباط با سرویس قیمت‌گذاری برقرار نشد.' }, { status: 503 });
    }
}
