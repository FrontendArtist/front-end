import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api';

/**
 * Route Handler برای دریافت اطلاعات رهگیری بازدید از کلاینت و ارسال به Strapi
 * POST /api/analytics/track
 */
export async function POST(request) {
    try {
        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const { visitorId, path, device, type } = body || {};

        if (!visitorId) {
            return NextResponse.json({ error: 'visitorId is required' }, { status: 400 });
        }

        // استخراج IP کلاینت از هدرهای درخواست جهت ارسال به استراپی
        const forwardedFor = request.headers.get('x-forwarded-for') || '';
        const realIp = request.headers.get('x-real-ip') || '';
        const userAgent = request.headers.get('user-agent') || '';

        const strapiRes = await fetch(`${API_BASE_URL}/api/visitor-stat/track`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-forwarded-for': forwardedFor || realIp,
                'user-agent': userAgent,
            },
            body: JSON.stringify({
                visitorId,
                path: path || '/',
                device: device || 'desktop',
                type: type || 'pageview',
            }),
            cache: 'no-store',
        });

        if (!strapiRes.ok) {
            return NextResponse.json({ success: false }, { status: strapiRes.status });
        }

        const data = await strapiRes.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
