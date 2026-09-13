import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api';

/**
 * Route Handler برای دریافت رویداد ورود روزانه یا ضربان قلب آنلاین کلاینت
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

        const { visitorId, type } = body || {};

        if (!visitorId) {
            return NextResponse.json({ error: 'visitorId is required' }, { status: 400 });
        }

        const strapiRes = await fetch(`${API_BASE_URL}/api/visitor-stat/track`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                visitorId,
                type: type || 'heartbeat',
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
