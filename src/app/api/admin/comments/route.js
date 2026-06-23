/**
 * @file src/app/api/admin/comments/route.js
 * @description POST proxy — ارسال پاسخ ادمین به کامنت
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

const STRAPI_API_URL =
    process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

export async function POST(request) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    try {
        const strapiRes = await fetch(`${STRAPI_API_URL}/api/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.user.jwt}`,
            },
            cache: 'no-store',
            body: JSON.stringify({ data: body }),
        });

        const data = await strapiRes.json();

        if (!strapiRes.ok) {
            return NextResponse.json(
                { error: data?.error?.message || 'Strapi create failed' },
                { status: strapiRes.status }
            );
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
