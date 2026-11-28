import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { STRAPI_API_URL } from "@/lib/api";

import { getMyCoursePurchases, getCoursePurchaseReceipt, getMyCourseOrders, getMyCourseOrderDetails, CourseOrderId } from '@/lib/byeMoneyApi';
import { attachPurchasesToByeMoneyOrder, mapByeMoneyLineItem } from '@/lib/byeMoneyOrderItems';
import { pickShippingOrigin } from '@/lib/shippingOrigin';

const STRAPI_BASE_URL = STRAPI_API_URL;
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;
const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORDER_LIST_PAGE_SIZE = 100;
const MAX_UNCAPPED_ORDER_LIST_PAGES = 100;

function logOrderListSource(source, page, outcome) {
    console.error(`[orders] ${outcome} source=${source} page=${page}`);
}

function finiteCount(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
    return Math.floor(value);
}

function uniqueById(rows, idOf) {
    const seen = new Set();
    const unique = [];
    for (const row of rows) {
        const id = idOf(row);
        if (id == null || id === '') {
            unique.push(row);
            continue;
        }
        const key = String(id);
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(row);
    }
    return unique;
}

function knownPageCount(page) {
    if (page.pageCount != null) return page.pageCount;
    if (page.totalCount == null) return null;
    if (page.totalCount === 0) return 0;
    return Math.ceil(page.totalCount / ORDER_LIST_PAGE_SIZE);
}

function rowsRemainAfterEmptyPage(declaredTotal, pageNumber, pagesToRead, collectedCount) {
    if (declaredTotal != null) return declaredTotal > collectedCount;
    return pageNumber < pagesToRead || (pageNumber === pagesToRead && pagesToRead > 1);
}

/**
 * همهٔ صفحه‌های یک منبع. اگر pageCount یا totalCount باشد، پایان فقط از آن است.
 * صفحهٔ کوتاه فقط وقتی «تمام» است که این مقدار نباشد.
 * صفحهٔ خالی در حالی که شمارش هنوز ردیف مانده، منبع را ناقص می‌کند و هیچ ردیفی برنمی‌گردد.
 */
async function readOrderSourcePages({ source, load, idOf }) {
    const collected = [];
    let pagesToRead = null;
    let declaredTotal = null;

    for (let pageNumber = 1; ; pageNumber += 1) {
        if (pagesToRead == null && pageNumber > MAX_UNCAPPED_ORDER_LIST_PAGES) {
            logOrderListSource(source, MAX_UNCAPPED_ORDER_LIST_PAGES, 'incomplete');
            return { ok: false, items: [] };
        }

        let page;
        try {
            page = await load(pageNumber);
        } catch {
            logOrderListSource(source, pageNumber, 'failed');
            return { ok: false, items: [] };
        }
        if (!page?.ok || !Array.isArray(page.items)) {
            logOrderListSource(source, pageNumber, 'failed');
            return { ok: false, items: [] };
        }

        if (pageNumber === 1) {
            pagesToRead = knownPageCount(page);
            declaredTotal = page.totalCount;
            if (pagesToRead === 0) return { ok: true, items: [] };
        }

        if (pagesToRead == null) {
            collected.push(page.items);
            if (page.items.length < ORDER_LIST_PAGE_SIZE) {
                return { ok: true, items: uniqueById(collected.flat(), idOf) };
            }
            continue;
        }

        if (page.items.length === 0 && rowsRemainAfterEmptyPage(declaredTotal, pageNumber, pagesToRead, collected.flat().length)) {
            logOrderListSource(source, pageNumber, 'incomplete');
            return { ok: false, items: [] };
        }

        collected.push(page.items);
        if (pageNumber >= pagesToRead) {
            return { ok: true, items: uniqueById(collected.flat(), idOf) };
        }
    }
}

// فقط فیلدهای نمایشی آدرس تحویل از پاسخ بای‌مانی به مرورگر می‌رسد.
function pickShippingAddress(address) {
    if (!address) return null;
    const { recipientName, recipientPhone, province, city, fullAddress, postalCode } = address;
    return { recipientName, recipientPhone, province, city, fullAddress, postalCode: postalCode ?? null };
}

function extractFromNotes(notes, label) {
    if (!notes || typeof notes !== 'string') return null;
    const regex = new RegExp(`${label}\\s*([^\\n\\r]+)`, 'i');
    const match = notes.match(regex);
    return match ? match[1].trim() : null;
}

function pickReceiptImage(receiptImage) {
    const img = receiptImage?.data?.attributes
        ? { id: receiptImage.data.id, ...receiptImage.data.attributes }
        : receiptImage;
    if (!img || typeof img !== 'object') return null;
    return {
        id: img.id ?? null,
        url: img.url ?? null,
        name: img.name ?? null,
        formats: img.formats ?? null,
    };
}

