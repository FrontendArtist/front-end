/**
 * @file src/app/api/admin/physical-purchases/[purchaseId]/delivery-status/route.js
 * @description پروکسی سروریِ ثبت وضعیت ارسال کالای فیزیکی در بای‌مانی (I11-O)
 *
 * 🔐 JWT ادمین فقط از session سروری خوانده می‌شود و به مرورگر نمی‌رسد.
 * 📦 مالک وضعیت ارسال فقط بای‌مانی است؛ این route هرگز به استراپی درخواست نمی‌فرستد
 *    و هیچ نسخه‌ای از وضعیت ارسال را نگه نمی‌دارد.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { updatePhysicalPurchaseDeliveryStatus } from '@/lib/byeMoneyApi';

export async function PUT(request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    const { purchaseId } = await params;

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'بدنهٔ درخواست نامعتبر است.' }, { status: 400 });
    }

    const result = await updatePhysicalPurchaseDeliveryStatus({
        jwt: session.user.jwt,
        purchaseId,
        status: body?.status,
    });

    if (result.success) {
        return NextResponse.json({ success: true, data: result.data });
    }

    // توکن یا جزئیات داخلی بازتاب داده نمی‌شود؛ فقط پیام فارسی و کد وضعیت متناظر.
    let status = 502;
    if (result.badRequest) status = 400;
    else if (result.unauthorized) status = 401;
    else if (result.forbidden) status = 403;
    else if (result.notFound) status = 404;
    else if (!result.networkError) status = 500;

    return NextResponse.json({ success: false, error: result.error }, { status });
}
