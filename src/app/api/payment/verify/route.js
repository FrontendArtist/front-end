import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
    verifySepTransaction,
    reverseSepTransaction,
    getSepErrorMessage,
    SEP_TERMINAL_ID,
} from '@/lib/sepPayment';
import { ORDER_STATUS, PAYMENT_STATUS, isOrderPaid } from '@/lib/constants/orderConstants';
import { STRAPI_API_URL } from '@/lib/api';

const STRAPI_BASE_URL = STRAPI_API_URL;
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/payment/verify
 * آدرس بازگشت (Callback / RedirectUrl) شرکت پرداخت الکترونیک سامان (شاپرک)
 * ─────────────────────────────────────────────────────────────────────────────
 * شاپرک کاربر را پس از تکمیل یا انصراف با متد HTTP POST و فرم‌دیتا به این آدرس هدایت می‌کند.
 * 
 * ⚠️ نکته امنیتی بحرانی (SameSite Cookie):
 * به دلیل اینکه درخواست از دامنه شاپرک به صورت Cross-Site POST ارسال می‌شود، مرورگرها
 * کوکی‌های session (نظیر NextAuth) را به دلیل سیاست SameSite=Lax ارسال نمی‌کنند.
 * به همین دلیل، در این روت نباید به getServerSession تکیه شود. شناسایی سفارش صرفاً از
 * طریق ResNum بازگشتی از بانک و توکن سیستمی STRAPI_API_TOKEN انجام می‌پذیرد.
 * ─────────────────────────────────────────────────────────────────────────────
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
        } else {
            // تلاش برای خواندن متن خام در صورت عدم تطابق هدر
            const text = await request.text();
            const searchParams = new URLSearchParams(text);
            for (const [key, value] of searchParams.entries()) {
                params[key] = value;
            }
        }

        return await handlePaymentVerification(params, request);
    } catch (error) {
        console.error('[SEP Callback POST Fatal Error]:', error);
        return redirectToResult({
            status: 'failed',
            message: 'خطای سیستمی در پردازش پاسخ درگاه بانکی',
        }, request);
    }
}

/**
 * متد GET برای پشتیبانی از تست‌های دستی یا موارد هدایت مستقیم
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
        console.error('[SEP Callback GET Fatal Error]:', error);
        return redirectToResult({
            status: 'failed',
            message: 'خطای سیستمی در پردازش اطلاعات پرداخت',
        }, request);
    }
}

/**
 * پردازش و اعتبارسنجی تراکنش، استعلام از دیتابیس، تایید بانکی و فعال‌سازی سفارش
 */
