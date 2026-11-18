/**
 * @file src/app/api/orders/[orderId]/confirm-delivery/route.js
 * @description تأیید دریافت کالای ارسال‌شده توسط خریدار (SHIP-TRACKING)
 *
 * 🔐 JWT کاربر فقط از session سروری خوانده می‌شود و به مرورگر نمی‌رسد.
 * 📦 مالک وضعیت تحویل فقط بای‌مانی است؛ این route به استراپی درخواست نمی‌فرستد.
 *    سفارش کاربر دیگر در بای‌مانی ۴۰۴ می‌گیرد و همان ۴۰۴ بی‌تغییر برگردانده می‌شود.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { CourseOrderId, confirmMyCourseOrderDelivery } from '@/lib/byeMoneyApi';

export async function POST(_request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt) {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    const { orderId } = await params;
    let resolved = orderId;
    try {
        resolved = decodeURIComponent(orderId);
    } catch {
        // مقدار خام نگه داشته می‌شود و اعتبارسنجی زیر آن را رد می‌کند
    }
    if (!CourseOrderId.isValid(resolved)) {
        return NextResponse.json({ error: 'شناسه سفارش نامعتبر است.' }, { status: 400 });
    }

    const result = await confirmMyCourseOrderDelivery({ jwt: session.user.jwt, orderId: resolved });

    if (result.success) {
        return NextResponse.json({ success: true, data: result.data });
    }

    let status = 502;
    if (result.badRequest) status = 400;
    else if (result.unauthorized) status = 401;
    else if (result.notFound) status = 404;
    else if (!result.networkError) status = 500;

    return NextResponse.json({ success: false, error: result.error }, { status });
}
