/**
 * @file src/app/api/admin/physical-purchases/[purchaseId]/shipments/route.js
 * @description پروکسی سروریِ ساخت مرسوله نزد واسط پستی (SHIP-TRACKING-B)
 *
 * JWT ادمین فقط از session سروری خوانده می‌شود. مرورگر کلید یا توکن بای‌مانی را نمی‌بیند.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { createPhysicalShipment } from '@/lib/byeMoneyApi';

export async function POST(request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    const { purchaseId } = await params;

    let body = {};
    try {
        body = await request.json();
    } catch {
        body = {};
    }

    const result = await createPhysicalShipment({
        jwt: session.user.jwt,
        purchaseId,
        collectionType: body?.collectionType,
        provider: body?.provider,
    });

    if (result.success) {
        return NextResponse.json({ success: true, data: result.data });
    }

    let status = 502;
    if (result.badRequest) status = 400;
    else if (result.unauthorized) status = 401;
    else if (result.forbidden) status = 403;
    else if (result.notFound) status = 404;
    else if (!result.networkError) status = 500;

    return NextResponse.json({ success: false, error: result.error }, { status });
}
