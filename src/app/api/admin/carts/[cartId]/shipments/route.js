/**
 * @file src/app/api/admin/carts/[cartId]/shipments/route.js
 * @description پروکسی سروریِ ساخت مرسوله نزد واسط پستی در سطح سبد خرید (D20 / BND-07)
 *
 * JWT ادمین فقط از session سروری خوانده می‌شود. مرورگر کلید یا توکن بای‌مانی را نمی‌بیند.
 * وضعیت HTTP و بدنهٔ خطای بای‌مانی بدون تغییر به کلاینت پاس داده می‌شود.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { BYEMONEY_API_URL } from '@/lib/byeMoneySync';

export async function POST(request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    const { cartId } = await params;
    if (!cartId || !String(cartId).trim()) {
        return NextResponse.json({ error: 'شناسه سبد نامعتبر است.' }, { status: 400 });
    }

    let body = {};
    try {
        body = await request.json();
    } catch {
        body = {};
    }

    const forwardBody = {
        provider: body?.provider || 'PostEx',
    };
    if (body?.boxTypeId !== undefined) {
        forwardBody.boxTypeId = body.boxTypeId;
    }

    try {
        const res = await fetch(
            `${BYEMONEY_API_URL}/api/admin/carts/${encodeURIComponent(cartId)}/shipments`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session.user.jwt}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(forwardBody),
                cache: 'no-store',
            }
        );

        let data = null;
        try {
            data = await res.json();
        } catch {
            data = null;
        }

        return NextResponse.json(data ?? {}, { status: res.status });
    } catch {
        return NextResponse.json({ error: 'خطا در برقراری ارتباط با سامانه مالی.' }, { status: 502 });
    }
}