async function handlePaymentVerification(params, request) {
    // 1. استخراج فیلدهای ارسالی سپ
    const state = (params.State || params.state || '').trim();
    const status = (params.Status || params.status || '').trim();
    const resNum = (params.ResNum || params.resNum || '').trim(); // شناسه سفارش ما
    const refNum = (params.RefNum || params.refNum || '').trim(); // رسید دیجیتالی سپ
    const traceNo = (params.TraceNo || params.traceNo || '').trim(); // شماره پیگیری
    const terminalId = params.TerminalId || params.MID || SEP_TERMINAL_ID;
    const rrn = (params.RRN || params.rrn || '').trim();
    const securePan = (params.SecurePan || params.securePan || '').trim();
    const hashedCardNumber = (params.HashedCardNumber || params.hashedCardNumber || '').trim();

    console.log('[SEP Payment Callback Received]:', {
        state,
        status,
        resNum,
        refNum,
        traceNo,
        rrn,
        terminalId,
    });

    // اگر شناسه سفارش وجود نداشته باشد امکان پیگیری نیست
    if (!resNum) {
        return redirectToResult({
            status: 'failed',
            message: 'شناسه سفارش (ResNum) در اطلاعات دریافتی از بانک یافت نشد.',
        }, request);
    }

    // 2. واکشی سفارش از استراپی با توکن سیستمی STRAPI_TOKEN
    let order = null;
    try {
        let findUrl = `${STRAPI_BASE_URL}/api/orders?filters[documentId][$eq]=${encodeURIComponent(resNum)}&populate=*`;
        let findRes = await fetch(findUrl, {
            headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
            cache: 'no-store',
        });

        if (findRes.ok) {
            const data = await findRes.json();
            order = data?.data?.[0];
        }

        // Fallback: اگر با documentId پیدا نشد، شاید شناسه عددی ارسال شده باشد
        if (!order && !isNaN(Number(resNum))) {
            let numRes = await fetch(`${STRAPI_BASE_URL}/api/orders/${resNum}?populate=*`, {
                headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
                cache: 'no-store',
            });
            if (numRes.ok) {
                const numData = await numRes.json();
                order = numData?.data;
            }
        }
    } catch (dbReadErr) {
        console.error('[SEP Callback DB Fetch Error]:', dbReadErr);
    }

    if (!order) {
        return redirectToResult({
            status: 'failed',
            orderId: resNum,
            refNum: refNum || traceNo,
            message: 'سفارش متناظر در پایگاه داده فروشگاه یافت نشد.',
        }, request);
    }

    const orderDocId = order.documentId || String(order.id);
    const orderTomanPrice = Number(order.totalPrice || order.attributes?.totalPrice || 0);
    const expectedRialPrice = Math.round(orderTomanPrice * 10);

    // 3. بررسی پیشگیری از Double Spending (آیا سفارش قبلاً پرداخت و تایید شده است؟)
    if (isOrderPaid(order)) {
        console.log(`[SEP Callback] Order ${orderDocId} is already paid. Skipping verification.`);
        return redirectToResult({
            status: 'success',
            orderId: orderDocId,
            refNum: order.refNum || refNum || traceNo,
            traceNo: order.traceNo || traceNo,
        }, request);
    }

    // 4. بررسی وضعیت اولیه بازگشتی از بانک (State)
    // اگر State برابر OK نباشد، کاربر پرداخت را لغو کرده یا تراکنش در شاپرک ناموفق بوده است
    if (state !== 'OK' || !refNum) {
        const errorDesc = getSepErrorMessage(state) || 'پرداخت در درگاه لغو شد یا با خطا مواجه گردید.';
        console.warn('[SEP Callback State Not OK]:', { state, errorDesc, resNum });

        // ثبت وضعیت ناموفق در سفارش
        await updateOrderInStrapi(orderDocId, {
            paymentStatus: PAYMENT_STATUS.FAILED,
            orderStatus: ORDER_STATUS.CANCELLED,
            notes: appendOrderNote(order.notes, `❌ پرداخت ناموفق در درگاه: ${errorDesc} (کد وضعیت: ${state})`),
        });

        const isCanceled = state === 'CanceledByUser';
        return redirectToResult({
            status: isCanceled ? 'cancel' : 'failed',
            orderId: orderDocId,
            message: errorDesc,
        }, request);
    }

    // 5. فراخوانی متد رسمی وریفای سپ (VerifyTransaction)
    console.log('[SEP Verifying Transaction]:', { refNum, terminalNumber: terminalId });
    const verifyResult = await verifySepTransaction({
        refNum: refNum,
        terminalNumber: terminalId,
    });

    console.log('[SEP Verify Result]:', verifyResult);

    // 6. ارزیابی نتیجه وریفای
    if (!verifyResult.success) {
        const errorMsg = verifyResult.resultDescription || 'تایید تراکنش از سمت بانک با خطا مواجه شد.';
        console.error('[SEP Verify Failed]:', errorMsg);

        await updateOrderInStrapi(orderDocId, {
            paymentStatus: PAYMENT_STATUS.FAILED,
            notes: appendOrderNote(order.notes, `❌ عدم تایید تراکنش توسط بانک: ${errorMsg} (کد: ${verifyResult.resultCode})`),
        });

        return redirectToResult({
            status: 'failed',
            orderId: orderDocId,
            refNum: refNum,
            message: errorMsg,
        }, request);
    }

    // 7. اعتبارسنجی تطابق مبلغ پرداخت‌شده با مبلغ فاکتور (Security Check)
    const paidRialAmount = Number(verifyResult.transactionDetail?.OrginalAmount || verifyResult.transactionDetail?.AffectiveAmount || 0);
    if (paidRialAmount > 0 && paidRialAmount !== expectedRialPrice) {
        console.error('[SEP Amount Mismatch Alert!]:', {
            paidRialAmount,
            expectedRialPrice,
            orderDocId,
        });

        // اقدام به بازگشت وجه (Reverse) به دلیل مغایرت مبلغ
        try {
            await reverseSepTransaction({ refNum, terminalNumber: terminalId });
        } catch (revErr) {
            console.error('[SEP Auto-Reverse Error]:', revErr);
        }

        await updateOrderInStrapi(orderDocId, {
            paymentStatus: PAYMENT_STATUS.FAILED,
            notes: appendOrderNote(order.notes, `🚨 هشدار مغایرت مبلغ: مبلغ پرداخت‌شده (${paidRialAmount} ریال) با مبلغ سفارش (${expectedRialPrice} ریال) مطابقت ندارد. دستور برگشت وجه صادر شد.`),
        });

        return redirectToResult({
            status: 'failed',
            orderId: orderDocId,
            refNum: refNum,
            message: 'مبلغ پرداختی با مبلغ فاکتور سفارش مطابقت ندارد و وجه به حساب شما بازگردانده خواهد شد.',
        }, request);
    }

    // 8. پرداخت با موفقیت کامل تایید شد: ذخیره اطلاعات در فیلدهای اختصاصی دیتابیس استراپی
    const transactionDetail = verifyResult.transactionDetail || {};
    const finalTraceNo = transactionDetail.StraceNo || traceNo || refNum;
    const finalRrn = transactionDetail.RRN || rrn || '';
    const finalMaskedPan = transactionDetail.MaskedPan || securePan || '';
    const finalHashedPan = transactionDetail.HashedPan || hashedCardNumber || '';

    const orderUpdatePayload = {
        orderStatus: ORDER_STATUS.PAID,
        paymentStatus: PAYMENT_STATUS.PAID,
        trackingNumber: finalTraceNo,
        // فیلدهای اختصاصی ساختاریافته سپ
        refNum: refNum,
        traceNo: finalTraceNo,
        rrn: finalRrn,
        securePan: finalMaskedPan,
        hashedCardNumber: finalHashedPan,
        paymentDate: new Date().toISOString(),
        notes: appendOrderNote(
            order.notes,
            `✅ پرداخت موفق درگاه سامان (سپ)\nرسید دیجیتال (RefNum): ${refNum}\nکد رهگیری: ${finalTraceNo}\nشماره مرجع (RRN): ${finalRrn}\nشماره کارت: ${finalMaskedPan}\nتاریخ تراکنش: ${transactionDetail.StraceDate || new Date().toLocaleString('fa-IR')}`
        ),
    };

    const updateSuccess = await updateOrderInStrapi(orderDocId, orderUpdatePayload, order.id);
    if (!updateSuccess) {
        console.error(`[SEP Callback] Critical: Failed to update order status for order ${orderDocId}`);
    } else {
        try {
            revalidatePath('/admin/orders');
            revalidatePath('/profile/orders');
            revalidatePath(`/profile/orders/${orderDocId}`);
        } catch (revErr) {
            console.warn('[SEP Callback revalidatePath warning]:', revErr?.message);
        }
    }

    // 9. فعال‌سازی خودکار دسترسی دوره‌ها و شارژ نور برای کاربر در استراپی
    const orderUserId = order.user?.id || order.attributes?.user?.data?.id;
    if (orderUserId) {
        await grantUserAccessAndCredits(orderUserId, order);
    }

    // 10. هدایت نهایی کاربر با کد وضعیت 303 (See Other) به صفحه نمایش نتیجه پرداخت
    return redirectToResult({
        status: 'success',
        orderId: orderDocId,
        refNum: refNum,
        traceNo: finalTraceNo,
    }, request);
}

