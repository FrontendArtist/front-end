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
 * ✨ Light Topup & Course Purchase Integration:
 *   با توجه به قرارداد اتصال ByeMoney و Strapi:
 *   تأیید ادمین صرفاً اندپوینت POST /api/admin/topups/{id}/confirm را در بایمانی فراخوانی می‌کند.
 *   بایمانی پس از تأیید شارژ، خودکار دوره معلق را خریداری کرده و با وب‌هوک رسمی
 *   /api/integrations/byemoney/v1/purchases/confirm دسترسی دوره را در استرپی ثبت می‌کند.
 *   کلیه لاجیک‌های موازی افزایش دستی user.light و افزودن مستقیم به user.courses حذف شده‌اند.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { confirmTopUpWithByeMoney, rejectTopUpWithByeMoney } from '@/lib/byeMoneyApi';

const STRAPI_API_URL =
    process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

export async function PUT(request, { params }) {
    // ── ۱. بررسی session و دسترسی ادمین ─────────────────────────────
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

    // ── ۲. دریافت payload از کلاینت ─────────────────────────────────
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { documentId, topUpId: incomingTopUpId, ...payload } = body;
    const strapiId = documentId || id;

    if (process.env.NODE_ENV === 'development') {
        console.log(`[AdminOrdersAPI] PUT /api/orders/${strapiId} (documentId: ${documentId}, numericId: ${id})`);
    }

    // ── ۳. تشخیص وضعیت تایید یا رد پرداخت ────────────────────────────
    const confirmedStatuses = ['paid', 'confirmed', 'processing', 'shipped', 'delivered'];
    const isBeingConfirmed = Boolean(
        (payload.paymentStatus && confirmedStatuses.includes(payload.paymentStatus)) ||
        (payload.orderStatus && confirmedStatuses.includes(payload.orderStatus))
    );

    const rejectedStatuses = ['failed', 'rejected', 'canceled', 'cancelled'];
    const isBeingRejected = Boolean(
        (payload.paymentStatus && rejectedStatuses.includes(payload.paymentStatus)) ||
        (payload.orderStatus && rejectedStatuses.includes(payload.orderStatus))
    );

    // ── ۴. دریافت جزئیات سفارش از استراپی در صورت تایید یا رد ─────────
    let topUpId = incomingTopUpId || payload.topUpId || null;
    let orderDetails = null;
    let notes = '';
    let trackingNumber = payload.trackingNumber || '';
    let orderNumber = '';

    if (isBeingConfirmed || isBeingRejected) {
        try {
            const orderDetailsRes = await fetch(
                `${STRAPI_API_URL}/api/orders/${strapiId}`,
                {
                    headers: { Authorization: `Bearer ${session.user.jwt}` },
                    cache: 'no-store',
                }
            );

            if (orderDetailsRes.ok) {
                orderDetails = await orderDetailsRes.json();
                const orderData = orderDetails?.data || {};
                notes = orderData.notes || '';
                trackingNumber = trackingNumber || orderData.trackingNumber || '';
                orderNumber = orderData.orderNumber || `ORD-${strapiId}`;

                if (!topUpId) {
                    topUpId = orderData.topUpId || orderData.topUpRequestId || null;
                    if (!topUpId && notes) {
                        const tagMatchTopUp = notes.match(/\[(?:TOPUP_ID|BYEMONEY_TOPUP_ID):([0-9a-fA-F-]{36})\]/i);
                        if (tagMatchTopUp) {
                            topUpId = tagMatchTopUp[1];
                        } else {
                            const guidMatch = notes.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
                            if (guidMatch) {
                                topUpId = guidMatch[0];
                            } else if (trackingNumber && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(trackingNumber.trim())) {
                                topUpId = trackingNumber.trim();
                            }
                        }
                    }
                }
            } else {
                console.error(`[AdminOrdersAPI] ❌ Cannot fetch order ${strapiId}:`, orderDetailsRes.status);
            }
        } catch (fetchErr) {
            console.warn('[AdminOrdersAPI] Could not fetch order details for ByeMoney integration:', fetchErr);
        }
    }

    // ── ۵. مرحله الف: ارسال تایید به ByeMoney (منوط بودن ثبت پرداخت به موفقیت بایمانی) ──
    if (isBeingConfirmed && topUpId) {
        // استخراج مقدار نور جهت ارسال confirmedAmount به بایمانی
        let lightAmount = Number(payload.confirmedAmount || payload.lightAmount || 0);
        if (!lightAmount && notes) {
            const tagMatchLight = notes.match(/\[LIGHT_AMOUNT:(\d+)\]/i);
            if (tagMatchLight) {
                lightAmount = parseInt(tagMatchLight[1], 10);
            } else {
                const textMatchLight = notes.match(/(\d+)\s*نور/);
                if (textMatchLight) {
                    lightAmount = parseInt(textMatchLight[1], 10);
                }
            }
        }
        if (!lightAmount && orderDetails?.data?.totalPrice) {
            // نرخ تبدیل پیش‌فرض: هر ۱ نور = ۱۰۰۰ تومان
            lightAmount = Math.round(Number(orderDetails.data.totalPrice) / 1000);
        }

        const externalTransactionId = trackingNumber || orderNumber || `TRX-${Date.now()}`;

        console.log(`[AdminOrdersAPI] ⚡ Sending Confirm to ByeMoney: /api/admin/topups/${topUpId}/confirm (amount=${lightAmount}, trx=${externalTransactionId})`);

        try {
            const bmConfirmRes = await confirmTopUpWithByeMoney({
                topUpId,
                confirmedAmount: lightAmount,
                externalTransactionId,
                jwt: session.user.jwt,
            });

            console.log(`[AdminOrdersAPI] ⚡ ByeMoney TopUp Confirm result:`, bmConfirmRes);

            // ⚠️ الزام مهم: اگر بایمانی تایید نکرد، به هیچ عنوان سفارش در استراپی paid نمی‌شود
            if (!bmConfirmRes.success) {
                console.error(`[AdminOrdersAPI] ❌ ByeMoney Confirm TopUp Failed:`, bmConfirmRes.error);
                return NextResponse.json(
                    {
                        error: bmConfirmRes.error || 'خطا در تأیید مالی افزایش اعتبار در سامانه بای‌مانی. سفارش تأیید نشد.',
                        details: bmConfirmRes,
                    },
                    { status: bmConfirmRes.status || 400 }
                );
            }
        } catch (bmErr) {
            console.error(`[AdminOrdersAPI] ❌ ByeMoney Confirm TopUp Exception:`, bmErr?.message || bmErr);
            return NextResponse.json(
                { error: 'خطای ارتباط با سامانه پرداخت بای‌مانی هنگام تأیید فیش.' },
                { status: 502 }
            );
        }
    }

    // ── ۶. مرحله ب: ارسال رد فیش به ByeMoney در صورت رد فیش توسط ادمین ──
    if (isBeingRejected && topUpId) {
        try {
            const rejectionReason = payload.rejectionReason || 'فیش واریزی معتبر نمی‌باشد';
            console.log(`[AdminOrdersAPI] ⚡ Sending Reject to ByeMoney: /api/admin/topups/${topUpId}/reject`);
            const bmRejectRes = await rejectTopUpWithByeMoney({
                topUpId,
                reason: rejectionReason,
                jwt: session.user.jwt,
            });
            console.log(`[AdminOrdersAPI] ⚡ ByeMoney TopUp Reject result:`, bmRejectRes);
        } catch (rejectErr) {
            console.error('[AdminOrdersAPI] ❌ ByeMoney Reject TopUp Error:', rejectErr?.message || rejectErr);
        }
    }

    // ── ۷. مرحله ج: به‌روزرسانی وضعیت نمایشی سفارش در استرپی ─────────
    const strapiPayload = { ...payload };
    // پاکسازی فیلدهای داخلی خارج از اسکیما استراپی
    delete strapiPayload.topUpId;
    delete strapiPayload.confirmedAmount;
    delete strapiPayload.externalTransactionId;

    if (isBeingConfirmed) {
        strapiPayload.paymentStatus = 'paid';
        strapiPayload.orderStatus = 'paid';
        strapiPayload.rejectionReason = null;
    } else if (isBeingRejected) {
        strapiPayload.paymentStatus = 'rejected';
        strapiPayload.orderStatus = 'canceled';
    }

    try {
        let strapiRes = await fetch(`${STRAPI_API_URL}/api/orders/${strapiId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.user.jwt}`,
            },
            cache: 'no-store',
            body: JSON.stringify({ data: strapiPayload }),
        });

        // فال‌بک سازگاری: اگر اسکیما استراپی وضعیت paymentStatus='rejected' را نپذیرفت، با 'failed' تلاش شود
        if (!strapiRes.ok && strapiPayload.paymentStatus === 'rejected') {
            const fallbackPayload = { ...strapiPayload, paymentStatus: 'failed' };
            const fallbackRes = await fetch(`${STRAPI_API_URL}/api/orders/${strapiId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.user.jwt}`,
                },
                cache: 'no-store',
                body: JSON.stringify({ data: fallbackPayload }),
            });
            if (fallbackRes.ok) {
                strapiRes = fallbackRes;
            }
        }

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

        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('[AdminOrdersAPI] Server error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
