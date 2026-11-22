/**
 * @file src/app/api/admin/physical-purchases/[purchaseId]/shipments/refresh/route.js
 * @description پروکسی سروریِ بررسی وضعیت مرسوله (SHIP-FIX-1 / BND-07)
 *
 * بای‌مانی: POST /api/admin/physical-purchases/{purchaseId}/shipments/refresh
 * بدون بدنه. JWT ادمین فقط از session سروری خوانده می‌شود.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { BYEMONEY_API_URL } from '@/lib/byeMoneySync';

export async function POST(_request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    const { purchaseId } = await params;
    if (!purchaseId || !String(purchaseId).trim()) {
        return NextResponse.json({ error: 'شناسه خرید نامعتبر است.' }, { status: 400 });
    }

    try {
        const res = await fetch(
            `${BYEMONEY_API_URL}/api/admin/physical-purchases/${encodeURIComponent(purchaseId)}/shipments/refresh`,
            {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.user.jwt}` },
                cache: 'no-store',
            },
        );

        let data = null;
        try {
            data = await res.json();
        } catch {
            data = null;
        }

        return NextResponse.json(data ?? {}, { status: res.status });
    } catch {
        return NextResponse.json({ error: 'خطا در برقراری ارتباط با بای‌مانی.' }, { status: 502 });
    }
}
