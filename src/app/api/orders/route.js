import { getServerSession } from "next-auth";
import { authOptions, paymentAuthOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { PAYMENT_METHOD } from "@/lib/constants/orderConstants";
import { STRAPI_API_URL } from "@/lib/api";

import { getConversionRateWithByeMoney, getMyCoursePurchases, getCoursePurchaseReceipt, getMyCourseOrders, getMyCourseOrderDetails, CourseOrderId } from '@/lib/byeMoneyApi';
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
        const { searchParams } = new URL(request.url);
        const documentId = searchParams.get('documentId') || searchParams.get('orderId');
        const purchaseId = searchParams.get('purchaseId');

        // حالت ۱-الف: دریافت مستقیم رسید یک خرید شخصی طبق I11-P
        if (purchaseId) {
            if (session.user.jwt) {
                const bmReceipt = await getCoursePurchaseReceipt({
                    jwt: session.user.jwt,
                    purchaseId
                });
                if (bmReceipt.success && bmReceipt.data) {
                    return NextResponse.json({ success: true, data: bmReceipt.data });
                }
                if (bmReceipt.notFound) {
                    return NextResponse.json({ success: false, notFound: true, message: "رسید خرید پیدا نشد." }, { status: 404 });
                }
                if (bmReceipt.unauthorized) {
                    return NextResponse.json({ success: false, unauthorized: true, message: "نشست کاربری منقضی شده است." }, { status: 401 });
                }
                return NextResponse.json({ success: false, message: bmReceipt.error || "خطا در دریافت رسید" }, { status: 500 });
            }
            return NextResponse.json({ success: false, message: "نشست نامعتبر است." }, { status: 401 });
        }

        // حالت ۱-ب: دریافت یک سفارش خاص (بای‌مانی یا استراپی)
        if (documentId) {
            // ۱. اگر شناسه با قالب سفارش پیگیری بای‌مانی (cart:..., topup:..., purchase:...) باشد
            if (session.user.jwt && CourseOrderId.isValid(documentId)) {
                try {
                    const bmOrder = await getMyCourseOrderDetails({
                        jwt: session.user.jwt,
                        orderId: documentId
                    });
                    if (bmOrder.success && bmOrder.data) {
                        const d = bmOrder.data;
                        const cleanId = d.orderId.replace(/^[a-z]+:/, '');
                        const mappedOrder = {
                            id: d.orderId,
                            documentId: d.orderId,
                            orderId: d.orderId,
                            source: 'byemoney',
                            orderSource: 'byemoney',
                            sourceType: d.sourceType,
                            cartId: d.cartId,
                            orderNumber: cleanId.slice(0, 8).toUpperCase(),
                            createdAt: d.createdAtUtc,
                            updatedAt: d.updatedAtUtc,
                            orderStatus: d.financialStatus === 'Paid' ? 'paid' : (['Failed', 'Expired'].includes(d.financialStatus) ? 'failed' : 'pending'),
                            paymentStatus: d.financialStatus === 'Paid' ? 'paid' : (['Failed', 'Expired'].includes(d.financialStatus) ? 'failed' : 'pending_payment'),
                            paymentMethod: 'noor',
                            totalPrice: d.finalAmountInNoor,
                            financialStatus: d.financialStatus,
                            deliveryStatus: d.deliveryStatus,
                            itemCount: d.itemCount,
                            cartStatus: d.cartStatus,
                            expiresAtUtc: d.expiresAtUtc,
                            currentTopUpRequestId: d.currentTopUpRequestId,
                            cartSummary: d.cartSummary,
                            items: (d.items || []).map(item => ({
                                id: item.externalCourseId,
                                documentId: item.externalCourseId,
                                externalCourseId: item.externalCourseId,
                                title: item.title,
                                price: item.finalAmountInNoor ?? item.priceInNoor,
                                priceInNoor: item.priceInNoor,
                                finalAmountInNoor: item.finalAmountInNoor,
                                purchaseId: item.purchaseId,
                                transactionId: item.transactionId,
                                purchasedAtUtc: item.purchasedAtUtc,
                                financialStatus: item.financialStatus,
                                deliveryStatus: item.deliveryStatus,
                                type: 'course',
                                __component: 'order.course-order-item'
                            })),
                            topUps: d.topUps || []
                        };
                        return NextResponse.json({ data: [mappedOrder] });
                    }
                } catch (bmOrderErr) {
                    console.error("ByeMoney GET Course Order Details Error:", bmOrderErr);
                }
            }

            // ۲. بررسی رسید خرید ثبت‌شده از مسیر شخصی getCoursePurchaseReceipt
            if (session.user.jwt) {
                try {
                    const bmReceipt = await getCoursePurchaseReceipt({
                        jwt: session.user.jwt,
                        purchaseId: documentId
                    });
                    if (bmReceipt.success && bmReceipt.data) {
                        const r = bmReceipt.data;
                        const mappedOrder = {
                            id: r.purchaseId,
                            documentId: r.purchaseId,
                            orderId: CourseOrderId.for('Purchase', r.purchaseId),
                            source: 'byemoney',
                            orderSource: 'byemoney',
                            sourceType: 'Purchase',
                            cartId: r.cartId,
                            orderNumber: r.purchaseId.slice(0, 8).toUpperCase(),
                            createdAt: r.purchasedAtUtc,
                            orderStatus: 'paid',
                            paymentStatus: 'paid',
                            paymentMethod: 'noor',
                            totalPrice: r.finalAmountInNoor,
                            baseAmountInNoor: r.baseAmountInNoor,
                            discountAmountInNoor: r.discountAmountInNoor,
                            couponCode: r.couponCode,
                            referenceRialPerNoorAtPurchaseTime: r.referenceRialPerNoorAtPurchaseTime,
                            financialStatus: r.financialStatus,
                            deliveryStatus: r.deliveryStatus,
                            deliveredAtUtc: r.deliveredAtUtc,
                            cartSummary: r.cartSummary,
                            transactionId: r.transactionId,
                            itemCount: 1,
                            items: [{
                                id: r.courseExternalId,
                                documentId: r.courseExternalId,
                                externalCourseId: r.courseExternalId,
                                title: r.courseTitle,
                                price: r.finalAmountInNoor,
                                finalAmountInNoor: r.finalAmountInNoor,
                                baseAmountInNoor: r.baseAmountInNoor,
                                purchaseId: r.purchaseId,
                                transactionId: r.transactionId,
                                purchasedAtUtc: r.purchasedAtUtc,
                                financialStatus: r.financialStatus,
                                deliveryStatus: r.deliveryStatus,
                                type: 'course',
                                __component: 'order.course-order-item'
                            }],
                            topUps: []
                        };
                        return NextResponse.json({ data: [mappedOrder] });
                    }
                } catch (bmErr) {
                    console.error("ByeMoney GET Receipt Error:", bmErr);
                }
            }

            // ۳. اگر در بای‌مانی نبود، جستجو در استراپی
            const strapiUrl = `${STRAPI_BASE_URL}/api/orders`
                + `?filters[documentId][$eq]=${encodeURIComponent(documentId)}`
                + `&filters[user][id][$eq]=${session.user.id}`
                + `&populate=*`;

            const res = await fetch(strapiUrl, {
                headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` },
                cache: 'no-store'
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error("Strapi GET Single Order Error:", errText);
                throw new Error("Failed to fetch order from Strapi");
            }
            const data = await res.json();
            return NextResponse.json(data);
        }

        // حالت ۲: دریافت فهرست کامل سفارشات (ادغام استراپی و بای‌مانی با تحمل قطعی)
        let strapiOrders = [];
        let byemoneyOrders = [];
        let byemoneyWarning = false;

        // فراخوانی استراپی
        const strapiUrl = `${STRAPI_BASE_URL}/api/orders`
            + `?filters[user][id][$eq]=${session.user.id}`
            + `&pagination[pageSize]=100`
            + `&sort=createdAt:desc`
            + `&populate=*`;

        try {
            const res = await fetch(strapiUrl, {
                headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` },
                cache: 'no-store'
            });

            if (res.ok) {
                const sData = await res.json();
                strapiOrders = (sData.data || []).map(order => ({
                    ...order,
                    source: 'strapi',
                    orderSource: 'strapi',
                }));
            } else {
                console.error("Strapi GET Orders Non-OK:", await res.text());
            }
        } catch (sErr) {
            console.error("Strapi GET Orders Error:", sErr);
        }

        // فراخوانی فهرست پیگیری سفارش‌های بای‌مانی طبق قرارداد I11-T
        if (session.user.jwt) {
            try {
                const bmRes = await getMyCourseOrders({
                    jwt: session.user.jwt,
                    page: 1,
                    pageSize: 100
                });
                if (bmRes.success && bmRes.data?.items) {
                    byemoneyOrders = bmRes.data.items.map(item => {
                        const rawId = item.orderId;
                        const cleanId = rawId.replace(/^[a-z]+:/, '');
                        return {
                            id: item.orderId,
                            documentId: item.orderId,
                            orderId: item.orderId,
                            cartId: item.cartId,
                            source: 'byemoney',
                            orderSource: 'byemoney',
                            sourceType: item.sourceType,
                            orderNumber: cleanId.slice(0, 8).toUpperCase(),
                            createdAt: item.createdAtUtc,
                            updatedAt: item.updatedAtUtc,
                            orderStatus: item.financialStatus === 'Paid' ? 'paid' : (['Failed', 'Expired'].includes(item.financialStatus) ? 'failed' : 'pending'),
                            paymentStatus: item.financialStatus === 'Paid' ? 'paid' : (['Failed', 'Expired'].includes(item.financialStatus) ? 'failed' : 'pending_payment'),
                            paymentMethod: 'noor',
                            totalPrice: item.finalAmountInNoor,
                            financialStatus: item.financialStatus,
                            deliveryStatus: item.deliveryStatus,
                            itemCount: item.itemCount,
                            items: Array.from({ length: item.itemCount || 1 }, () => ({
                                type: 'course',
                                price: item.finalAmountInNoor
                            }))
                        };
                    });
                } else {
                    byemoneyWarning = true;
                }
            } catch (bmFetchErr) {
                console.error("ByeMoney GET course orders fetch error:", bmFetchErr);
                byemoneyWarning = true;
            }
        } else {
            byemoneyWarning = true;
        }

        // ادغام و مرتب‌سازی بر اساس زمان نزولی (جدیدترین به قدیمی‌ترین)
        const allOrders = [...byemoneyOrders, ...strapiOrders].sort((a, b) => {
            const timeA = new Date(a.createdAt || a.attributes?.createdAt || 0).getTime();
            const timeB = new Date(b.createdAt || b.attributes?.createdAt || 0).getTime();
            return timeB - timeA;
        });

        return NextResponse.json({
            data: allOrders,
            byemoneyWarning,
            meta: {
                pagination: {
                    total: allOrders.length,
                    page: 1,
                    pageSize: 100
                }
            }
        });

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
    const session = await getServerSession(paymentAuthOptions);
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
        const pricingContext = {};
        if (body.cartItems.some(item => item.type === 'light_topup')) {
            const rate = await getConversionRateWithByeMoney({ jwt: session.user.jwt });
            if (!rate.success || !Number.isFinite(rate.tomanPerNoor) || rate.tomanPerNoor <= 0) {
                return NextResponse.json({ message: 'نرخ رسمی شارژ نور در دسترس نیست.' }, { status: 503 });
            }
            pricingContext.lightToTomanRate = rate.tomanPerNoor;
        }
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
                pricingContext: { ...pricingContext,
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
        // Strapi cancels superseded pending online orders atomically; paid cart items are cleared on the result page.
        try {
            revalidatePath('/profile/orders');
            revalidatePath('/products', 'layout');
            revalidatePath('/product', 'layout');
        } catch (error) {
            console.warn('بازخوانی کش سفارش انجام نشد:', error.message);
        }
        // Strapi validates current pricing and atomically reuses a matching pending order for 30 minutes.
        return NextResponse.json(result, { status: orderRes.status === 200 ? 200 : 201 });
    } catch (error) {
        console.error('POST Orders Error:', error);
        return NextResponse.json({ message: 'ثبت سفارش موقتاً در دسترس نیست.' }, { status: 503 });
    }
}
