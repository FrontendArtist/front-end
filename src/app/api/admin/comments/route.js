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

    const dataPayload = body.data || body;
    if (session?.user?.id && !dataPayload.user) {
        dataPayload.user = session.user.id;
    }

    try {
        const strapiRes = await fetch(`${STRAPI_API_URL}/api/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.user.jwt}`,
            },
            cache: 'no-store',
            body: JSON.stringify({ data: dataPayload }),
        });

        const data = await strapiRes.json();

        if (!strapiRes.ok) {
            console.error('❌ Strapi POST /api/comments Error:', strapiRes.status, JSON.stringify(data));
            const errorMessage =
                data?.error?.message ||
                data?.error?.details?.errors?.[0]?.message ||
                'Strapi create failed';
            return NextResponse.json(
                { error: errorMessage, details: data },
                { status: strapiRes.status }
            );
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error('❌ Proxy POST /api/admin/comments Exception:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

import { getAdminComments } from '@/lib/admin/adminCommentsApi';

export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start');
    const limitParam = searchParams.get('limit');
    const page = searchParams.get('page');
    const pageSize = searchParams.get('pageSize');

    try {
        const options = {};
        if (startParam !== null) {
            options.start = parseInt(startParam, 10) || 0;
            options.limit = parseInt(limitParam, 10) || 20;
        } else if (page !== null) {
            options.page = parseInt(page, 10) || 1;
            options.pageSize = parseInt(pageSize, 10) || 50;
        } else {
            options.start = 0;
            options.limit = 20;
        }

        const { comments, meta, error } = await getAdminComments(session.user.jwt, options);

        if (error) {
            return NextResponse.json({ error: 'خطا در دریافت لیست نظرات' }, { status: 500 });
        }

        return NextResponse.json({
            data: comments,
            meta,
        });
    } catch (error) {
        console.error('❌ Proxy GET /api/admin/comments Exception:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
