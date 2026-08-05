/**
 * @file src/app/api/admin/courses/[id]/route.js
 * @description API Route for updating (PUT), deleting (DELETE), and fetching (GET) a course
 *
 * 🔐 Security: JWT is read server-side from session, never exposed to browser.
 * ⚠️  Strapi v5: uses documentId (UUID string) for REST operations, not numeric id.
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

// ── PUT: update course ──────────────────────────────────────────────────────
export async function PUT(request, { params }) {
    const { authorized, jwt } = await checkAdmin();
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Course ID required' }, { status: 400 });

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { documentId, ...contentPayload } = body;
    const strapiId = documentId || id;

    try {
        if (process.env.NODE_ENV === 'development') {
            console.log(`[AdminCoursesAPI] PUT ${strapiId}`, JSON.stringify(contentPayload).slice(0, 300));
        }

        const updateRes = await fetch(`${STRAPI_URL}/api/courses/${strapiId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${jwt}`,
            },
            cache: 'no-store',
            body: JSON.stringify({ data: contentPayload }),
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
        if (process.env.NODE_ENV === 'development') console.error('[AdminCoursesAPI] Server error:', err.message);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// ── DELETE: remove course ───────────────────────────────────────────────────
export async function DELETE(request, { params }) {
    const { authorized, jwt } = await checkAdmin();
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Course ID required' }, { status: 400 });

    try {
        const res = await fetch(`${STRAPI_URL}/api/courses/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${jwt}` },
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

// ── GET: single course by documentId ───────────────────────────────────────
export async function GET(request, { params }) {
    const { authorized, jwt } = await checkAdmin();
    if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Course ID required' }, { status: 400 });

    try {
        const res = await fetch(
            `${STRAPI_URL}/api/courses/${id}?populate[media]=true&populate[chapters][populate][lessons]=true&populate[curriculum]=true&status=draft`,
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
