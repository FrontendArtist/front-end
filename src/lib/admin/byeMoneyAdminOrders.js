/**
 * @file src/lib/admin/byeMoneyAdminOrders.js
 * @description دادهٔ صفحهٔ «سفارش‌ها» (فقط بای‌مانی) در پنل ادمین — ADMIN-ORDERS-REDESIGN
 *
 * فقط از APIهای موجود می‌خواند (GET /api/admin/orders (بای‌مانی)، جزئیات سفارش و فهرست برگشت موجودی)
 * و هیچ منطق مالی یا تغییر وضعیتی ندارد. API در هر فراخوانی فقط یک financialStatus/deliveryStatus
 * می‌پذیرد؛ تب‌های چندوضعیتی با چند فراخوانی ترتیبی صفحه‌بندی می‌شوند.
 *
 * تب «نیاز به اقدام» = سفارش‌هایی که موجودی لغوشان برنگشته + سفارش‌های پرداخت‌شده‌ای که هنوز کالایی
 * «ارسال‌نشده» دارند. وضعیت تحویل سطح سفارش کالای ارسال‌شده را هم «در انتظار» می‌گیرد، پس کاندیدها
 * (Paid + Pending/PartiallyDelivered) با جزئیات هر سفارش بررسی می‌شوند و فقط آن‌هایی می‌مانند که قلم
 * کالای ارسال‌نشده دارند. بررسی به ACTION_SCAN_LIMIT سفارش اخیر محدود است (محدودیت ثبت‌شده در TASKS).
 */

import { getAdminCourseOrders, getAdminCourseOrderDetails, getPendingPhysicalRestocks, CourseOrderId } from '../byeMoneyApi';
import { lookupPeople } from '../courseOrderSettlementRoute';
import { findStrapiUserIdForByeMoney } from './adminOrdersApi';
import { mapByeMoneyOrderRow } from './orderTracking';

export const ORDER_TABS = ['action', 'all', 'paid', 'pending', 'canceled'];
export const DEFAULT_TAB = 'action';

/** فیلترهای API برای هر تب (به ترتیب نمایش). تب action جداگانه ساخته می‌شود. */
const TAB_FILTERS = {
    all: [{}],
    paid: [{ financialStatus: 'Paid' }],
    pending: [{ financialStatus: 'Processing' }, { financialStatus: 'AwaitingPayment' }, { financialStatus: 'RequiresReview' }],
    canceled: [{ financialStatus: 'Failed' }, { financialStatus: 'Expired' }],
};

const ACTION_CANDIDATE_FILTERS = [
    { financialStatus: 'Paid', deliveryStatus: 'Pending' },
    { financialStatus: 'Paid', deliveryStatus: 'PartiallyDelivered' },
];
export const ACTION_SCAN_LIMIT = 100;
const DETAIL_CONCURRENCY = 8;
const SHIPPED_STATES = new Set(['Shipped', 'Delivered', 'Cancelled']);

export function normalizeTab(tab) {
    return ORDER_TABS.includes(tab) ? tab : DEFAULT_TAB;
}

/** ورودی query string → فیلترهای معتبر صفحه */
export function readOrderFilters(source) {
    const get = (k) => (typeof source?.get === 'function' ? source.get(k) : source?.[k]);
    const one = (v) => (Array.isArray(v) ? v[0] : v);
    const q = String(one(get('q')) || '').trim().slice(0, 100);
    return {
        tab: normalizeTab(one(get('tab'))),
        q,
        view: one(get('view')) === 'restock' ? 'restock' : null,
    };
}

// ── کمک‌کارها ───────────────────────────────────────────────────────────────

async function mapLimit(list, limit, fn) {
    const out = new Array(list.length);
    let next = 0;
    async function worker() {
        while (next < list.length) {
            const i = next++;
            out[i] = await fn(list[i], i);
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, list.length) }, worker));
    return out;
}

async function fetchPage(jwt, filter, page, pageSize, buyer) {
    const res = await getAdminCourseOrders({ jwt, page, pageSize, buyerExternalUserId: buyer || undefined, ...filter });
    if (res.success && res.data) {
        return { items: res.data.items || [], totalCount: res.data.totalCount || 0 };
    }
    return { items: [], totalCount: 0, error: res.error || 'خطا در دریافت سفارش‌های بای‌مانی', forbidden: Boolean(res.forbidden) };
}

/** بازهٔ [localStart, localStart+take) از یک فیلتر؛ با pageSize ثابت حداکثر دو صفحه */
async function fetchSlice(jwt, filter, localStart, take, pageSize, buyer) {
    const firstPage = Math.floor(localStart / pageSize) + 1;
    const lastPage = Math.floor((localStart + take - 1) / pageSize) + 1;
    const first = await fetchPage(jwt, filter, firstPage, pageSize, buyer);
    let items = first.items;
    let error = first.error;
    if (!error && lastPage > firstPage) {
        const second = await fetchPage(jwt, filter, lastPage, pageSize, buyer);
        items = [...items, ...second.items];
        error = second.error;
    }
    const offset = localStart - (firstPage - 1) * pageSize;
    return { items: items.slice(offset, offset + take), error };
}

