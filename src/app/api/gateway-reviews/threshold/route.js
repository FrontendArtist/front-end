import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/api';

// فقط عدد آستانهٔ «در حال بررسی» برای کاربر لاگین‌شده؛ JWT فقط سمت سرور استفاده می‌شود (D20 بند ۵).
export async function GET() {
    const session = await getServerSession(authOptions);
    const jwt = session?.user?.jwt;
    if (!jwt) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });

    const base = (API_BASE_URL || 'http://localhost:1337').trim().replace(/\/+$/, '').replace(/\/api\/?$/, '');
    try {
        const res = await fetch(`${base}/api/gateway-reviews/threshold`, {
            headers: { Authorization: `Bearer ${jwt}` },
            cache: 'no-store',
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !Number.isSafeInteger(data?.noCallbackMinutes)) {
            return NextResponse.json({ error: 'آستانه در دسترس نیست' }, { status: 502 });
        }
        return NextResponse.json({ noCallbackMinutes: data.noCallbackMinutes });
    } catch {
        return NextResponse.json({ error: 'آستانه در دسترس نیست' }, { status: 502 });
    }
}
