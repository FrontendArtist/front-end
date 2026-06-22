/**
 * @file src/app/api/admin/comments/[id]/route.js
 * @description Proxy Route برای آپدیت وضعیت کامنت‌ها یا ثبت پاسخ
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

const STRAPI_API_URL =
    process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

export async function PUT(request, { params }) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
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
        const strapiRes = await fetch(`${STRAPI_API_URL}/api/comments/${strapiId}`, {
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