/** صفحه‌بندی متوالی روی چند فیلتر (ترتیب فیلترها حفظ می‌شود) */
async function fetchFiltered(jwt, filters, { start, limit, buyer }) {
    const probes = await Promise.all(filters.map((f) => fetchPage(jwt, f, 1, 1, buyer)));
    const forbidden = probes.some((p) => p.forbidden);
    let warning = probes.some((p) => p.error);
    const totals = probes.map((p) => p.totalCount);
    const totalCount = totals.reduce((a, b) => a + b, 0);

    const items = [];
    let cursor = start;
    let remaining = limit;
    let base = 0;
    for (let i = 0; i < filters.length; i++) {
        if (remaining > 0 && cursor < base + totals[i]) {
            const localStart = cursor - base;
            const take = Math.min(remaining, totals[i] - localStart);
            const r = await fetchSlice(jwt, filters[i], localStart, take, limit, buyer);
            if (r.error) warning = true;
            items.push(...r.items);
            cursor += r.items.length;
            remaining -= r.items.length;
        }
        base += totals[i];
    }
    return { items, totalCount, warning, forbidden };
}

async function countFiltered(jwt, filters, buyer) {
    const probes = await Promise.all(filters.map((f) => fetchPage(jwt, f, 1, 1, buyer)));
    if (probes.some((p) => p.error)) return null;
    return probes.reduce((s, p) => s + p.totalCount, 0);
}

/** آیا سفارش هنوز کالای ارسال‌نشده (و لغونشده) دارد؟ */
export function hasUnshippedItems(order) {
    return (order?.items || []).some((i) => {
        if (String(i?.itemType || '').toLowerCase() !== 'product') return false;
        const qty = Number(i.quantity) > 0 ? Number(i.quantity) : 1;
        if ((Number(i.cancelledQuantity) || 0) >= qty) return false;
        return !SHIPPED_STATES.has(i.physicalDeliveryStatus);
    });
}

/** جزئیات سفارش ادمین → همان شکل ردیف فهرست */
function rowFromDetails(details) {
    const o = details.order || {};
    const refunded = (o.items || []).reduce(
        (s, i) => s + (Number(i.refundedRegularInNoor) || 0) + (Number(i.refundedGiftInNoor) || 0),
        0
    );
    return {
        orderId: o.orderId,
        sourceType: o.sourceType,
        cartId: o.cartId ?? null,
        createdAtUtc: o.createdAtUtc,
        updatedAtUtc: o.updatedAtUtc,
        financialStatus: o.financialStatus,
        deliveryStatus: o.deliveryStatus,
        finalAmountInNoor: o.finalAmountInNoor ?? null,
        itemCount: o.itemCount ?? (o.items || []).length,
        topUpAttemptCount: (o.topUps || []).length,
        buyerExternalUserId: details.buyerExternalUserId,
        buyerDisplayName: details.buyerDisplayName,
        refundedAmountInNoor: refunded,
    };
}

/** سفارش‌هایی که برگشت موجودی لغوشان رها شده (BND-05) */
async function getRestockOrderIds(jwt) {
    const res = await getPendingPhysicalRestocks({ jwt });
    if (!res.success) return { ids: [], error: res.forbidden ? null : res.error };
    const ids = [...new Set((res.data || []).filter((r) => r.abandoned).map((r) => CourseOrderId.for('Cart', r.cartId)))];
    return { ids, error: null };
}

async function getRestockRows(jwt, ids) {
    const rows = await mapLimit(ids, DETAIL_CONCURRENCY, async (orderId) => {
        const res = await getAdminCourseOrderDetails({ jwt, orderId });
        return res.success && res.data?.order ? rowFromDetails(res.data) : null;
    });
    return { rows: rows.filter(Boolean), warning: rows.some((r) => !r) };
}

