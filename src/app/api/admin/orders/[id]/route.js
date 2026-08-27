/**
 * @file src/app/api/admin/orders/[id]/route.js
 * @description API Route برای آپدیت سفارش توسط ادمین
 *
 * 🔐 چرا این API Route لازم است؟
 *   Client Components نمی‌توانند مستقیماً JWT ادمین را در header بفرستند،
 *   چون توکن در مرورگر expose می‌شود.
 *   این Route به عنوان یک پروکسی امن عمل می‌کند:
 *     1. Client درخواست PUT می‌فرستد (بدون token).
 *     2. این Route از getServerSession روی سرور JWT را می‌گیرد.
 *     3. با آن JWT به Strapi درخواست می‌فرستد.
 *   توکن هرگز به مرورگر نمی‌رسد.
 *
 * ⚠️ Strapi v5:
 *   برای PUT باید از documentId (UUID string) استفاده شود، نه numeric id.
 *   client باید documentId را در request body ارسال کند.
 *
 * 🛡️ Authorization: فقط administrator می‌تواند این route را صدا بزند.
 *
 * ✨ Light Topup:
 *   اگر سفارش از نوع شارژ نور باشد و ادمین تأیید کند،
 *   نور به‌صورت خودکار به موجودی کاربر اضافه می‌شود.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

const STRAPI_API_URL =
    process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

export async function PUT(request, { params }) {
    // ── بررسی session و نقش ─────────────────────────────────────────
    const session = await getServerSession(authOptions);

    if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    /*
     * ⚠️ Next.js 15: params یک Promise است و باید await شود.
     */
    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // ── دریافت payload از client ────────────────────────────────────
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    /*
     * ⚠️ Strapi v5: تفاوت numeric id و documentId
     *
     * Strapi v5 از documentId (UUID string مثل "abc123xyz") برای route های REST استفاده می‌کند.
     * numeric id (مثل 80) فقط برای نمایش داخلی است و PUT با آن 404 می‌دهد.
     *
     * Client باید documentId را در body ارسال کند:
     *   { documentId: "abc123xyz", orderStatus: "shipped", ... }
     *
     * اگر documentId موجود نبود (Strapi v4)، از numeric id استفاده می‌کنیم.
     */
    const { documentId, ...payload } = body;
    const strapiId = documentId || id;

    if (process.env.NODE_ENV === 'development') {
        console.log(`[AdminOrdersAPI] PUT /api/orders/${strapiId} (documentId: ${documentId}, numericId: ${id})`);
    }

    // ── فوروارد درخواست به Strapi با JWT ادمین ─────────────────────
    try {
        const strapiRes = await fetch(`${STRAPI_API_URL}/api/orders/${strapiId}`, {
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
            if (process.env.NODE_ENV === 'development') {
                console.error(`[AdminOrdersAPI] Strapi ${strapiRes.status}:`, JSON.stringify(data));
            }
            return NextResponse.json(
                { error: data?.error?.message || 'Strapi update failed' },
                { status: strapiRes.status }
            );
        }

        // ── اگر ادمین سفارش نور را تأیید کرد، نور به کاربر اضافه شود ────────
        // شرط: هر زمان paymentStatus یا orderStatus به حالت تأیید شده تغییر کند
        const confirmedStatuses = ['paid', 'confirmed', 'processing', 'shipped', 'delivered'];
        const isBeingConfirmed = (
            (payload.paymentStatus && confirmedStatuses.includes(payload.paymentStatus)) ||
            (payload.orderStatus && confirmedStatuses.includes(payload.orderStatus))
        );

        console.log(`[AdminOrdersAPI] isBeingConfirmed=${isBeingConfirmed}, payload:`, JSON.stringify(payload));

        if (isBeingConfirmed) {
            try {
                // دریافت اطلاعات کامل سفارش برای بررسی نوع و مقدار نور
                const orderDetailsRes = await fetch(
                    `${STRAPI_API_URL}/api/orders/${strapiId}?populate[0]=user&populate[1]=items`,
                    {
                        headers: { Authorization: `Bearer ${session.user.jwt}` },
                        cache: 'no-store',
                    }
                );

                if (orderDetailsRes.ok) {
                    const orderDetails = await orderDetailsRes.json();
                    const notes = orderDetails?.data?.notes || '';
                    const userId = orderDetails?.data?.user?.id;

                    console.log(`[AdminOrdersAPI] notes="${notes.substring(0, 150)}", userId=${userId}`);

                    // استخراج مقدار نور با tag اختصاصی [LIGHT_AMOUNT:X]
                    const tagMatch = notes.match(/\[LIGHT_AMOUNT:(\d+)\]/);
                    const isLightTopup = tagMatch !== null || notes.includes('[شارژ نور]');

                    if (isLightTopup && userId) {
                        let lightAmount = 0;

                        if (tagMatch) {
                            // روش جدید: tag مستقیم
                            lightAmount = parseInt(tagMatch[1], 10);
                        } else {
                            // fallback برای سفارش‌های قدیمی‌تر
                            const oldMatch = notes.match(/\[شارژ نور\]\s*(\d+)\s*نور/);
                            if (oldMatch) lightAmount = parseInt(oldMatch[1], 10);
                        }

                        console.log(`[AdminOrdersAPI] isLightTopup=true, lightAmount=${lightAmount}`);

                        if (lightAmount > 0) {
                            const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;
                            const userRes = await fetch(
                                `${STRAPI_API_URL}/api/users/${userId}`,
                                { headers: { Authorization: `Bearer ${STRAPI_TOKEN || session.user.jwt}` } }
                            );

                            if (userRes.ok) {
                                const userData = await userRes.json();
                                const currentLight = userData.light ?? 0;

                                const lightUpdateRes = await fetch(`${STRAPI_API_URL}/api/users/${userId}`, {
                                    method: 'PUT',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        Authorization: `Bearer ${STRAPI_TOKEN || session.user.jwt}`,
                                    },
                                    body: JSON.stringify({ light: currentLight + lightAmount }),
                                });

                                if (lightUpdateRes.ok) {
                                    console.log(`[AdminOrdersAPI] ✅ Light credited: +${lightAmount} to user ${userId} (${currentLight} → ${currentLight + lightAmount})`);
                                } else {
                                    const errText = await lightUpdateRes.text();
                                    console.error(`[AdminOrdersAPI] ❌ Light update FAILED for user ${userId}:`, errText);
                                }
                            } else {
                                console.error(`[AdminOrdersAPI] ❌ Cannot fetch user ${userId}`);
                            }
                        } else {
                            console.warn(`[AdminOrdersAPI] ⚠️ lightAmount=0, skipping light credit`);
                        }
                    }

                    // ── فعال‌سازی و اتصال دوره‌ها و فصل‌ها به کاربر پس از تأیید سفارش ─────
                    const items = orderDetails?.data?.items || [];
                    const courseIdsToConnect = new Set();
                    const chapterIdsToConnect = new Set();

                    for (const item of items) {
                        if (item.chapterId) {
                            chapterIdsToConnect.add(Number(item.chapterId));
                        } else if (item.courseId && !item.slug?.includes('-chapter-')) {
                            courseIdsToConnect.add(Number(item.courseId));
                        } else if (item.type === 'chapter') {
                            const rawId = Number(String(item.chapterId || item.id).replace('chapter-', ''));
                            if (rawId) chapterIdsToConnect.add(rawId);
                        } else if (item.type === 'course' && item.id) {
                            courseIdsToConnect.add(Number(item.id));
                        }
                    }

                    if ((courseIdsToConnect.size > 0 || chapterIdsToConnect.size > 0) && userId) {
                        try {
                            const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;
                            const userRes = await fetch(
                                `${STRAPI_API_URL}/api/users/${userId}?populate[0]=courses`,
                                { headers: { Authorization: `Bearer ${STRAPI_TOKEN || session.user.jwt}` } }
                            );

                            if (userRes.ok) {
                                const userData = await userRes.json();
                                const updatePayload = {};

                                if (courseIdsToConnect.size > 0) {
                                    const existingCourses = Array.isArray(userData.courses)
                                        ? userData.courses.map(c => c.id)
                                        : [];
                                    updatePayload.courses = [...new Set([...existingCourses, ...Array.from(courseIdsToConnect)])];
                                }

                                if (chapterIdsToConnect.size > 0) {
                                    const existingChapters = Array.isArray(userData.enrolledChapters)
                                        ? userData.enrolledChapters.map(Number)
                                        : [];
                                    updatePayload.enrolledChapters = [...new Set([...existingChapters, ...Array.from(chapterIdsToConnect)])];
                                }

                                const userSyncRes = await fetch(`${STRAPI_API_URL}/api/users/${userId}`, {
                                    method: 'PUT',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        Authorization: `Bearer ${STRAPI_TOKEN || session.user.jwt}`,
                                    },
                                    body: JSON.stringify(updatePayload),
                                });

                                if (userSyncRes.ok) {
                                    console.log(`[AdminOrdersAPI] ✅ Activated purchases for user ${userId}: courses=[${Array.from(courseIdsToConnect)}], chapters=[${Array.from(chapterIdsToConnect)}]`);
                                } else {
                                    console.error(`[AdminOrdersAPI] ❌ Failed to activate purchases for user ${userId}:`, await userSyncRes.text());
                                }
                            }
                        } catch (courseSyncErr) {
                            console.error('[AdminOrdersAPI] Course/Chapter activation error:', courseSyncErr?.message);
                        }
                    }
                } else {
                    console.error(`[AdminOrdersAPI] ❌ Cannot fetch order ${strapiId}:`, orderDetailsRes.status);
                }
            } catch (confirmErr) {
                console.error('[AdminOrdersAPI] Order confirmation processing error:', confirmErr?.message);
            }
        }

        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
