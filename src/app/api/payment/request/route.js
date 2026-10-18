import { getServerSession } from 'next-auth';
import { paymentAuthOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { requestSepToken, SEP_GATEWAY_ACTION_URL } from '@/lib/sepPayment';
import { isOrderPaid } from '@/lib/constants/orderConstants';
import { STRAPI_API_URL } from '@/lib/api';
import { createGatewayTopUp, createAttempt, updateAttempt, recordGatewayOutcome,
    deliverGatewayOutcome } from '@/lib/gatewayTopUp';

import { getSepMockEnvironmentError, isSepMockEnabled } from '@/lib/sepMock';
import { getCourseCheckout } from '@/lib/courseCheckoutApi';
import { purchaseCourseWithByeMoney } from '@/lib/byeMoneyApi';

const STRAPI_BASE_URL = STRAPI_API_URL;
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

function getPaymentRedirectUrl(request) {
    if (isSepMockEnabled()) return new URL('/api/payment/verify', request.url).toString();
    let redirectUrl = process.env.SEP_REDIRECT_URL;
    if (!redirectUrl || redirectUrl.includes('yourdomain.com')) {
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'tarhelahi.ir';
        const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
        redirectUrl = `${proto}://${host}/api/payment/verify`;
    }
    return redirectUrl;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/payment/request
 * درخواست دریافت توکن پرداخت از سپ (سامان کیش) و آماده‌سازی هدایت کاربر به درگاه
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function POST(request) {
    const mockEnvironmentError = getSepMockEnvironmentError();
    if (mockEnvironmentError) {
        return NextResponse.json({ success: false, message: mockEnvironmentError }, { status: 400 });
    }
    // 1. بررسی سشن و هویت کاربر
    const session = await getServerSession(paymentAuthOptions);
    if (!session?.user?.id) {
        return NextResponse.json(
            { success: false, message: 'برای انجام پرداخت باید وارد حساب کاربری خود شوید.' },
            { status: 401 }
        );
    }

    try {
        const body = await request.json();
        if (body.paymentType === 'light_topup' || body.paymentType === 'course_purchase') {
            const isCoursePurchase = body.paymentType === 'course_purchase';
            let amountNoor = body.amountNoor;
            let pendingItems = [];
            if (!session.user.jwt) {
                return NextResponse.json({ success: false, message: 'نشست شما معتبر نیست.' }, { status: 401 });
            }
            if (isCoursePurchase) {
                if (typeof body.externalCourseId !== 'string' || !body.externalCourseId.trim() || body.externalCourseId.length > 100) {
                    return NextResponse.json({ success: false, message: 'شناسه دوره معتبر نیست.' }, { status: 400 });
                }
                const checkout = await getCourseCheckout(body.externalCourseId, session.user.jwt);
                if (checkout.purchaseStatus !== 'NotPurchased') {
                    return NextResponse.json({ success: false, message: 'خرید این دوره قبلاً ثبت شده است؛ وضعیت آن را در دوره‌های من پیگیری کنید.' }, { status: 409 });
                }
                if (checkout.shortfallInNoor === 0) {
                    const purchase = await purchaseCourseWithByeMoney({ externalCourseId: body.externalCourseId, jwt: session.user.jwt });
                    return NextResponse.json({ ...purchase, paidWithWallet: purchase.success }, { status: purchase.success ? 200 : 409 });
                }
                amountNoor = checkout.shortfallInNoor;
                pendingItems = [{ itemType: 1, externalId: checkout.externalCourseId, priceNoorSnapshot: checkout.priceInNoor }];
            }
            if (!Number.isSafeInteger(amountNoor) || amountNoor <= 0) {
                return NextResponse.json({ success: false, message: 'مقدار نور معتبر نیست.' }, { status: 400 });
            }
            const topUp = isCoursePurchase
                ? await createGatewayTopUp(amountNoor, session.user.jwt, pendingItems)
                : await createGatewayTopUp(amountNoor, session.user.jwt);
            let attempt = await createAttempt(topUp);
            const redirectUrl = getPaymentRedirectUrl(request);
            const tokenResult = await requestSepToken({
                amount: topUp.amountRial,
                resNum: topUp.clientReferenceId,
                redirectUrl,
                cellNumber: session.user.phoneNumber || null,
            });
            if (!tokenResult.success) {
                const recorded = await recordGatewayOutcome(attempt, {
                    stage: 'callback', kind: 'Unpaid',
                    bankResultCode: tokenResult.errorCode || 'TOKEN_FAILED',
                    rawPayload: { tokenRequest: {
                        success: false, errorCode: tokenResult.errorCode, errorDesc: tokenResult.errorDesc,
                    } },
                });
                const delivery = await deliverGatewayOutcome(recorded).catch(() => ({ ok: false }));
                await updateAttempt(attempt, { status: delivery.ok ? 'failed' : 'pending_sync',
                    lastError: tokenResult.errorCode || 'TOKEN_FAILED' });
                return NextResponse.json({ success: false, message: tokenResult.errorDesc || 'دریافت توکن انجام نشد.' }, { status: 502 });
            }
            try {
                attempt = await updateAttempt(attempt, { status: 'token_issued' });
                if (!attempt || attempt.status !== 'token_issued') {
                    throw new Error('ثبت وضعیت صدور توکن در سامانه انجام نشد.');
                }
            } catch (updateError) {
                console.error('[SEP Token Issued Update Error]:', updateError);
                return NextResponse.json(
                    {
                        success: false,
                        message: 'ثبت وضعیت توکن پرداخت در سامانه با خطا مواجه شد.',
                    },
                    { status: 500 }
                );
            }
            return NextResponse.json({
                success: true,
                token: tokenResult.token,
                gatewayUrl: tokenResult.gatewayUrl || SEP_GATEWAY_ACTION_URL,
                resNum: attempt.resNum || topUp.clientReferenceId,
                amount: topUp.amountRial,
            });
        }
        const { orderId } = body;

        if (!orderId) {
            return NextResponse.json(
                { success: false, message: 'شناسه سفارش (orderId) الزامی است.' },
                { status: 400 }
            );
        }

        // 2. استعلام سفارش از استراپی و اعتبارسنجی مالکیت سفارش
        const orderQuery = 'fields[0]=totalPrice&fields[1]=paymentStatus&fields[2]=orderStatus&fields[3]=phone&populate[user][fields][0]=id';
        const strapiUrl = `${STRAPI_BASE_URL}/api/orders?filters[documentId][$eq]=${encodeURIComponent(orderId)}&${orderQuery}`;
        let res = await fetch(strapiUrl, {
            headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
            cache: 'no-store',
        });

        if (!res.ok) {
            throw new Error(`خطا در استعلام سفارش از دیتابیس (${res.status})`);
        }

        let orderData = await res.json();
        let order = orderData?.data?.[0];

        // Fallback: اگر با documentId پیدا نشد، با ID عددی بررسی شود
        if (!order && !isNaN(Number(orderId))) {
            const fallbackUrl = `${STRAPI_BASE_URL}/api/orders/${encodeURIComponent(orderId)}?${orderQuery}`;
            const fallbackRes = await fetch(fallbackUrl, {
                headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
                cache: 'no-store',
            });
            if (fallbackRes.ok) {
                const fallbackData = await fallbackRes.json();
                order = fallbackData?.data;
            }
        }

        if (!order) {
            return NextResponse.json(
                { success: false, message: 'سفارش مورد نظر یافت نشد.' },
                { status: 404 }
            );
        }

        // بررسی مالکیت سفارش توسط کاربر لاگین‌شده
        const orderUserId = order.user?.id || order.attributes?.user?.data?.id;
        if (!orderUserId || String(orderUserId) !== String(session.user.id)) {
            return NextResponse.json(
                { success: false, message: 'شما دسترسی به این سفارش ندارید.' },
                { status: 403 }
            );
        }

        // 3. بررسی اینکه سفارش قبلاً پرداخت نشده باشد (جلوگیری از Double Payment)
        if (isOrderPaid(order)) {
            return NextResponse.json(
                { success: false, message: 'این سفارش قبلاً با موفقیت پرداخت و تسویه شده است.' },
                { status: 400 }
            );
        }

        const orderStatus = order.orderStatus || order.attributes?.orderStatus;
        const paymentStatus = order.paymentStatus || order.attributes?.paymentStatus;
        if (orderStatus !== 'pending' || paymentStatus !== 'pending_payment') {
            return NextResponse.json(
                { success: false, message: 'سفارش انتخاب‌شده لغو یا بسته شده است. لطفاً صفحه را تازه‌سازی کنید و دوباره پرداخت را بزنید.' },
                { status: 400 }
            );
        }

        // 4. محاسبه مبلغ قابل پرداخت به ریال (تبدیل تومان به ریال: ضرب در 10)
        const tomanPrice = Number(order.totalPrice || order.attributes?.totalPrice || 0);
        if (tomanPrice <= 0) {
            return NextResponse.json(
                { success: false, message: 'مبلغ این سفارش صفر است و نیازی به اتصال به درگاه ندارد.' },
                { status: 400 }
            );
        }
        const rialAmount = Math.round(tomanPrice * 10);

        // 5. ساخت شناسه یکتای ResNum برای سپ (از documentId یا شناسه سفارش استفاده می‌شود)
        const resNum = order.documentId || String(order.id);

        // 6. تعیین آدرس بازگشت (RedirectUrl برای شاپرک)
        // اولویت با SEP_REDIRECT_URL در فایل env، در غیر این صورت ساخت خودکار بر اساس هاست درخواست
        const redirectUrl = getPaymentRedirectUrl(request);

        const userPhone = order.phone || order.attributes?.phone || session.user.phoneNumber || null;

        // 7. فراخوانی وب‌سرویس دریافت توکن سپ
        const tokenResult = await requestSepToken({
            amount: rialAmount,
            resNum: resNum,
            redirectUrl: redirectUrl,
            cellNumber: userPhone,
        });

        if (!tokenResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    message: tokenResult.errorDesc || 'دریافت توکن پرداخت از بانک سامان با خطا مواجه شد.',
                    errorCode: tokenResult.errorCode,
                },
                { status: 400 }
            );
        }

        // 8. بازگرداندن توکن و اکشن فرم به کلاینت جهت سابمیت اتوماتیک به درگاه سامان
        return NextResponse.json({
            success: true,
            token: tokenResult.token,
            gatewayUrl: tokenResult.gatewayUrl || SEP_GATEWAY_ACTION_URL,
            resNum: resNum,
            amount: rialAmount,
        });

    } catch (error) {
        console.error('[POST /api/payment/request Error]:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'خطای غیرمنتظره در ثبت درخواست پرداخت' },
            { status: 500 }
        );
    }
}