/** کاندیدهای «منتظر ارسال» (جدیدترین‌ها تا سقف بررسی) و نگه‌داشتن آن‌هایی که کالای ارسال‌نشده دارند */
async function getAwaitingShipmentRows(jwt, buyer) {
    const { items, totalCount, warning } = await fetchFiltered(jwt, ACTION_CANDIDATE_FILTERS, {
        start: 0,
        limit: ACTION_SCAN_LIMIT,
        buyer,
    });
    const keep = await mapLimit(items, DETAIL_CONCURRENCY, async (row) => {
        const res = await getAdminCourseOrderDetails({ jwt, orderId: row.orderId });
        // اگر جزئیات خوانده نشد، سفارش نگه داشته می‌شود تا کاری از دید ادمین پنهان نماند
        if (!res.success || !res.data?.order) return { row, ok: true, failed: true };
        return { row, ok: hasUnshippedItems(res.data.order) };
    });
    return {
        rows: keep.filter((k) => k.ok).map((k) => ({ ...k.row, needsShipment: true })),
        warning: warning || keep.some((k) => k.failed),
        truncated: totalCount > ACTION_SCAN_LIMIT,
    };
}

async function getActionRows(jwt, buyer, restockIds) {
    const [restock, awaiting] = await Promise.all([
        getRestockRows(jwt, restockIds),
        getAwaitingShipmentRows(jwt, buyer),
    ]);
    const restockRows = buyer ? restock.rows.filter((r) => r.buyerExternalUserId === buyer) : restock.rows;
    const seen = new Set(restockRows.map((r) => r.orderId));
    const rows = [...restockRows, ...awaiting.rows.filter((r) => !seen.has(r.orderId))];
    return { rows, warning: restock.warning || awaiting.warning, truncated: awaiting.truncated };
}

async function withPeople(jwt, rows) {
    let people = new Map();
    try {
        people = await lookupPeople(jwt, rows.map((r) => r.buyerExternalUserId));
    } catch {
        // نبود نام استرپی مانع نمایش سفارش نیست
    }
    return rows.map((r) => {
        const row = mapByeMoneyOrderRow(r);
        const person = people.get(r.buyerExternalUserId);
        return {
            ...row,
            needsShipment: Boolean(r.needsShipment),
            buyerName: person?.name || r.buyerDisplayName || null,
            buyerPhone: person?.phone || null,
        };
    });
}

// ── API عمومی ماژول ───────────────────────────────────────────────────────

/**
 * فهرست سفارش‌های یک تب.
 * @returns {Promise<{ orders: object[], total: number, hasMore: boolean, warning: boolean,
 *   truncated: boolean, forbidden: boolean, restockIds: string[], restockError: string|null }>}
 */
export async function getByeMoneyAdminOrders(jwt, { tab, q, view, start = 0, limit = 20 } = {}) {
    const empty = { orders: [], total: 0, hasMore: false, warning: false, truncated: false, forbidden: false };
    const buyer = q ? await findStrapiUserIdForByeMoney(jwt, q) : null;
    const restock = await getRestockOrderIds(jwt);
    const base = { restockIds: restock.ids, restockError: restock.error };
    if (buyer === '__USER_NOT_FOUND__') return { ...empty, ...base };

    if (view === 'restock') {
        const r = await getRestockRows(jwt, restock.ids);
        const rows = buyer ? r.rows.filter((x) => x.buyerExternalUserId === buyer) : r.rows;
        return { ...empty, ...base, orders: await withPeople(jwt, rows), total: rows.length, warning: r.warning };
    }

    if (normalizeTab(tab) === 'action') {
        const r = await getActionRows(jwt, buyer, restock.ids);
        return {
            ...empty,
            ...base,
            orders: await withPeople(jwt, r.rows),
            total: r.rows.length,
            warning: r.warning,
            truncated: r.truncated,
        };
    }

    const r = await fetchFiltered(jwt, TAB_FILTERS[normalizeTab(tab)], { start, limit, buyer });
    return {
        ...empty,
        ...base,
        orders: await withPeople(jwt, r.items),
        total: r.totalCount,
        hasMore: start + r.items.length < r.totalCount && r.items.length > 0,
        warning: r.warning,
        forbidden: r.forbidden,
    };
}

/** شمارندهٔ تب‌ها (با همان جستجوی خریدار). action در صورت داشتن فهرست همان تب از طول آن گرفته می‌شود. */
export async function getByeMoneyOrderCounts(jwt, { q, actionCount } = {}) {
    const buyer = q ? await findStrapiUserIdForByeMoney(jwt, q) : null;
    if (buyer === '__USER_NOT_FOUND__') return { action: 0, all: 0, paid: 0, pending: 0, canceled: 0 };
    const [all, paid, pending, canceled, action] = await Promise.all([
        countFiltered(jwt, TAB_FILTERS.all, buyer),
        countFiltered(jwt, TAB_FILTERS.paid, buyer),
        countFiltered(jwt, TAB_FILTERS.pending, buyer),
        countFiltered(jwt, TAB_FILTERS.canceled, buyer),
        actionCount !== undefined
            ? actionCount
            : getRestockOrderIds(jwt).then((r) => getActionRows(jwt, buyer, r.ids)).then((r) => r.rows.length).catch(() => null),
    ]);
    return { action, all, paid, pending, canceled };
}
