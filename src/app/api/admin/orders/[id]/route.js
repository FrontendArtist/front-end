/**
 * @file src/app/api/admin/orders/[id]/route.js
 * @description API Route برای آپدیت سفارش توسط ادمین
 *
 * 🔐 چرا این API Route لازم است؟
 *   Client Components نمی‌توانند مستقیماً JWT ادمین را در header بفرستند،
 *   چون توکن در مرورگر expose می‌شود.
 *   این Route به عنوان یک پروکسی امن عمل می‌کند:
 *     1. Client درخواست PUT می‌فرستد (بدون token).
 *     2. این Route از getServerSession روی سرور JWT را می‌گیرد.
 *     3. با آن JWT به Strapi درخواست می‌فرستد.
 *   توکن هرگز به مرورگر نمی‌رسد.
 *
 * ⚠️ Strapi v5:
 *   برای PUT باید از documentId (UUID string) استفاده شود، نه numeric id.
 *   client باید documentId را در request body ارسال کند.
 *
 * 🛡️ Authorization: فقط administrator می‌تواند این route را صدا بزند.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

const STRAPI_API_URL =
    process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

export async function PUT(request, { params }) {
    // ── بررسی session و نقش ─────────────────────────────────────────
    const session = await getServerSession(authOptions);

    if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    /*
     * ⚠️ Next.js 15: params یک Promise است و باید await شود.
     */
    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // ── دریافت payload از client ────────────────────────────────────
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    /*
     * ⚠️ Strapi v5: تفاوت numeric id و documentId
     *
     * Strapi v5 از documentId (UUID string مثل "abc123xyz") برای route های REST استفاده می‌کند.
     * numeric id (مثل 80) فقط برای نمایش داخلی است و PUT با آن 404 می‌دهد.
     *
     * Client باید documentId را در body ارسال کند:
     *   { documentId: "abc123xyz", orderStatus: "shipped", ... }
     *
     * اگر documentId موجود نبود (Strapi v4)، از numeric id استفاده می‌کنیم.
     */
    const { documentId, ...payload } = body;
    const strapiId = documentId || id;

    if (process.env.NODE_ENV === 'development') {
        console.log(`[AdminOrdersAPI] PUT /api/orders/${strapiId} (documentId: ${documentId}, numericId: ${id})`);
    }

    // ── فوروارد درخواست به Strapi با JWT ادمین ─────────────────────
    try {
        const strapiRes = await fetch(`${STRAPI_API_URL}/api/orders/${strapiId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.user.jwt}`,
            },
            cache: 'no-store',
            body: JSON.stringify({ data: payload }),
        });

        const data = await strapiRes.json();

        if (!strapiRes.ok) {
            if (process.env.NODE_ENV === 'development') {
                console.error(`[AdminOrdersAPI] Strapi ${strapiRes.status}:`, JSON.stringify(data));
            }
            return NextResponse.json(
                { error: data?.error?.message || 'Strapi update failed' },
                { status: strapiRes.status }
            );
        }

        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
