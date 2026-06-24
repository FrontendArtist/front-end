/**
 * @file src/app/api/admin/products/[id]/route.js
 * @description API Route for updating (PUT) and deleting (DELETE) a product
 *
 * 🔐 Security: JWT is read server-side from session, never exposed to browser.
 * ⚠️  Strapi v5: uses documentId (UUID string) for REST operations, not numeric id.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

// ── Shared: check auth ─────────────────────────────────────────────────────────
async function checkAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
        return { authorized: false, jwt: null };
    }
    return { authorized: true, jwt: session.user.jwt };
}

// ── PUT: update product ────────────────────────────────────────────────────────
export async function PUT(request, { params }) {
    const { authorized, jwt } = await checkAdmin();
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // ── گام ۱: جدا کردن publishedAt از داده‌های محتوایی ─────────────────────────
    // در Strapi v5، ارسال publishedAt در payload معمولی PUT ممکن است کل آپدیت را reject کند.
    // باید داده‌های محتوایی (title, isAvailable, ...) جداگانه از وضعیت انتشار آپدیت شوند.
    const { documentId, publishedAt, ...contentPayload } = body;
    const strapiId = documentId || id;

    const strapiHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
    };

    try {
        // ── گام ۲: آپدیت داده‌های محتوایی ───────────────────────────────────────
        if (process.env.NODE_ENV === 'development') {
            console.log(`[AdminProductsAPI] PUT ${strapiId} → contentPayload:`, JSON.stringify(contentPayload));
        }

        const updateRes = await fetch(`${STRAPI_URL}/api/products/${strapiId}`, {
            method: 'PUT',
            headers: strapiHeaders,
            cache: 'no-store',
            body: JSON.stringify({ data: contentPayload }),
        });

        const updateData = await updateRes.json();

        if (process.env.NODE_ENV === 'development') {
            console.log(`[AdminProductsAPI] PUT ${strapiId} ← status:${updateRes.status}`, JSON.stringify(updateData).slice(0, 500));
        }

        if (!updateRes.ok) {
            return NextResponse.json(
                { error: updateData?.error?.message || 'Strapi update failed' },
                { status: updateRes.status }
            );
        }

        // ── گام ۳: تغییر وضعیت انتشار (اگر publishedAt در body بود) ─────────────
        // Strapi v5 برای publish/unpublish endpoint جداگانه دارد
        if (Object.prototype.hasOwnProperty.call(body, 'publishedAt')) {
            const actionEndpoint = publishedAt
                ? `${STRAPI_URL}/api/products/${strapiId}/actions/publish`
                : `${STRAPI_URL}/api/products/${strapiId}/actions/unpublish`;

            const actionRes = await fetch(actionEndpoint, {
                method: 'POST',
                headers: strapiHeaders,
                cache: 'no-store',
            });

            if (!actionRes.ok && process.env.NODE_ENV === 'development') {
                const actionErr = await actionRes.json().catch(() => ({}));
                console.warn(`[AdminProductsAPI] publish action failed:`, JSON.stringify(actionErr));
                // نبود endpoint در Strapi قدیمی‌تر مهم نیست — ادامه می‌دهیم
            }
        }

        return NextResponse.json(updateData, { status: 200 });
    } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('[AdminProductsAPI] Server error:', err.message);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}


// ── DELETE: remove product ─────────────────────────────────────────────────────
export async function DELETE(request, { params }) {
    const { authorized, jwt } = await checkAdmin();
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });

    try {
        const res = await fetch(`${STRAPI_URL}/api/products/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${jwt}`,
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            return NextResponse.json(
                { error: data?.error?.message || 'Delete failed' },
                { status: res.status }
            );
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// ── GET: single product by documentId ─────────────────────────────────────────
export async function GET(request, { params }) {
    const { authorized, jwt } = await checkAdmin();
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });

    try {
        const res = await fetch(
            `${STRAPI_URL}/api/products/${id}?populate[images]=true&populate[categories]=true&populate[tags]=true&publicationState=preview`,
            {
                headers: {
                    Authorization: `Bearer ${jwt}`,
                    'Content-Type': 'application/json',
                },
                cache: 'no-store',
            }
        );

        const data = await res.json();
        if (!res.ok) return NextResponse.json({ error: 'Not found' }, { status: res.status });

        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
