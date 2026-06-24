/**
 * @file src/app/api/admin/articles/route.js
 * @description API Route for creating a new article (POST) and listing articles (GET)
 *
 * 🔐 Security: JWT is read server-side from session, never exposed to browser.
 * 📌 Strapi v5: media/relations are sent as arrays of documentIds / ids.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

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

    const {
        title, slug, excerpt, content, cover, tags, articles_categories, publishedAt,
    } = body;

    const strapiPayload = {
        data: {
            title,
            slug,
            excerpt,
            content,
            cover,           // media id
            tags,            // array of documentIds
            articles_categories, // array of documentIds
            publishedAt: publishedAt || null,
        },
    };

    try {
        const res = await fetch(`${STRAPI_URL}/api/articles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.user.jwt}`,
            },
            cache: 'no-store',
            body: JSON.stringify(strapiPayload),
        });

        const data = await res.json();

        if (!res.ok) {
            if (process.env.NODE_ENV === 'development') {
                console.error('[AdminArticlesAPI] POST error:', JSON.stringify(data));
            }
            return NextResponse.json(
                { error: data?.error?.message || 'Strapi error' },
                { status: res.status }
            );
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('pageSize') || '100';

    const endpoint = `${STRAPI_URL}/api/articles?populate[cover]=true&populate[articles_categories]=true&populate[tags]=true&sort=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=${pageSize}&publicationState=preview`;

    try {
        const res = await fetch(endpoint, {
            headers: {
                Authorization: `Bearer ${session.user.jwt}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        const data = await res.json();
        if (!res.ok) return NextResponse.json({ error: 'Strapi error' }, { status: res.status });

        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
