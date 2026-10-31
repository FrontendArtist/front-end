import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { STRAPI_API_URL } from '@/lib/api';

const STRAPI_BASE_URL = STRAPI_API_URL;
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * GET /api/notifications
 * دریافت لیست اعلان‌های خوانده‌نشده کاربر جاری (حداکثر مربوط به ۷ روز گذشته)
 */
export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthenticated', data: [] }, { status: 401 });
    }

    if (!STRAPI_TOKEN) {
        return NextResponse.json({ data: [] }, { status: 200 });
    }

    try {
        const userId = encodeURIComponent(session.user.id);
        const sevenDaysAgoIso = encodeURIComponent(
            new Date(Date.now() - SEVEN_DAYS_MS).toISOString()
        );

        const strapiUrl =
            `${STRAPI_BASE_URL}/api/notifications` +
            `?filters[users_permissions_user][id][$eq]=${userId}` +
            `&filters[isRead][$eq]=false` +
            `&filters[createdAt][$gte]=${sevenDaysAgoIso}` +
            `&pagination[pageSize]=100` +
            `&sort=createdAt:desc`;

        const res = await fetch(strapiUrl, {
            headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
            cache: 'no-store',
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error('[GET /api/notifications] Strapi error:', res.status, errText);
            return NextResponse.json({ data: [] }, { status: 200 });
        }

        const json = await res.json();
        return NextResponse.json({ data: Array.isArray(json?.data) ? json.data : [] });
    } catch (error) {
        console.error('[GET /api/notifications] Exception:', error);
        return NextResponse.json({ data: [] }, { status: 200 });
    }
}

/**
 * PUT /api/notifications
 * علامت‌گذاری یک اعلان، اعلان‌های یک پیام، یا تمام اعلان‌های کاربر به عنوان خوانده‌شده در دیتابیس
 */
export async function PUT(request) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
    }

    if (!STRAPI_TOKEN) {
        return NextResponse.json({ message: 'Service unavailable' }, { status: 503 });
    }

    let body = {};
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }

    const { action, id, rawId } = body || {};
    if (!['markAsRead', 'markMessageAsRead', 'markAllAsRead'].includes(action)) {
        return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
    }

    try {
        const userId = encodeURIComponent(session.user.id);
        const listUrl =
            `${STRAPI_BASE_URL}/api/notifications` +
            `?filters[users_permissions_user][id][$eq]=${userId}` +
            `&filters[isRead][$eq]=false` +
            `&pagination[pageSize]=100`;

        const listRes = await fetch(listUrl, {
            headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
            cache: 'no-store',
        });

        if (!listRes.ok) {
            return NextResponse.json({ message: 'Failed to load notifications' }, { status: 502 });
        }

        const listData = await listRes.json();
        const unreadList = Array.isArray(listData?.data) ? listData.data : [];

        const targets = unreadList.filter((item) => {
            const attrs = item.attributes || item;
            const docId = item.documentId || attrs.documentId;
            const numId = item.id || attrs.id;
            const eventKey = attrs.eventKey;
            const itemRawId = attrs.rawId;

            if (action === 'markAllAsRead') {
                return true;
            }

            if (action === 'markAsRead' && id != null) {
                const targetStr = String(id);
                return (
                    String(docId) === targetStr ||
                    String(numId) === targetStr ||
                    String(eventKey) === targetStr
                );
            }

            if (action === 'markMessageAsRead' && rawId != null) {
                const targetRaw = String(rawId);
                return (
                    String(itemRawId) === targetRaw ||
                    (typeof eventKey === 'string' && eventKey.includes(targetRaw))
                );
            }

            return false;
        });

        await Promise.allSettled(
            targets.map((item) => {
                const targetDocId = item.documentId || item.attributes?.documentId || item.id;
                return fetch(`${STRAPI_BASE_URL}/api/notifications/${encodeURIComponent(targetDocId)}`, {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${STRAPI_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ data: { isRead: true } }),
                    cache: 'no-store',
                });
            })
        );

        return NextResponse.json({
            success: true,
            updatedCount: targets.length,
        });
    } catch (error) {
        console.error('[PUT /api/notifications] Exception:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

