/**
 * @file src/lib/admin/byeMoneyAdminOrders.js
 * @description دادهٔ صفحهٔ «سفارش‌ها» (فقط بای‌مانی) در پنل ادمین — ADMIN-ORDERS-REDESIGN
 *
 * فقط از APIهای موجود می‌خواند (GET /api/admin/orders (بای‌مانی)، جزئیات سفارش و فهرست برگشت موجودی)
 * و هیچ منطق مالی یا تغییر وضعیتی ندارد. API در هر فراخوانی فقط یک financialStatus/deliveryStatus
 * می‌پذیرد؛ تب‌های چندوضعیتی با چند فراخوانی ترتیبی صفحه‌بندی می‌شوند.
 *
 * تب «نیاز به اقدام» = سفارش‌هایی که موجودی لغوشان برنگشته + سفارش‌های پرداخت‌شده‌ای که هنوز کالایی
 * «ارسال‌نشده» دارند. مورد دوم با پارامتر سروری awaitingShipment=true خوانده می‌شود (SHIP-TRACKING)؛
 * هیچ اسکن صفحه‌به‌صفحه یا خواندن جزئیات تک‌تک سفارش‌ها لازم نیست و شمارنده همان totalCount سرور است.
 * سقف ACTION_PAGE_SIZE فقط برای حجم پاسخ است؛ بیشتر از آن با truncated اعلام می‌شود.
 */

import { getAdminCourseOrders, getAdminCourseOrderDetails, getPendingPhysicalRestocks, CourseOrderId } from '../byeMoneyApi';
import { lookupPeople } from '../courseOrderSettlementRoute';
import { findStrapiUserIdForByeMoney, findStrapiUserIdsForByeMoney } from './adminOrdersApi';
import { mapByeMoneyOrderRow } from './orderTracking';
import { carrierReturnStatusOf, carrierAlertStatusOf } from './orderDisplay';

export const ORDER_TABS = ['action', 'all', 'paid', 'pending', 'canceled'];
export const DEFAULT_TAB = 'action';

/** فیلترهای API برای هر تب (به ترتیب نمایش). تب action جداگانه ساخته می‌شود. */
const TAB_FILTERS = {
    all: [{}],
    paid: [{ financialStatus: 'Paid' }],
    pending: [{ financialStatus: 'Processing' }, { financialStatus: 'AwaitingPayment' }, { financialStatus: 'RequiresReview' }],
    canceled: [{ financialStatus: 'Failed' }, { financialStatus: 'Expired' }],
};

const ACTION_CANDIDATE_FILTERS = [{ awaitingShipment: true }];
export const ACTION_PAGE_SIZE = 100;
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
        carrierReturnStatus: carrierReturnStatusOf(o.items),
        carrierAlertStatus: carrierAlertStatusOf(o.items),
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

/** سفارش‌های Paid با قلم کالای ارسال‌نشده؛ فیلتر در سرور اعمال می‌شود و شمارنده واقعی است */
async function getAwaitingShipmentRows(jwt, buyer) {
    const { items, totalCount, error, forbidden } = await fetchPage(
        jwt, ACTION_CANDIDATE_FILTERS[0], 1, ACTION_PAGE_SIZE, buyer);
    return {
        rows: items.map((row) => ({ ...row, needsShipment: true })),
        warning: Boolean(error),
        truncated: totalCount > items.length,
        forbidden,
    };
}

async function resolveBuyerIds(jwt, q) {
    if (!q) return null;
    if (typeof findStrapiUserIdsForByeMoney === 'function') {
        return findStrapiUserIdsForByeMoney(jwt, q);
    }
    const id = await findStrapiUserIdForByeMoney(jwt, q);
    if (id === null) return null;
    return id === '__USER_NOT_FOUND__' ? [] : [id];
}

function dedupeAndSortByDate(rows) {
    const seen = new Set();
    const unique = [];
    for (const r of rows) {
        if (!r?.orderId || seen.has(r.orderId)) continue;
        seen.add(r.orderId);
        unique.push(r);
    }
    return unique.sort((a, b) => new Date(b.createdAtUtc || 0) - new Date(a.createdAtUtc || 0));
}

async function getActionRows(jwt, buyer, restockIds) {
    const [restock, awaiting] = await Promise.all([
        getRestockRows(jwt, restockIds),
        getAwaitingShipmentRows(jwt, buyer),
    ]);
    const restockRows = buyer ? restock.rows.filter((r) => r.buyerExternalUserId === buyer) : restock.rows;
    const seen = new Set(restockRows.map((r) => r.orderId));
    const rows = [...restockRows, ...awaiting.rows.filter((r) => !seen.has(r.orderId))];
    return { rows, warning: restock.warning || awaiting.warning, truncated: awaiting.truncated, forbidden: awaiting.forbidden };
}

