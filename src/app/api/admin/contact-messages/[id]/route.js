/**
 * @file src/app/api/admin/contact-messages/[id]/route.js
 * @description API Proxy Route for PUT and DELETE on a single contact message.
 *
 * 🔐 Security: JWT is read server-side from session, never exposed to browser.
 * ⚠️ Strapi v5: uses documentId for REST operations.
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

// PUT /api/admin/contact-messages/[id]
export async function PUT(request, { params }) {
    const { authorized, jwt } = await checkAdmin();
    if (!authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { documentId, ...payload } = body;
    const strapiId = documentId || id;

    try {
        const res = await fetch(`${STRAPI_URL}/api/contact-messages/${strapiId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${jwt}`,
            },
            cache: 'no-store',
            body: JSON.stringify({ data: payload }),
        });

        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(
                { error: data?.error?.message || 'Strapi update failed' },
                { status: res.status }
            );
        }

        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// DELETE /api/admin/contact-messages/[id]
export async function DELETE(request, { params }) {
    const { authorized, jwt } = await checkAdmin();
    if (!authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    try {
        const res = await fetch(`${STRAPI_URL}/api/contact-messages/${id}`, {
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
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
