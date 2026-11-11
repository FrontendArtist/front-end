import { getCourseCart, purchaseCourseCart, topUpCourseCart } from '@/lib/courseCartApi';
import { getServerSession } from 'next-auth';
import { paymentAuthOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { requestSepToken, SEP_GATEWAY_ACTION_URL } from '@/lib/sepPayment';
import { createGatewayTopUp, createAttempt, findAttempt, updateAttempt, recordGatewayOutcome,
    deliverGatewayOutcome } from '@/lib/gatewayTopUp';

import { getSepMockEnvironmentError, isSepMockEnabled } from '@/lib/sepMock';
import { getCourseCheckout } from '@/lib/courseCheckoutApi';
import { purchaseCourseWithByeMoney } from '@/lib/byeMoneyApi';


function getPaymentRedirectUrl(request) {
    if (isSepMockEnabled()) return new URL('/api/payment/verify', request.url).toString();
    let redirectUrl = process.env.SEP_REDIRECT_URL;
    if (!redirectUrl || redirectUrl.includes('yourdomain.com')) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('SEP_REDIRECT_URL در پروداکشن باید با آدرس واقعی تنظیم شود.');
        }
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
    // آدرس بازگشت پیش از هر اثر جانبی (شارژ، تلاش پرداخت) بررسی می‌شود
    let redirectUrl;
    try {
        redirectUrl = getPaymentRedirectUrl(request);
    } catch (error) {
        console.error('[POST /api/payment/request Config Error]:', error);
        return NextResponse.json({ success: false, message: 'پیکربندی درگاه پرداخت کامل نیست.' }, { status: 500 });
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
        if (body.paymentType === 'light_topup' || body.paymentType === 'course_purchase' || body.paymentType === 'course_cart') {
            const isCoursePurchase = body.paymentType === 'course_purchase';
            const isCourseCart = body.paymentType === 'course_cart';
            let cartTopUp = null;
            let amountNoor = body.amountNoor;
            let pendingItems = [];
            if (!session.user.jwt) {
                return NextResponse.json({ success: false, message: 'نشست شما معتبر نیست.' }, { status: 401 });
            }
            if (isCourseCart) {
                if (typeof body.cartId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.cartId)) {
                    return NextResponse.json({ success: false, message: 'شناسه سبد معتبر نیست.' }, { status: 400 });
                }
                const checkout = await getCourseCart(body.cartId, session.user.jwt);
                if (checkout.status === 'Paid') return NextResponse.json({ success: true, paidWithWallet: true, data: checkout });
                const isCartPayable = checkout.status === 'Ready' || checkout.status === 'AwaitingTopUp' || Boolean(checkout.isUnderReview) || checkout.topUpStatus === 'UnderReview' || checkout.topUpStatus === 'Pending';
                if (!isCartPayable) return NextResponse.json({ success: false, message: 'سبد برای پرداخت آماده نیست؛ نتیجه قبلی را در حساب کاربری پیگیری کنید.' }, { status: 409 });
                if (checkout.status === 'Ready' && checkout.shortfallInNoor === 0) {
                    const data = await purchaseCourseCart(body.cartId, session.user.jwt);
                    return NextResponse.json({ success: true, paidWithWallet: true, data });
                }
                cartTopUp = await topUpCourseCart(body.cartId, session.user.jwt);
                amountNoor = checkout.shortfallInNoor || (cartTopUp?.amountRial ? Math.ceil(cartTopUp.amountRial / 1000) : 1);
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
            const topUp = cartTopUp || (isCoursePurchase
                ? await createGatewayTopUp(amountNoor, session.user.jwt, pendingItems)
                : await createGatewayTopUp(amountNoor, session.user.jwt));
            let attempt = await findAttempt(topUp.clientReferenceId);
            if (!attempt) {
                attempt = await createAttempt(topUp);
            }
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
                ...(isCourseCart ? { topUpRequestId: topUp.topUpRequestId } : {}),
                token: tokenResult.token,
                gatewayUrl: tokenResult.gatewayUrl || SEP_GATEWAY_ACTION_URL,
                resNum: attempt.resNum || topUp.clientReferenceId,
                amount: topUp.amountRial,
            });
        }
        // پرداخت سفارش استرپی (orderId) برای خرید تازه بسته شده است؛ خرید فقط از سبد بای‌مانی (course_cart) انجام می‌شود.
        // payment/verify برای توکن‌های قبلاً صادرشده دست‌نخورده می‌ماند.
        return NextResponse.json(
            { success: false, message: 'پرداخت سفارش قدیمی از این مسیر بسته شده است. لطفاً خرید را از سبد خرید انجام دهید.' },
            { status: 410 }
        );

    } catch (error) {
        console.error('[POST /api/payment/request Error]:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'خطای غیرمنتظره در ثبت درخواست پرداخت' },
            { status: 500 }
        );
    }
}
