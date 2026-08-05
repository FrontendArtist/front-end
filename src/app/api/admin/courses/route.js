/**
 * @file src/app/api/admin/courses/route.js
 * @description API Route for creating a new course (POST) and listing courses (GET)
 *
 * 🔐 Security: JWT is read server-side from session, never exposed to browser.
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
        title, slug, description, price, isFree, isChaptered,
        teaserUrl, content, media, chapters, curriculum, publishedAt,
    } = body;

    const strapiPayload = {
        data: {
            title,
            slug,
            description: description || null,
            price: price != null ? Number(price) : null,
            isFree: !!isFree,
            isChaptered: !!isChaptered,
            teaserUrl: teaserUrl || null,
            content: content || null,
            media: Array.isArray(media) ? media : [],
            chapters: Array.isArray(chapters) ? chapters : [],
            curriculum: Array.isArray(curriculum) ? curriculum : [],
            publishedAt: publishedAt || null,
        },
    };

    try {
        const res = await fetch(`${STRAPI_URL}/api/courses`, {
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
                console.error('[AdminCoursesAPI] POST error:', JSON.stringify(data));
            }
            return NextResponse.json(
                { error: data?.error?.message || 'Strapi error' },
                { status: res.status }
            );
        }

        const createdDocId = data?.data?.documentId || data?.data?.id;
        if (createdDocId && publishedAt) {
            try {
                await fetch(`${STRAPI_URL}/api/courses/${createdDocId}/publish`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session.user.jwt}`,
                    },
                    cache: 'no-store',
                });
            } catch (err) {
                if (process.env.NODE_ENV === 'development') console.error('[AdminCoursesAPI] Error publishing new course:', err);
            }
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

    const endpoint = `${STRAPI_URL}/api/courses?populate[media]=true&sort=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=${pageSize}&status=draft`;

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
