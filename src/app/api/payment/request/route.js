import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { requestSepToken, SEP_GATEWAY_ACTION_URL } from '@/lib/sepPayment';
import { isOrderPaid } from '@/lib/constants/orderConstants';
import { STRAPI_API_URL } from '@/lib/api';

const STRAPI_BASE_URL = STRAPI_API_URL;
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/payment/request
 * درخواست دریافت توکن پرداخت از سپ (سامان کیش) و آماده‌سازی هدایت کاربر به درگاه
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function POST(request) {
    // 1. بررسی سشن و هویت کاربر
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json(
            { success: false, message: 'برای انجام پرداخت باید وارد حساب کاربری خود شوید.' },
            { status: 401 }
        );
    }

    try {
        const body = await request.json();
        const { orderId } = body;

        if (!orderId) {
            return NextResponse.json(
                { success: false, message: 'شناسه سفارش (orderId) الزامی است.' },
                { status: 400 }
            );
        }

        // 2. استعلام سفارش از استراپی و اعتبارسنجی مالکیت سفارش
        let strapiUrl = `${STRAPI_BASE_URL}/api/orders?filters[documentId][$eq]=${encodeURIComponent(orderId)}&populate=*`;
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
            const fallbackUrl = `${STRAPI_BASE_URL}/api/orders/${orderId}?populate=*`;
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
        if (orderUserId && String(orderUserId) !== String(session.user.id)) {
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
        let redirectUrl = process.env.SEP_REDIRECT_URL;
        if (!redirectUrl || redirectUrl.includes('yourdomain.com')) {
            const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'tarhelahi.ir';
            const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
            redirectUrl = `${proto}://${host}/api/payment/verify`;
        }

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
