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
        title, slug, excerpt, content, cover, tags, articles_categories, publishedAt, enable_cta, featured_course,
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
            enable_cta: enable_cta !== undefined ? Boolean(enable_cta) : true,
            featured_course: featured_course || null,
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

import { getAdminArticles } from '@/lib/admin/adminArticlesApi';

export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start');
    const limitParam = searchParams.get('limit');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    const options = (startParam !== null && limitParam !== null)
        ? { start: parseInt(startParam, 10), limit: parseInt(limitParam, 10) }
        : { page, pageSize };

    try {
        const { articles, meta, error } = await getAdminArticles(session.user.jwt, options);

        if (error) {
            return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
        }

        return NextResponse.json({ articles, meta });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
