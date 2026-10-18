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
    try {
        // هویت فقط از توکن نشست است؛ قیمت و شناسهٔ خریدار مرورگر ارسال نمی‌شوند.
        const response = await fetch(`${STRAPI_API_URL}/api/course-carts/preview`, {
            method: 'POST', headers: { Authorization: `Bearer ${session.user.jwt}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ externalCourseIds: body?.externalCourseIds, couponCode: body?.couponCode }),
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
