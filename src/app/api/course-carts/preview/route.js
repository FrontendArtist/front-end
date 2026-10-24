import { getServerSession } from 'next-auth';
import { paymentAuthOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { STRAPI_API_URL } from '@/lib/api';

export async function POST(request) {
    const session = await getServerSession(paymentAuthOptions);
    if (!session?.user?.jwt) {
        return NextResponse.json({ error: 'برای بررسی سبد وارد حساب کاربری شوید.' }, { status: 401 });
    }
    let body;
    try { body = await request.json(); } catch {
        return NextResponse.json({ error: 'درخواست سبد معتبر نیست.' }, { status: 400 });
    }
    const forwardedBody = {
        couponCode: typeof body?.couponCode === 'string' && body.couponCode.trim() ? body.couponCode.trim() : null,
    };
    if (Array.isArray(body?.items) && body.items.length > 0) {
        if (body.items.length > 100) {
            return NextResponse.json({ error: 'تعداد اقلام سبد معتبر نیست.' }, { status: 400 });
        }
        forwardedBody.items = body.items.map(item => ({
            externalId: String(item?.externalId || item?.integrationId || item?.documentId || item?.id || '').trim(),
            type: item?.type === 'course_chapter' || item?.type === 'chapter' ? 'course_chapter'
                : item?.type === 'product' ? 'product' : 'course',
            quantity: Number.isSafeInteger(item?.quantity) && item.quantity > 0 ? item.quantity : 1,
        }));
        if (forwardedBody.items.some(i => !i.externalId)) {
            return NextResponse.json({ error: 'شناسه اقلام سبد معتبر نیست.' }, { status: 400 });
        }
    } else if (Array.isArray(body?.externalCourseIds) && body.externalCourseIds.length > 0) {
        if (body.externalCourseIds.length > 100 || body.externalCourseIds.some(id => typeof id !== 'string' || !id.trim())) {
            return NextResponse.json({ error: 'شناسه دوره‌های سبد معتبر نیست.' }, { status: 400 });
        }
        forwardedBody.externalCourseIds = body.externalCourseIds;
    } else {
        return NextResponse.json({ error: 'سبد خرید خالی است.' }, { status: 400 });
    }

    try {
        // هویت فقط از توکن نشست است؛ قیمت و شناسهٔ خریدار مرورگر ارسال نمی‌شوند.
        const response = await fetch(`${STRAPI_API_URL}/api/course-carts/preview`, {
            method: 'POST', headers: { Authorization: `Bearer ${session.user.jwt}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(forwardedBody),
            cache: 'no-store', signal: request.signal,
        });
        const data = await response.json();
        if (!response.ok) {
            return NextResponse.json({ error: data.error?.message || data.error || data.message || 'بررسی قیمت سبد ممکن نیست.' },
                { status: response.status });
        }
        return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
        return NextResponse.json({ error: 'ارتباط با سرویس قیمت‌گذاری برقرار نشد.' }, { status: 503 });
    }
}
