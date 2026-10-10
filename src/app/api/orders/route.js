import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD } from "@/lib/constants/orderConstants";
import { STRAPI_API_URL } from "@/lib/api";

import { LIGHT_TO_TOMAN_RATE } from '@/lib/constants';
import { isIranianPhoneNumber } from '@/lib/phoneUtils';

const STRAPI_BASE_URL = STRAPI_API_URL;
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

// --------------------------------------------------------------------------
// GET /api/orders : دریافت لیست سفارشات کاربر همراه با دوره‌های داخل آن
// --------------------------------------------------------------------------
export async function GET(request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    }

    try {
        // ── BUG FIX ─────────────────────────────────────────────────────────────
        // صفحه /profile/orders/[id] می‌تواند ?documentId=xyz بفرستد تا فقط
        // یک سفارش خاص برگردد. قبلاً این پارامتر کاملاً نادیده گرفته می‌شد.
        const { searchParams } = new URL(request.url);
        const documentId = searchParams.get('documentId');

        let strapiUrl;
        if (documentId) {
            // دریافت یک سفارش خاص با documentId + تأیید مالکیت کاربر
            strapiUrl = `${STRAPI_BASE_URL}/api/orders`
                + `?filters[documentId][$eq]=${encodeURIComponent(documentId)}`
                + `&filters[user][id][$eq]=${session.user.id}`
                + `&populate=*`;
        } else {
            // دریافت همه سفارشات کاربر (رفتار قبلی)
            strapiUrl = `${STRAPI_BASE_URL}/api/orders`
                + `?filters[user][id][$eq]=${session.user.id}`
                + `&pagination[pageSize]=100`
                + `&sort=createdAt:desc`
                + `&populate=*`;
        }

        const res = await fetch(strapiUrl, {
            headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` },
            cache: 'no-store'
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error("Strapi GET Orders Error:", errText);
            throw new Error("Failed to fetch orders from Strapi");
        }
        const data = await res.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error("GET Orders Error:", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

// --------------------------------------------------------------------------
// POST /api/orders : ایجاد سفارش جدید (اتصال مستقیم به کاربر و دوره‌ها)
// --------------------------------------------------------------------------
// قیمت و وضعیت مالی در Strapi تعیین می‌شوند؛ مرورگر فقط اقلام را انتخاب می‌کند.
export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'برای خرید وارد حساب خود شوید.' }, { status: 401 });
    }
    if (!STRAPI_TOKEN) {
        return NextResponse.json({ message: 'سرویس ثبت سفارش در دسترس نیست.' }, { status: 503 });
    }
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ message: 'درخواست سفارش معتبر نیست.' }, { status: 400 });
    }
    if (!body || !Array.isArray(body.cartItems) || body.cartItems.length === 0 || body.cartItems.length > 100 ||
        body.cartItems.some(item => !item || !['course', 'chapter', 'product', 'light_topup'].includes(item.type) ||
            (item.type === 'course' && item.chapterId != null) || (item.type === 'chapter' && item.courseId == null) ||
            (item.quantity != null && (!Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity) <= 0 || (item.type !== 'product' && Number(item.quantity) !== 1))))) {
        return NextResponse.json({ message: 'اقلام یا تعداد سبد معتبر نیست.' }, { status: 400 });
    }
    try {
        const userRes = await fetch(STRAPI_BASE_URL + '/api/users/' + session.user.id + '?populate[0]=address', {
            headers: { Authorization: 'Bearer ' + STRAPI_TOKEN }, cache: 'no-store',
        });
        if (!userRes.ok) throw new Error('اطلاعات حساب برای ثبت سفارش در دسترس نیست.');
        const user = await userRes.json();
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
        const recipientName = user.address?.recipientName?.trim();
        const validRecipient = recipientName && recipientName.length > 1 && !/^\d+$/.test(recipientName);
        const fullName = name || (validRecipient ? recipientName : null)
            || (user.username && !/^\d+$/.test(user.username) ? user.username : null)
            || (user.phoneNumber ? `کاربر (${user.phoneNumber})` : null)
            || (session.user.phoneNumber ? `کاربر (${session.user.phoneNumber})` : null)
            || session.user.name || 'کاربر فروشگاه';
        const orderRes = await fetch(STRAPI_BASE_URL + '/api/orders/checkout', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + STRAPI_TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: {
                user: session.user.id,
                cartItems: body.cartItems.map(item => ({ type: item.type, id: item.id,
                    documentId: item.documentId, courseId: item.courseId, chapterId: item.chapterId, lightAmount: item.lightAmount, quantity: item.quantity == null ? 1 : Number(item.quantity) })),
                couponCode: body.couponCode ?? body.coupon?.code ?? null,
                paymentMethod: body.paymentMethod === PAYMENT_METHOD.CARD_TO_CARD ? PAYMENT_METHOD.CARD_TO_CARD : PAYMENT_METHOD.ONLINE,
                pricingContext: { lightToTomanRate: LIGHT_TO_TOMAN_RATE,
                    isForeign: Boolean(user.is_foreigner || (user.phoneNumber && !isIranianPhoneNumber(user.phoneNumber))) },
                fullName,
                address: user.address ? [user.address.province, user.address.city, user.address.fullAddress].filter(Boolean).join(' - ') : (typeof body.shippingAddress === 'string' && body.shippingAddress.trim() ? body.shippingAddress.trim() : 'آدرس وارد نشده است'),
                postalCode: user.address?.postalCode || '0000000000',
                phone: user.address?.recipientPhone || user.phoneNumber || session.user.phoneNumber || '00000000000',
                email: user.email || session.user.email || 'no-email@tarhelahi.com',
                notes: typeof body.notes === 'string' ? body.notes.trim() : '',
            } }),
        });
        const result = await orderRes.json();
        if (!orderRes.ok) {
            return NextResponse.json({ message: result?.error?.message || 'ثبت سفارش انجام نشد.' },
                { status: orderRes.status });
        }
        const order = result?.data?.attributes || result?.data;
        // اعطای دوره فقط از lifecycle سفارش معتبر انجام می‌شود.
        if (order?.paymentStatus === PAYMENT_STATUS.PAID) {
            await fetch(STRAPI_BASE_URL + '/api/users/' + session.user.id, {
                method: 'PUT', headers: { Authorization: 'Bearer ' + STRAPI_TOKEN, 'Content-Type': 'application/json' },
                body: JSON.stringify({ cartData: null }),
            });
        }
        if (order?.paymentMethod === PAYMENT_METHOD.ONLINE) {
            (async () => {
                try {
                    const prevOrdersUrl = `${STRAPI_BASE_URL}/api/orders`
                        + `?filters[user][id][$eq]=${session.user.id}`
                        + `&filters[paymentMethod][$eq]=${PAYMENT_METHOD.ONLINE}`
                        + `&filters[orderStatus][$eq]=${ORDER_STATUS.PENDING}`
                        + `&filters[paymentStatus][$eq]=${PAYMENT_STATUS.PENDING_PAYMENT}`
                        + `&pagination[pageSize]=20`;

                    const prevOrdersRes = await fetch(prevOrdersUrl, {
                        headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` },
                        cache: 'no-store'
                    });

                    if (prevOrdersRes.ok) {
                        const prevOrdersData = await prevOrdersRes.json();
                        const pendingOrders = prevOrdersData?.data || [];

                        for (const prevOrder of pendingOrders) {
                            const targetId = prevOrder.documentId || prevOrder.id;
                            if (!targetId || targetId === result?.data?.documentId || targetId === result?.data?.id) continue;

                            const existingNotes = prevOrder.notes || prevOrder.attributes?.notes || '';
                            await fetch(`${STRAPI_BASE_URL}/api/orders/${targetId}`, {
                                method: 'PUT',
                                headers: {
                                    'Authorization': `Bearer ${STRAPI_TOKEN}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    data: {
                                        orderStatus: ORDER_STATUS.CANCELLED,
                                        paymentStatus: PAYMENT_STATUS.FAILED,
                                        rejectionReason: 'لغو خودکار به دلیل ثبت فرآیند خرید جدید از سبد خرید',
                                        notes: (existingNotes ? `${existingNotes.trim()}\n\n` : '') +
                                               '❌ لغو خودکار: این سفارش به دلیل شروع مجدد فرآیند خرید جدید از سبد خرید لغو گردید.',
                                    }
                                })
                            }).catch((err) => console.warn('[Auto-Cancel Prev Order Warning]:', err));
                        }
                    }
                } catch (prevErr) {
                    console.warn('[Auto-Cancel Prev Orders Check Error]:', prevErr);
                }
            })();
        }

        try {
            revalidatePath('/profile/orders');
            revalidatePath('/products', 'layout');
            revalidatePath('/product', 'layout');
        } catch (error) {
            console.warn('بازخوانی کش سفارش انجام نشد:', error.message);
        }
        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error('POST Orders Error:', error);
        return NextResponse.json({ message: 'ثبت سفارش موقتاً در دسترس نیست.' }, { status: 503 });
    }
}
