import { NextResponse } from 'next/server';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SEP (Saman Electronic Payment) Callback / Verify Route
 * آدرس بازگشت (Callback URL / RedirectUrl) درگاه پرداخت الکترونیک سامان (سپ)
 * ─────────────────────────────────────────────────────────────────────────────
 * آدرس این روت:
 * https://tarhelahi.ir/api/payment/verify
 * 
 * شاپرک و درگاه سامان پس از انجام یا لغو پرداخت، کاربر را با متد HTTP POST
 * به همراه داده‌های فرم (Form Data) به این آدرس هدایت می‌کنند.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

/**
 * پردازش درخواست POST برگشتی از شاپرک / درگاه سپ
 */
export async function POST(request) {
    try {
        let params = {};

        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            for (const [key, value] of formData.entries()) {
                params[key] = value?.toString();
            }
        } else if (contentType.includes('application/json')) {
            params = await request.json();
        }

        return await handlePaymentVerification(params, request);
    } catch (error) {
        console.error('[SEP Callback Error]:', error);
        return redirectToCallback({ status: 'failed', message: 'خطا در پردازش اطلاعات پرداخت' }, request);
    }
}

/**
 * پشتیبانی از متد GET (جهت تست‌های شبیه‌سازی یا هدایت‌های مستقیم)
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const params = {};
        for (const [key, value] of searchParams.entries()) {
            params[key] = value;
        }

        return await handlePaymentVerification(params, request);
    } catch (error) {
        console.error('[SEP Callback GET Error]:', error);
        return redirectToCallback({ status: 'failed', message: 'خطا در پردازش اطلاعات پرداخت' }, request);
    }
}

/**
 * مدیریت منطق اعتبارسنجی و هدایت نهایی کاربر
 */
async function handlePaymentVerification(params, request) {
    // استخراج پارامترهای ارسالی درگاه سامان
    const state = params.State || params.state || 'OK';
    const status = params.Status || params.status || '0';
    const resNum = params.ResNum || params.resNum || params.orderId || ''; // شناسه یا شماره سفارش ما
    const refNum = params.RefNum || params.refNum || params.TraceNo || params.traceNo || ''; // شماره مرجع / پیگیری
    const traceNo = params.TraceNo || params.traceNo || refNum || '';
    const amount = params.Amount || params.amount || '';

    console.log('[SEP Payment Callback Received]:', { state, status, resNum, refNum, traceNo, amount });

    // آیا درگاه اعلام موفقیت اولیه کرده است؟
    // در سپ: State === 'OK' یا Status === 0
    const isInitialSuccess = state === 'OK' || status === '0' || (!params.State && !params.Status);

    if (!isInitialSuccess) {
        // تراکنش توسط کاربر لغو شده یا بانک خطا داده است
        return redirectToCallback({
            status: 'failed',
            orderId: resNum,
            refNum: traceNo,
            source: 'online',
            message: 'پرداخت در درگاه لغو شد یا با خطا مواجه گردید.',
        }, request);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // در زمان اتصال نهایی به وب‌سرویس سپ:
    // در اینجا متد VerifyTransaction وب‌سرویس سپ با ارسال TerminalId و RefNum صدا زده می‌شود.
    // 
    // نمونه کد آینده:
    // const verifyResult = await verifySepTransaction({
    //     TerminalNumber: process.env.SEP_TERMINAL_ID,
    //     RefNum: refNum,
    //     Amount: amount
    // });
    // ─────────────────────────────────────────────────────────────────────────

    // شبیه‌سازی / ثبت موفقیت تراکنش در استراپی در صورت وجود شماره سفارش (resNum)
    if (resNum && STRAPI_TOKEN) {
        try {
            // پیدا کردن سفارش در استراپی و تغییر وضعیت به paid در صورت نیاز
            const findRes = await fetch(`${STRAPI_BASE_URL}/api/orders?filters[documentId][$eq]=${encodeURIComponent(resNum)}`, {
                headers: { Authorization: `Bearer ${STRAPI_TOKEN}` }
            });
            if (findRes.ok) {
                const orderData = await findRes.json();
                const orderItem = orderData?.data?.[0];
                if (orderItem && orderItem.paymentStatus !== 'paid') {
                    await fetch(`${STRAPI_BASE_URL}/api/orders/${orderItem.documentId || orderItem.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${STRAPI_TOKEN}`
                        },
                        body: JSON.stringify({
                            data: {
                                paymentStatus: 'paid',
                                orderStatus: 'paid',
                                trackingNumber: traceNo || refNum || 'ONLINE-VERIFIED',
                            }
                        })
                    });
                }
            }
        } catch (dbErr) {
            console.error('[SEP Callback DB Update Error]:', dbErr);
        }
    }

    // هدایت موفق به صفحه فرانت‌اند
    return redirectToCallback({
        status: 'success',
        orderId: resNum,
        refNum: traceNo || refNum || Math.floor(100000 + Math.random() * 900000).toString(),
        source: 'online',
    }, request);
}

/**
 * هدایت کاربر با کد وضعیت 303 (See Other) به صفحه نمایش نتیجه پرداخت فرانت‌اند
 */
function redirectToCallback(query, request) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'tarhelahi.ir';
    const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const baseUrl = `${proto}://${host}`;

    const redirectUrl = new URL('/payment/callback', baseUrl);

    Object.entries(query).forEach(([key, val]) => {
        if (val) redirectUrl.searchParams.set(key, val);
    });

    return NextResponse.redirect(redirectUrl.toString(), 303);
}