async function getActionRowsForBuyers(jwt, buyerIds, restockIds) {
    if (!buyerIds || buyerIds.length === 1) {
        return getActionRows(jwt, buyerIds?.[0] || null, restockIds);
    }
    const [restock, ...awaitingList] = await Promise.all([
        getRestockRows(jwt, restockIds),
        ...buyerIds.map((b) => getAwaitingShipmentRows(jwt, b)),
    ]);
    const buyerSet = new Set(buyerIds);
    const restockRows = restock.rows.filter((r) => buyerSet.has(r.buyerExternalUserId));
    const awaitingRows = dedupeAndSortByDate(awaitingList.flatMap((a) => a.rows));
    const seen = new Set(restockRows.map((r) => r.orderId));
    const rows = [...restockRows, ...awaitingRows.filter((r) => !seen.has(r.orderId))];
    return {
        rows,
        warning: restock.warning || awaitingList.some((a) => a.warning),
        truncated: awaitingList.some((a) => a.truncated),
        forbidden: awaitingList.some((a) => a.forbidden),
    };
}

async function countFilteredForBuyers(jwt, filters, buyerIds) {
    if (!buyerIds || buyerIds.length === 1) {
        return countFiltered(jwt, filters, buyerIds?.[0] || null);
    }
    const counts = await Promise.all(buyerIds.map((b) => countFiltered(jwt, filters, b)));
    if (counts.some((c) => c === null)) return null;
    return counts.reduce((sum, c) => sum + c, 0);
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
    const buyerIds = await resolveBuyerIds(jwt, q);
    const restock = await getRestockOrderIds(jwt);
    const base = { restockIds: restock.ids, restockError: restock.error };
    if (Array.isArray(buyerIds) && buyerIds.length === 0) return { ...empty, ...base };

    if (view === 'restock') {
        const r = await getRestockRows(jwt, restock.ids);
        const buyerSet = buyerIds ? new Set(buyerIds) : null;
        const rows = buyerSet ? r.rows.filter((x) => buyerSet.has(x.buyerExternalUserId)) : r.rows;
        return { ...empty, ...base, orders: await withPeople(jwt, rows), total: rows.length, warning: r.warning };
    }

    if (normalizeTab(tab) === 'action') {
        const r = await getActionRowsForBuyers(jwt, buyerIds, restock.ids);
        return {
            ...empty,
            ...base,
            orders: await withPeople(jwt, r.rows),
            total: r.rows.length,
            warning: r.warning,
            truncated: r.truncated,
            forbidden: r.forbidden,
        };
    }

    const filters = TAB_FILTERS[normalizeTab(tab)];
    if (!buyerIds || buyerIds.length === 1) {
        const r = await fetchFiltered(jwt, filters, { start, limit, buyer: buyerIds?.[0] || null });
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

    const results = await Promise.all(
        buyerIds.map((b) => fetchFiltered(jwt, filters, { start: 0, limit: start + limit, buyer: b }))
    );
    const merged = dedupeAndSortByDate(results.flatMap((res) => res.items));
    const sliced = merged.slice(start, start + limit);
    const totalCount = results.reduce((sum, res) => sum + res.totalCount, 0);
    return {
        ...empty,
        ...base,
        orders: await withPeople(jwt, sliced),
        total: totalCount,
        hasMore: start + sliced.length < totalCount && sliced.length > 0,
        warning: results.some((res) => res.warning),
        forbidden: results.some((res) => res.forbidden),
    };
}

/** شمارندهٔ تب‌ها (با همان جستجوی خریدار). action در صورت داشتن فهرست همان تب از طول آن گرفته می‌شود. */
export async function getByeMoneyOrderCounts(jwt, { q, actionCount } = {}) {
    const buyerIds = await resolveBuyerIds(jwt, q);
    if (Array.isArray(buyerIds) && buyerIds.length === 0) return { action: 0, all: 0, paid: 0, pending: 0, canceled: 0 };
    const [all, paid, pending, canceled, action] = await Promise.all([
        countFilteredForBuyers(jwt, TAB_FILTERS.all, buyerIds),
        countFilteredForBuyers(jwt, TAB_FILTERS.paid, buyerIds),
        countFilteredForBuyers(jwt, TAB_FILTERS.pending, buyerIds),
        countFilteredForBuyers(jwt, TAB_FILTERS.canceled, buyerIds),
        actionCount !== undefined
            ? actionCount
            : getRestockOrderIds(jwt).then((r) => getActionRowsForBuyers(jwt, buyerIds, r.ids)).then((r) => r.rows.length).catch(() => null),
    ]);
    return { action, all, paid, pending, canceled };
}
