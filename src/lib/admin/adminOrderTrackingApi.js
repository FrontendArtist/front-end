/**
 * @file src/lib/admin/adminOrderTrackingApi.js
 * @description جزئیات و خط زمانی تلاش‌های خرید یک سفارش بای‌مانی (فقط سرور؛ فقط‌مشاهده)
 *
 * جزئیات سفارش با JWT ادمین از بای‌مانی خوانده می‌شود و رکورد تلاش‌های درگاه از استرپی با توکن سرور
 * (STRAPI_API_TOKEN) و فیلتر topUpRequestId. اگر استرپی در دسترس نباشد فقط وضعیت بای‌مانی با هشدار برمی‌گردد.
 * به مرورگر فقط فیلدهای لازم می‌رسد؛ refNum، rrn، securePan و hashedCardNumber حتی از استرپی خوانده نمی‌شوند.
 */

import { getAdminCourseOrderDetails, getAdminCourseOrderReceipt } from '../byeMoneyApi';
import { STRAPI_API_URL } from '../api';
import { buildTimeline, sanitizeAttempt, sanitizeTopUp, summarizeAttempts } from './orderTracking';

// topUpRequestId برای تطبیق با شارژ لازم است. retryCount عمداً خوانده نمی‌شود (همیشه ۰ است).
const ATTEMPT_FIELDS = [
    'topUpRequestId',
    'status',
    'lastError',
    'createdAt',
    'updatedAt',
    'tokenIssuedAtUtc',
    'tokenExpiresAtUtc',
    'verifiedAtUtc',
    'lastAttemptAtUtc',
];

export const STRAPI_UNAVAILABLE_WARNING =
    'رکورد تلاش‌های درگاه از استرپی در دسترس نیست؛ فقط وضعیت ثبت‌شده در بای‌مانی نمایش داده می‌شود.';
export const STRAPI_FORBIDDEN_WARNING =
    'عدم دسترسی توکن: استرپی با ۴۰۳ پاسخ داد (مجوز find روی gateway-payment-attempts برای STRAPI_API_TOKEN را بررسی کنید). این به معنی «بدون تلاش» نیست.';

/**
 * @returns {Promise<{ attempts: object[]|null, status: 'ok'|'forbidden'|'error'|'no_token' }>}
 *   attempts=null یعنی تلاش‌ها خوانده نشدند؛ status علت را جدا می‌کند تا مشکل مجوز پنهان نماند.
 */
