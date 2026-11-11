import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { STRAPI_API_URL } from "@/lib/api";

import { getMyCoursePurchases, getCoursePurchaseReceipt, getMyCourseOrders, getMyCourseOrderDetails, CourseOrderId } from '@/lib/byeMoneyApi';
import { attachPurchasesToByeMoneyOrder, mapByeMoneyLineItem } from '@/lib/byeMoneyOrderItems';

const STRAPI_BASE_URL = STRAPI_API_URL;
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

// فقط فیلدهای نمایشی آدرس تحویل از پاسخ بای‌مانی به مرورگر می‌رسد.
function pickShippingAddress(address) {
    if (!address) return null;
    const { recipientName, recipientPhone, province, city, fullAddress, postalCode } = address;
    return { recipientName, recipientPhone, province, city, fullAddress, postalCode: postalCode ?? null };
}

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
                            shippingAddress: pickShippingAddress(d.shippingAddress),
                            items: (d.items || []).map(item => mapByeMoneyLineItem(item)).filter(Boolean),
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
                            items: [mapByeMoneyLineItem(r)].filter(Boolean),
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
                let purchases = [];
                try {
                    const purchasesRes = await getMyCoursePurchases({
                        jwt: session.user.jwt,
                        page: 1,
                        pageSize: 100,
                    });
                    if (purchasesRes?.success && Array.isArray(purchasesRes.data?.items)) {
                        purchases = purchasesRes.data.items;
                    }
                } catch (purchasesErr) {
                    console.error("ByeMoney GET course purchases fetch error:", purchasesErr);
                }
                if (bmRes.success && bmRes.data?.items) {
                    byemoneyOrders = bmRes.data.items.map(item => {
                        const rawId = item.orderId;
                        const cleanId = rawId.replace(/^[a-z]+:/, '');
                        return attachPurchasesToByeMoneyOrder({
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
                        }, purchases);
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
// POST /api/orders : بسته‌شده (410)
// --------------------------------------------------------------------------
// هیچ خرید جدیدی رکورد order در Strapi نمی‌سازد؛ دوره، فصل، کالا و سبد مختلط فقط از سبد بای‌مانی (/cart) می‌روند.
// GET همین مسیر برای سفارش‌های قدیمی پروفایل باقی است.
export async function POST() {
    return NextResponse.json(
        { message: 'ثبت سفارش از این مسیر بسته شده است. لطفاً خرید را از سبد خرید انجام دهید.' },
        { status: 410 }
    );
}
