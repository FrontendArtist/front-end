/**
 * @file src/app/api/admin/coupons/[id]/route.js
 * @description API Route for fetching (GET), updating (PUT), and deleting (DELETE) a discount coupon
 *
 * 🔐 Security: JWT is verified server-side from session (Administrator role required).
 * ⚠️  Strapi v5: uses documentId (UUID string) for REST operations.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

async function checkAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
        return { authorized: false, jwt: null };
    }
    return { authorized: true, jwt: session.user.jwt };
}

// ── GET: single coupon by documentId ─────────────────────────────────────────
export async function GET(request, { params }) {
    const { authorized, jwt } = await checkAdmin();
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Coupon ID required' }, { status: 400 });

    try {
        const res = await fetch(
            `${STRAPI_URL}/api/coupons/${id}?populate[products][fields][0]=title&populate[products][fields][1]=slug&populate[products][fields][2]=price&populate[courses][fields][0]=title&populate[courses][fields][1]=slug&populate[courses][fields][2]=price`,
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

// ── PUT: update coupon or toggle status ──────────────────────────────────────
export async function PUT(request, { params }) {
    const { authorized, jwt } = await checkAdmin();
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Coupon ID required' }, { status: 400 });

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { documentId, ...contentPayload } = body;
    const strapiId = documentId || id;

    // Sanitize payload data
    const sanitizedData = {};
    if (contentPayload.code !== undefined) sanitizedData.code = contentPayload.code.trim().toUpperCase();
    if (contentPayload.title !== undefined) sanitizedData.title = contentPayload.title ? contentPayload.title.trim() : null;
    if (contentPayload.discountType !== undefined) sanitizedData.discountType = contentPayload.discountType;
    if (contentPayload.discountValue !== undefined) sanitizedData.discountValue = Number(contentPayload.discountValue);
    if (contentPayload.maxDiscountAmount !== undefined) {
        sanitizedData.maxDiscountAmount = (contentPayload.maxDiscountAmount !== null && contentPayload.maxDiscountAmount !== '' && !isNaN(Number(contentPayload.maxDiscountAmount))) ? Number(contentPayload.maxDiscountAmount) : null;
    }
    if (contentPayload.minOrderAmount !== undefined) {
        sanitizedData.minOrderAmount = (contentPayload.minOrderAmount !== null && contentPayload.minOrderAmount !== '' && !isNaN(Number(contentPayload.minOrderAmount))) ? Number(contentPayload.minOrderAmount) : null;
    }
    if (contentPayload.appliesToAllProducts !== undefined) sanitizedData.appliesToAllProducts = !!contentPayload.appliesToAllProducts;
    if (contentPayload.appliesToAllCourses !== undefined) sanitizedData.appliesToAllCourses = !!contentPayload.appliesToAllCourses;
    if (contentPayload.products !== undefined) sanitizedData.products = Array.isArray(contentPayload.products) ? contentPayload.products : [];
    if (contentPayload.courses !== undefined) sanitizedData.courses = Array.isArray(contentPayload.courses) ? contentPayload.courses : [];
    if (contentPayload.startDate !== undefined) sanitizedData.startDate = contentPayload.startDate || null;
    if (contentPayload.expiresAt !== undefined) sanitizedData.expiresAt = contentPayload.expiresAt || null;
    if (contentPayload.maxUsage !== undefined) {
        sanitizedData.maxUsage = (contentPayload.maxUsage !== null && contentPayload.maxUsage !== '' && !isNaN(Number(contentPayload.maxUsage))) ? Number(contentPayload.maxUsage) : null;
    }
    if (contentPayload.usedCount !== undefined) sanitizedData.usedCount = Number(contentPayload.usedCount) || 0;
    if (contentPayload.isActive !== undefined) sanitizedData.isActive = !!contentPayload.isActive;

    try {
        const updateRes = await fetch(`${STRAPI_URL}/api/coupons/${strapiId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${jwt}`,
            },
            cache: 'no-store',
            body: JSON.stringify({ data: sanitizedData }),
        });

        const updateData = await updateRes.json();

        if (!updateRes.ok) {
            return NextResponse.json(
                { error: updateData?.error?.message || 'Strapi update failed' },
                { status: updateRes.status }
            );
        }

        return NextResponse.json(updateData, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// ── DELETE: remove coupon ───────────────────────────────────────────────────
export async function DELETE(request, { params }) {
    const { authorized, jwt } = await checkAdmin();
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Coupon ID required' }, { status: 400 });

    try {
        const res = await fetch(`${STRAPI_URL}/api/coupons/${id}`, {
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
