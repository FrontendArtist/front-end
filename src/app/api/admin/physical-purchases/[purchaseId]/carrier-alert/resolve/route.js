/**
 * @file src/app/api/admin/physical-purchases/[purchaseId]/carrier-alert/resolve/route.js
 * @description پروکسی سروریِ تعیین‌تکلیف هشدار خسارت/مفقودی مرسوله (SHIP-FIX-2)
 *
 * JWT ادمین فقط از session سروری خوانده می‌شود. وضعیت و بدنهٔ بای‌مانی، از جمله `{ code, error }`،
 * بدون بازنویسی به مرورگر برمی‌گردد.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { BYEMONEY_API_URL } from '@/lib/byeMoneySync';

const RESOLUTIONS = new Set(['DeliveryConfirmed', 'ClosedWithoutSettlement']);

export async function POST(request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    const { purchaseId } = await params;
    if (!purchaseId || !String(purchaseId).trim()) {
        return NextResponse.json({ error: 'شناسه خرید نامعتبر است.' }, { status: 400 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'بدنهٔ درخواست نامعتبر است.' }, { status: 400 });
    }

    const resolution = body?.resolution;
    const note = typeof body?.note === 'string' ? body.note.trim() : '';
    if (!RESOLUTIONS.has(resolution) || note.length < 1 || note.length > 1000) {
        return NextResponse.json({ error: 'نتیجه یا یادداشت نامعتبر است.' }, { status: 400 });
    }

    try {
        const res = await fetch(
            `${BYEMONEY_API_URL}/api/admin/physical-purchases/${encodeURIComponent(purchaseId)}/carrier-alert/resolve`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session.user.jwt}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ resolution, note }),
                cache: 'no-store',
            },
        );
        const text = await res.text();
        return new NextResponse(text, {
            status: res.status,
            headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' },
        });
    } catch {
        return NextResponse.json({ error: 'خطا در برقراری ارتباط با بای‌مانی.' }, { status: 502 });
    }
}
