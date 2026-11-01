/**
 * @file src/app/api/admin/orders/[id]/tracking/route.js
 * @description جزئیات و خط زمانی تلاش‌های خرید یک سفارش بای‌مانی برای پنل ادمین (فقط GET / فقط‌مشاهده)
 *
 * پوشهٔ والد [id] است (نه [orderId]) چون Next.js اجازهٔ دو نام متفاوت برای یک سطح دینامیک را نمی‌دهد.
 * JWT ادمین از session سروری گرفته می‌شود و هرگز به مرورگر نمی‌رسد.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { CourseOrderId } from '@/lib/byeMoneyApi';
import { getOrderTracking } from '@/lib/admin/adminOrderTrackingApi';

export async function GET(_request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    const { id } = await params;
    let orderId = id;
    try {
        orderId = decodeURIComponent(id);
    } catch {
        // مقدار خام نگه داشته می‌شود و اعتبارسنجی زیر آن را رد می‌کند
    }
    if (!CourseOrderId.isValid(orderId)) {
        return NextResponse.json({ error: 'شناسه سفارش نامعتبر است.' }, { status: 400 });
    }

    try {
        const result = await getOrderTracking({ jwt: session.user.jwt, orderId });
        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }
        return NextResponse.json(result.data);
    } catch (err) {
        console.error('[AdminOrderTracking GET] Error:', err);
        return NextResponse.json({ error: 'خطای داخلی سرور' }, { status: 500 });
    }
}