/**
 * پاکسازی فیلدهای خام Strapi پیش از ارسال به مرورگر (حذف user، hashedCardNumber، settlement، notes و ...).
 * فیلدهای قدیمیِ رسید درگاه که فقط در notes ذخیره شده‌اند قبل از حذف notes استخراج می‌شوند.
 */
function sanitizeStrapiOrder(rawOrder) {
    if (!rawOrder || typeof rawOrder !== 'object') return null;
    const src = rawOrder.attributes
        ? { id: rawOrder.id, documentId: rawOrder.documentId, ...rawOrder.attributes }
        : rawOrder;

    const refNum = src.refNum || extractFromNotes(src.notes, 'رسید دیجیتال \\(RefNum\\):') || null;
    const traceNo = src.traceNo || extractFromNotes(src.notes, 'کد رهگیری:') || null;
    const rrn = src.rrn || extractFromNotes(src.notes, 'شماره مرجع \\(RRN\\):') || null;
    const securePan = src.securePan || extractFromNotes(src.notes, 'شماره کارت:') || null;
    const rejectionReason =
        src.rejectionReason
        || extractFromNotes(src.notes, '❌ پرداخت ناموفق در درگاه:')
        || extractFromNotes(src.notes, '❌ عدم تایید تراکنش توسط بانک:')
        || null;

    return {
        id: src.id,
        documentId: src.documentId,
        createdAt: src.createdAt,
        updatedAt: src.updatedAt,
        publishedAt: src.publishedAt,
        orderStatus: src.orderStatus,
        paymentStatus: src.paymentStatus,
        paymentMethod: src.paymentMethod,
        totalPrice: src.totalPrice,
        currency: src.currency ?? null,
        originalTotalPrice: src.originalTotalPrice ?? null,
        discountAmount: src.discountAmount ?? null,
        couponCode: src.couponCode ?? null,
        shippingAmountInNoor: src.shippingAmountInNoor ?? null,
        shippingRuleLabel: src.shippingRuleLabel ?? null,
        trackingNumber: src.trackingNumber ?? null,
        cardHolderName: src.cardHolderName ?? null,
        fullName: src.fullName ?? null,
        refNum,
        traceNo,
        rrn,
        securePan,
        paymentDate: src.paymentDate ?? null,
        rejectionReason,
        purchaseId: src.purchaseId ?? null,
        items: Array.isArray(src.items) ? src.items : [],
        receiptImage: pickReceiptImage(src.receiptImage),
        source: 'strapi',
        orderSource: 'strapi',
    };
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

        const rawPhone = session.user.phoneNumber || session.user.phone;
        const phone = typeof rawPhone === 'string' && rawPhone.trim().length >= 10 ? rawPhone.trim() : null;
        const userFilter = phone
            ? `filters[$or][0][user][id][$eq]=${encodeURIComponent(session.user.id)}&filters[$or][1][phone][$eq]=${encodeURIComponent(phone)}`
            : `filters[user][id][$eq]=${encodeURIComponent(session.user.id)}`;

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
            if (CourseOrderId.isValid(documentId)) {
                if (!session.user.jwt) {
                    return NextResponse.json({ message: 'نشست کاربری نامعتبر است.' }, { status: 401 });
                }
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
                            referenceRialPerNoorAtPurchaseTime: d.referenceRialPerNoorAtPurchaseTime ?? null,
                            financialStatus: d.financialStatus,
                            deliveryStatus: d.deliveryStatus,
                            itemCount: d.itemCount,
                            cartStatus: d.cartStatus,
                            expiresAtUtc: d.expiresAtUtc,
                            currentTopUpRequestId: d.currentTopUpRequestId,
                            couponCode: d.couponCode ?? null,
                            shippingRegularRefundInNoor: Number(d.shippingRegularRefundInNoor) || 0,
                            shippingGiftRefundInNoor: Number(d.shippingGiftRefundInNoor) || 0,
                            cartSummary: d.cartSummary,
                            shippingAddress: pickShippingAddress(d.shippingAddress),
                            shippingOrigin: pickShippingOrigin(d.shippingOrigin),
                            items: (d.items || []).map(item => mapByeMoneyLineItem(item)).filter(Boolean),
                            topUps: d.topUps || []
                        };
                        return NextResponse.json({ data: [mappedOrder] });
                    }
                    if (bmOrder.unauthorized) {
                        return NextResponse.json({ message: bmOrder.error || 'نشست کاربری منقضی شده است.' }, { status: 401 });
                    }
                    if (bmOrder.forbidden) {
                        return NextResponse.json({ message: bmOrder.error || 'دسترسی به این سفارش مجاز نیست.' }, { status: 403 });
                    }
                    if (bmOrder.notFound) {
                        return NextResponse.json({ message: bmOrder.error || 'سفارشی با این شناسه یافت نشد.' }, { status: 404 });
                    }
                    if (bmOrder.badRequest) {
                        return NextResponse.json({ message: bmOrder.error || 'شناسه سفارش نامعتبر است.' }, { status: 400 });
                    }
                    return NextResponse.json({ message: bmOrder.error || 'خطا در ارتباط با سرویس سفارش‌ها.' }, { status: 502 });
                } catch (bmOrderErr) {
                    console.error("ByeMoney GET Course Order Details Error:", bmOrderErr);
                    return NextResponse.json({ message: 'خطا در ارتباط با سرویس سفارش‌ها.' }, { status: 502 });
                }
            }

            // ۲. بررسی رسید خرید ثبت‌شده از مسیر شخصی getCoursePurchaseReceipt (فقط GUID)
            if (session.user.jwt && GUID_RE.test(documentId)) {
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
                + `&${userFilter}`
                + `&populate[0]=items&populate[1]=receiptImage`;
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
            return NextResponse.json({
                ...data,
                data: Array.isArray(data?.data) ? data.data.map(sanitizeStrapiOrder).filter(Boolean) : [],
            });
        }

        // حالت ۲: دریافت فهرست کامل سفارشات (ادغام استراپی و بای‌مانی با تحمل قطعی)
        let strapiOrders = [];
        let byemoneyOrders = [];
        let byemoneyWarning = false;

        const strapiPages = await readOrderSourcePages({
            source: 'strapi',
            idOf: (row) => row.documentId ?? row.id,
            load: async (page) => {
                const strapiUrl = `${STRAPI_BASE_URL}/api/orders`
                    + `?${userFilter}`
                    + `&pagination[page]=${page}`
                    + `&pagination[pageSize]=${ORDER_LIST_PAGE_SIZE}`
                    + `&sort=createdAt:desc`
                    + `&populate[0]=items&populate[1]=receiptImage`;
                const res = await fetch(strapiUrl, {
                    headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` },
                    cache: 'no-store'
                });
                if (!res.ok) return { ok: false, items: [] };
                const body = await res.json();
                const items = (Array.isArray(body?.data) ? body.data : [])
                    .map(sanitizeStrapiOrder)
                    .filter(Boolean);
                return {
                    ok: true,
                    items,
                    pageCount: finiteCount(body?.meta?.pagination?.pageCount),
                    totalCount: null,
                };
            },
        });
        if (strapiPages.ok) strapiOrders = strapiPages.items;

        // فراخوانی فهرست پیگیری سفارش‌های بای‌مانی طبق قرارداد I11-T
        if (session.user.jwt) {
            const jwt = session.user.jwt;
            const orderPages = await readOrderSourcePages({
                source: 'byemoney-orders',
                idOf: (row) => row.orderId,
                load: async (page) => {
                    const res = await getMyCourseOrders({ jwt, page, pageSize: ORDER_LIST_PAGE_SIZE });
                    if (!res?.success || !Array.isArray(res.data?.items)) return { ok: false, items: [] };
                    return {
                        ok: true,
                        items: res.data.items,
                        pageCount: null,
                        totalCount: finiteCount(res.data.totalCount),
                    };
                },
            });
            const purchasePages = await readOrderSourcePages({
                source: 'byemoney-purchases',
                idOf: (row) => row.purchaseId,
                load: async (page) => {
                    const res = await getMyCoursePurchases({ jwt, page, pageSize: ORDER_LIST_PAGE_SIZE });
                    if (!res?.success || !Array.isArray(res.data?.items)) return { ok: false, items: [] };
                    return {
                        ok: true,
                        items: res.data.items,
                        pageCount: null,
                        totalCount: finiteCount(res.data.totalCount),
                    };
                },
            });
            if (!orderPages.ok) {
                byemoneyWarning = true;
            } else {
                const purchases = purchasePages.ok ? purchasePages.items : [];
                byemoneyOrders = orderPages.items.map(item => {
                    const rawId = item.orderId;
                    const cleanId = String(rawId || '').replace(/^[a-z]+:/, '');
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
                        referenceRialPerNoorAtPurchaseTime: item.referenceRialPerNoorAtPurchaseTime ?? null,
                        financialStatus: item.financialStatus,
                        deliveryStatus: item.deliveryStatus,
                        carrierReturnStatus: item.carrierReturnStatus || 'None',
                        itemCount: item.itemCount,
                        items: []
                    }, purchases);
                });
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
                    pageSize: ORDER_LIST_PAGE_SIZE
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