export async function fetchGatewayAttempts(topUpRequestIds) {
    if (!topUpRequestIds.length) return { attempts: [], status: 'ok' };
    const token = process.env.STRAPI_API_TOKEN;
    if (!token) return { attempts: null, status: 'no_token' };

    const params = new URLSearchParams();
    topUpRequestIds.forEach((id, i) => params.set(`filters[topUpRequestId][$in][${i}]`, id));
    ATTEMPT_FIELDS.forEach((f, i) => params.set(`fields[${i}]`, f));
    params.set('sort', 'createdAt:desc');
    params.set('pagination[pageSize]', '100');

    try {
        const res = await fetch(`${STRAPI_API_URL}/api/gateway-payment-attempts?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        });
        if (res.status === 403) return { attempts: null, status: 'forbidden' };
        if (!res.ok) return { attempts: null, status: 'error' };
        const body = await res.json();
        const rows = Array.isArray(body?.data) ? body.data : [];
        return { attempts: rows.map(sanitizeAttempt), status: 'ok' };
    } catch {
        return { attempts: null, status: 'error' };
    }
}

export const ADDRESS_UNAVAILABLE_WARNING =
    'آدرس تحویل از استرپی در دسترس نیست؛ وضعیت و رسید سفارش از بای‌مانی نمایش داده می‌شود.';

export const ADDRESS_FORBIDDEN_WARNING =
    'آدرس تحویل: استرپی با ۴۰۳ پاسخ داد؛ STRAPI_API_TOKEN باید full-access باشد یا مجوز action «byemoney-cart.address» را داشته باشد.';

const ADDRESS_FIELDS = ['recipientName', 'recipientPhone', 'province', 'city', 'postalCode', 'fullAddress'];

/**
 * نسخهٔ ثابت آدرس رزرو (I09-PH) را با شناسهٔ رزرو commit‌شده (`reservationId` جزئیات سفارش، نه `cartId`) از استرپی می‌خواند.
 * @returns {Promise<{ address: object|null, status: 'ok'|'not_found'|'forbidden'|'error'|'no_token' }>}
 */
export async function fetchCartAddress(reservationId) {
    const token = process.env.STRAPI_API_TOKEN;
    if (!token) return { address: null, status: 'no_token' };
    try {
        const res = await fetch(`${STRAPI_API_URL}/api/byemoney-carts/${encodeURIComponent(reservationId)}/address`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        });
        if (res.status === 404) return { address: null, status: 'not_found' };
        if (res.status === 403) return { address: null, status: 'forbidden' };
        if (!res.ok) return { address: null, status: 'error' };
        const snapshot = (await res.json())?.addressSnapshot;
        if (!snapshot || typeof snapshot !== 'object') return { address: null, status: 'not_found' };
        const address = {};
        ADDRESS_FIELDS.forEach((f) => { address[f] = snapshot[f] ?? null; });
        return { address, status: 'ok' };
    } catch {
        return { address: null, status: 'error' };
    }
}

function sanitizeItem(i) {
    return {
        purchaseId: i.purchaseId ?? null,
        externalItemId: i.externalItemId ?? null,
        title: i.title ?? null,
        itemType: i.itemType ?? null,
        quantity: i.quantity ?? 1,
        priceInNoor: i.priceInNoor ?? null,
        finalAmountInNoor: i.finalAmountInNoor ?? null,
        financialStatus: i.financialStatus ?? null,
        deliveryStatus: i.deliveryStatus ?? null,
        physicalDeliveryStatus: i.physicalDeliveryStatus ?? null,
        cancelledQuantity: Number(i.cancelledQuantity) || 0,
        refundedRegularInNoor: Number(i.refundedRegularInNoor) || 0,
        refundedGiftInNoor: Number(i.refundedGiftInNoor) || 0,
    };
}

function sanitizeReceipt(r) {
    return {
        purchasedAtUtc: r.purchasedAtUtc ?? null,
        couponCode: r.couponCode ?? null,
        finalAmountInNoor: r.finalAmountInNoor ?? null,
        cartSummary: r.cartSummary ?? null,
        items: (r.items || []).map((i) => ({
            purchaseId: i.purchaseId ?? null,
            externalItemId: i.externalItemId ?? null,
            title: i.title ?? null,
            itemType: i.itemType ?? null,
            quantity: i.quantity ?? 1,
            unitPriceInNoor: i.unitPriceInNoor ?? null,
            baseAmountInNoor: i.baseAmountInNoor ?? null,
            discountAmountInNoor: i.discountAmountInNoor ?? null,
            finalAmountInNoor: i.finalAmountInNoor ?? null,
            deliveryStatus: i.deliveryStatus ?? null,
            physicalDeliveryStatus: i.physicalDeliveryStatus ?? null,
            cancelledQuantity: Number(i.cancelledQuantity) || 0,
            refundedRegularInNoor: Number(i.refundedRegularInNoor) || 0,
            refundedGiftInNoor: Number(i.refundedGiftInNoor) || 0,
        })),
    };
}

/**
 * @param {{ jwt: string, orderId: string, now?: Date }} params
 * @returns {Promise<{ success: true, data: object } | { success: false, status: number, error: string }>}
 */
export async function getOrderTracking({ jwt, orderId, now = new Date() }) {
    const res = await getAdminCourseOrderDetails({ jwt, orderId });
    if (!res.success) {
        const status = res.forbidden ? 403 : res.notFound ? 404 : res.unauthorized ? 401 : res.badRequest ? 400 : res.networkError ? 502 : 500;
        return { success: false, status, error: res.error || 'خطا در دریافت جزئیات سفارش' };
    }

    const { buyerExternalUserId, buyerDisplayName, order } = res.data || {};
    if (!order) return { success: false, status: 502, error: 'پاسخ بای‌مانی نامعتبر است.' };

    const warnings = [];
    const topUps = (order.topUps || []).map(sanitizeTopUp);
    const ids = topUps.map((t) => t.topUpRequestId).filter(Boolean);

    // خواندن استرپی و رسید (فقط Paid) موازی؛ شکست هرکدام مانع نمایش بقیه نیست
    const [{ attempts, status: attemptsStatus }, receipt] = await Promise.all([
        fetchGatewayAttempts(ids),
        order.financialStatus === 'Paid'
            ? getAdminCourseOrderReceipt({ jwt, orderId }).catch(() => ({ success: false }))
            : Promise.resolve(null),
    ]);

    if (attemptsStatus === 'forbidden') warnings.push(STRAPI_FORBIDDEN_WARNING);
    else if (attempts === null) warnings.push(STRAPI_UNAVAILABLE_WARNING);
    if (receipt && !receipt.success) warnings.push('رسید سفارش در دسترس نیست.');

    // آدرس فقط برای سفارش دارای کالا و با reservationId خوانده می‌شود (برگشت به cartId آدرس رزرو قدیمی را نشان می‌دهد)؛ شکستش مانع بقیه نیست
    const hasProduct = (order.items || []).some((i) => String(i?.itemType || '').toLowerCase() === 'product');
    let shippingAddress = null;
    if (hasProduct && order.reservationId) {
        const { address, status: addressStatus } = await fetchCartAddress(order.reservationId);
        shippingAddress = address;
        if (addressStatus === 'forbidden') warnings.push(ADDRESS_FORBIDDEN_WARNING);
        else if (addressStatus !== 'ok' && addressStatus !== 'not_found') warnings.push(ADDRESS_UNAVAILABLE_WARNING);
    }

    const timeline = buildTimeline({ order, topUps, attempts, now });

    return {
        success: true,
        data: {
            order: {
                orderId: order.orderId,
                sourceType: order.sourceType,
                cartId: order.cartId ?? null,
                financialStatus: order.financialStatus,
                deliveryStatus: order.deliveryStatus,
                createdAtUtc: order.createdAtUtc,
                updatedAtUtc: order.updatedAtUtc,
                finalAmountInNoor: order.finalAmountInNoor ?? null,
                itemCount: order.itemCount ?? 0,
                cartStatus: order.cartStatus ?? null,
                expiresAtUtc: order.expiresAtUtc ?? null,
                cartSummary: order.cartSummary ?? null,
                items: (order.items || []).map(sanitizeItem),
            },
            buyer: { externalUserId: buyerExternalUserId ?? null, displayName: buyerDisplayName ?? null },
            topUps,
            timeline,
            attemptSummary: summarizeAttempts(timeline),
            attemptsAvailable: attempts !== null,
            attemptsStatus,
            receipt: receipt?.success ? sanitizeReceipt(receipt.data) : null,
            shippingAddress,
            warnings,
        },
    };
}