/**
 * آپدیت سفارش در Strapi v5 با استفاده از documentId و شناسه عددی به عنوان fallback
 */
async function updateOrderInStrapi(documentId, data, numericId = null) {
    if (!documentId && !numericId) {
        console.error('[updateOrderInStrapi] No order identifier provided.');
        return false;
    }
    if (!STRAPI_TOKEN) {
        console.error('[updateOrderInStrapi] STRAPI_TOKEN is missing in environment variables.');
        return false;
    }

    const identifiersToTry = [documentId, numericId ? String(numericId) : null].filter(Boolean);

    for (const id of identifiersToTry) {
        try {
            const url = `${STRAPI_BASE_URL}/api/orders/${id}`;
            const res = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${STRAPI_TOKEN}`,
                },
                cache: 'no-store',
                body: JSON.stringify({ data }),
            });

            if (res.ok) {
                console.log(`[updateOrderInStrapi] ✅ Successfully updated order ${id} to paid state.`);
                return true;
            }

            const errText = await res.text().catch(() => '');
            console.warn(`[updateOrderInStrapi] Attempt with id "${id}" failed (${res.status} ${res.statusText}):`, errText);
        } catch (err) {
            console.error(`[updateOrderInStrapi Error for id "${id}"]:`, err);
        }
    }

    return false;
}

/**
 * افزودن متن گزارش به یادداشت‌های موجود سفارش
 */
function appendOrderNote(existingNotes, newNote) {
    if (!existingNotes) return newNote;
    return `${existingNotes.trim()}\n\n---\n${newNote}`;
}

/**
 * اعطای دسترسی به دوره‌ها/فصل‌ها و شارژ نور کاربر در صورت وجود در اقلام سفارش
 */
async function grantUserAccessAndCredits(userId, order) {
    if (!userId || !STRAPI_TOKEN) return;

    try {
        const items = order.items || order.attributes?.items || [];

        // استخراج آیدی دوره‌ها و فصل‌ها
        const courseIds = items
            .filter((i) => i.__component === 'order.course-order-item' || i.type === 'course')
            .map((i) => Number(i.courseId || i.id))
            .filter(Boolean);

        const chapterIds = items
            .filter((i) => (i.__component === 'order.course-order-item' && i.chapterId) || i.type === 'chapter')
            .map((i) => Number(i.chapterId || (typeof i.id === 'string' ? i.id.replace('chapter-', '') : i.id)))
            .filter(Boolean);

        // واکشی پروفایل کاربر
        const userRes = await fetch(`${STRAPI_BASE_URL}/api/users/${userId}?populate[0]=courses`, {
            headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
        });

        if (!userRes.ok) return;
        const userData = await userRes.json();

        const updatePayload = {};

        if (courseIds.length > 0) {
            const existingCourses = (userData.courses || []).map((c) => c.id);
            updatePayload.courses = [...new Set([...existingCourses, ...courseIds])];
        }

        if (chapterIds.length > 0) {
            const existingChapters = Array.isArray(userData.enrolledChapters)
                ? userData.enrolledChapters.map(Number)
                : [];
            updatePayload.enrolledChapters = [...new Set([...existingChapters, ...chapterIds])];
        }

        // بررسی آیتم شارژ نور
        const lightItem = items.find((i) => i.slug === 'light-topup' || i.type === 'light_topup');
        if (lightItem) {
            const match = String(order.notes || '').match(/\[LIGHT_AMOUNT:(\d+)\]/);
            const lightAmount = match ? Number(match[1]) : Number(lightItem.lightAmount || 0);
            if (lightAmount > 0) {
                updatePayload.light = (userData.light ?? 0) + lightAmount;
            }
        }

        if (Object.keys(updatePayload).length > 0) {
            await fetch(`${STRAPI_BASE_URL}/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${STRAPI_TOKEN}`,
                },
                body: JSON.stringify(updatePayload),
            });
            console.log(`[SEP Callback] Successfully granted courses/credits to user ${userId}`);
        }
    } catch (grantErr) {
        console.error('[grantUserAccessAndCredits Error]:', grantErr);
    }
}

/**
 * ریدایرکت کاربر با کد وضعیت 303 (See Other) به صفحه نمایش نتیجه پرداخت
 */
function redirectToResult(query, request) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'tarhelahi.ir';
    const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const baseUrl = `${proto}://${host}`;

    const redirectUrl = new URL('/checkout/result', baseUrl);

    Object.entries(query).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
            redirectUrl.searchParams.set(key, String(val));
        }
    });

    return NextResponse.redirect(redirectUrl.toString(), 303);
}
