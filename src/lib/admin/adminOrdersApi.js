import { adminFetch } from './adminFetch';
import { STRAPI_API_URL } from '../api';
import { getAdminCourseOrders } from '../byeMoneyApi';
import {
    BYEMONEY_ONLY_TABS,
    financialStatusesForTab,
    mapByeMoneyOrderRow,
} from './orderTracking';

function toEnglishDigits(str) {
    if (!str) return '';
    return String(str)
        .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
        .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

const BYEMONEY_REVENUE_PAGE_SIZE = 100;
const BYEMONEY_REVENUE_MAX_PAGES = 100;

async function countByeMoneyOrders(jwt, financialStatus) {
    const res = await getAdminCourseOrders({ jwt, page: 1, pageSize: 1, financialStatus });
    if (!res.success) throw new Error(res.error || 'byemoney count failed');
    return res.data?.totalCount ?? 0;
}

/** مبلغ خالص یک سفارش بای‌مانی: پرداخت‌شده منهای برگشتی لغو کالا (هیچ‌وقت منفی نمی‌شود) */
function netByeMoneyAmount(order) {
    const paid = Number(order.finalAmountInNoor || 0);
    const refunded = Number(order.refundedAmountInNoor || 0);
    return Math.max(0, paid - refunded);
}

/** جمع مبلغ خالص (نور) فقط سفارش‌های Paid؛ اگر هر صفحه‌ای خطا بدهد null تا عدد ناقص نمایش داده نشود */
async function sumPaidByeMoneyRevenue(jwt, paidCount) {
    if (!paidCount) return 0;
    const pageCount = Math.min(Math.ceil(paidCount / BYEMONEY_REVENUE_PAGE_SIZE), BYEMONEY_REVENUE_MAX_PAGES);
    const pages = await Promise.all(
        Array.from({ length: pageCount }, (_, i) =>
            getAdminCourseOrders({
                jwt,
                page: i + 1,
                pageSize: BYEMONEY_REVENUE_PAGE_SIZE,
                financialStatus: 'Paid',
            })
        )
    );
    if (pages.some((p) => !p.success)) return null;
    return pages.reduce(
        (sum, p) =>
            sum +
            (p.data?.items || []).reduce(
                (s, o) => (o.financialStatus === 'Paid' ? s + netByeMoneyAmount(o) : s),
                0
            ),
        0
    );
}

/**
 * شمارنده‌ها و درآمد سفارش‌های بای‌مانی. در انتظار = AwaitingPayment + Processing (همان تب «در انتظار»).
 * درآمد فقط از سفارش‌های Paid و به «نور» است؛ با تومانِ استرپی جمع نمی‌شود.
 */
async function getByeMoneyOrderStats(jwt) {
    try {
        const [paid, awaiting, processing, failed, expired, review] = await Promise.all(
            ['Paid', 'AwaitingPayment', 'Processing', 'Failed', 'Expired', 'RequiresReview'].map((s) =>
                countByeMoneyOrders(jwt, s)
            )
        );
        const revenueNoor = await sumPaidByeMoneyRevenue(jwt, paid);
        return {
            available: true,
            counts: { paid, pending: awaiting + processing, canceled: failed, expired, review },
            revenueNoor,
        };
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[getOrdersStats] ByeMoney stats error:', err);
        }
        return { available: false, counts: null, revenueNoor: null };
    }
}

/**
 * آمار صفحهٔ سفارش‌ها: شمارندهٔ تب‌ها هم استرپی و هم بای‌مانی را می‌شمارد.
 * شمارندهٔ خالص استرپی در `strapiStatusCounts` می‌ماند (حذف گروهی و تسویه فقط استرپی را دربر می‌گیرند).
 */
export async function getOrdersStats(jwt) {
    const [strapiStats, byemoney] = await Promise.all([getStrapiOrdersStats(jwt), getByeMoneyOrderStats(jwt)]);
    const strapiCounts = strapiStats.statusCounts;
    const bm = byemoney.counts;
    const statusCounts = bm
        ? {
            pending: (strapiCounts?.pending ?? 0) + bm.pending,
            paid: (strapiCounts?.paid ?? 0) + bm.paid,
            canceled: (strapiCounts?.canceled ?? 0) + bm.canceled,
            online: strapiCounts?.online ?? 0,
            expired: bm.expired,
            review: bm.review,
        }
        : strapiCounts && { ...strapiCounts, expired: 0, review: 0 };
    return { ...strapiStats, statusCounts, strapiStatusCounts: strapiCounts, byemoney };
}

async function getStrapiOrdersStats(jwt) {
    const countData = await adminFetch('/api/orders?pagination[limit]=1', jwt);
    const totalOrders = countData?.meta?.pagination?.total ?? null;

    let totalRevenue = null;
    let statusCounts = null;

    // تابع کمکی برای محاسبه آمار یک لیست سفارش
    function computeStatsForList(list) {
        const confirmedStatuses = ['paid', 'shipped', 'delivered'];
        const revenue = list.reduce((sum, order) => {
            const attrs = order?.attributes || order || {};
            const oStatus = (attrs.orderStatus || order?.orderStatus || '').trim().toLowerCase();
            const pStatus = (attrs.paymentStatus || order?.paymentStatus || '').trim().toLowerCase();

            const isConfirmed = pStatus === 'paid' || confirmedStatuses.includes(oStatus);

            if (isConfirmed) {
                let paidAmount = Number(attrs.totalPrice ?? order?.totalPrice ?? 0);
                const discount = Number(attrs.discountAmount ?? order?.discountAmount ?? 0);
                const original = (attrs.originalTotalPrice !== null && attrs.originalTotalPrice !== undefined)
                    ? Number(attrs.originalTotalPrice)
                    : (order?.originalTotalPrice !== null && order?.originalTotalPrice !== undefined ? Number(order?.originalTotalPrice) : null);

                if (discount > 0 && original !== null) {
                    paidAmount = Math.min(paidAmount, Math.max(0, original - discount));
                }

                return sum + Number(paidAmount || 0);
            }
            return sum;
        }, 0);

        const pendingCount = list.filter(o => (o.attributes?.orderStatus || o.orderStatus || '').trim().toLowerCase() === 'pending').length;
        const paidCount = list.filter(o => {
            const s = (o.attributes?.orderStatus || o.orderStatus || '').trim().toLowerCase();
            const ps = (o.attributes?.paymentStatus || o.paymentStatus || '').trim().toLowerCase();
            return ['paid', 'shipped', 'delivered'].includes(s) || ps === 'paid';
        }).length;
        const canceledCount = list.filter(o => (o.attributes?.orderStatus || o.orderStatus || '').trim().toLowerCase() === 'canceled').length;
        const onlineCount = list.filter(o => {
            const pm = (o.attributes?.paymentMethod || o.paymentMethod || '').trim().toLowerCase();
            return pm === 'online';
        }).length;

        return {
            totalOrders: list.length,
            totalRevenue: revenue,
            statusCounts: {
                pending: pendingCount,
                paid: paidCount,
                canceled: canceledCount,
                online: onlineCount,
            },
        };
    }

    try {
        const pageSize = 100;
        const fieldsParams = 'fields[0]=totalPrice&fields[1]=orderStatus&fields[2]=paymentStatus&fields[3]=discountAmount&fields[4]=originalTotalPrice&fields[5]=settledAt&fields[6]=paymentMethod';
        const endpoint = `/api/orders?${fieldsParams}&pagination[page]=1&pagination[pageSize]=${pageSize}`;
        const firstPageData = await adminFetch(endpoint, jwt);

        if (firstPageData?.data && Array.isArray(firstPageData.data)) {
            let allOrders = [...firstPageData.data];
            const pageCount = firstPageData.meta?.pagination?.pageCount || 1;

            if (pageCount > 1) {
                const remainingPromises = [];
                for (let page = 2; page <= pageCount; page++) {
                    const pEndpoint = `/api/orders?${fieldsParams}&pagination[page]=${page}&pagination[pageSize]=${pageSize}`;
                    remainingPromises.push(adminFetch(pEndpoint, jwt));
                }
                const results = await Promise.allSettled(remainingPromises);
                for (const res of results) {
                    if (res.status === 'fulfilled' && res.value?.data && Array.isArray(res.value.data)) {
                        allOrders.push(...res.value.data);
                    }
                }
            }

            // فیلتر سفارش‌های دوره جاری (که هنوز تسویه نشده‌اند)
            const currentPeriodOrders = allOrders.filter((o) => {
                const attrs = o?.attributes || o || {};
                return !attrs.settledAt && !attrs.settlement;
            });

            const currentStats = computeStatsForList(currentPeriodOrders);
            const allTimeStats = computeStatsForList(allOrders);

            // دریافت تعداد کل دوره‌های تسویه انجام شده
            let settlementsCount = 0;
            try {
                const sCountData = await adminFetch('/api/settlements?pagination[limit]=1', jwt);
                settlementsCount = sCountData?.meta?.pagination?.total ?? 0;
            } catch {
                settlementsCount = 0;
            }

            return {
                totalOrders: currentStats.totalOrders, // مقدار پیش‌فرض: سفارش‌های باز دوره جاری
                totalRevenue: currentStats.totalRevenue, // درآمد دوره جاری
                statusCounts: currentStats.statusCounts,
                currentPeriod: currentStats,
                allTime: {
                    ...allTimeStats,
                    totalOrders: totalOrders ?? allOrders.length,
                },
                settlementsCount,
            };
        }
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[getOrdersStats] Error calculating revenue:', err);
        }
        totalRevenue = null;
    }

    return {
        totalOrders,
        totalRevenue,
        statusCounts,
        currentPeriod: { totalOrders: totalOrders ?? 0, totalRevenue: null, statusCounts: null },
        allTime: { totalOrders: totalOrders ?? 0, totalRevenue: null, statusCounts: null },
        settlementsCount: 0,
    };
}

async function findStrapiUserIdForByeMoney(jwt, search) {
    if (!search || !search.trim()) return null;
    const raw = search.trim();
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
        return raw;
    }
    try {
        const normalized = toEnglishDigits(raw);
        const cleanDigits = normalized.replace(/\D/g, '');
        const userParams = new URLSearchParams();
        userParams.set('pagination[pageSize]', '5');
        let idx = 0;
        if (cleanDigits.length >= 7) {
            userParams.set(`filters[$or][${idx}][phoneNumber][$containsi]`, cleanDigits);
            idx++;
        }
        userParams.set(`filters[$or][${idx}][username][$containsi]`, raw);
        idx++;
        userParams.set(`filters[$or][${idx}][firstName][$containsi]`, raw);
        idx++;
        userParams.set(`filters[$or][${idx}][lastName][$containsi]`, raw);
        idx++;

        const res = await adminFetch(`/api/users?${userParams.toString()}`, jwt);
        const list = Array.isArray(res) ? res : (res?.data || []);
        if (list.length > 0) {
            return list[0].documentId || String(list[0].id);
        }
        return '__USER_NOT_FOUND__';
    } catch (e) {
        console.error('[AdminOrdersApi] search user in strapi error:', e);
        return null;
    }
}

/**
 * یک صفحه از فهرست پیگیری بای‌مانی (هر ردیف یک سفارش با هر وضعیت مالی).
 * @returns {Promise<{ items: object[], totalCount: number, error?: string }>}
 */
async function fetchByeMoneyPage(jwt, { page, pageSize, buyerExternalUserId, financialStatus }) {
    try {
        const res = await getAdminCourseOrders({
            jwt,
            page,
            pageSize,
            buyerExternalUserId: buyerExternalUserId || undefined,
            financialStatus,
        });
        if (res.success && res.data) {
            return {
                items: (res.data.items || []).map(mapByeMoneyOrderRow),
                totalCount: res.data.totalCount || 0,
            };
        }
        return { items: [], totalCount: 0, error: res.error || 'خطا در دریافت سفارش‌های بای‌مانی' };
    } catch (err) {
        console.error('[AdminOrdersApi] ByeMoney fetch error:', err);
        return { items: [], totalCount: 0, error: err.message || 'خطا' };
    }
}

/** بازهٔ [localStart, localStart+take) از یک وضعیت مالی؛ با pageSize ثابت حداکثر دو صفحه می‌خواند */
async function fetchByeMoneySlice(jwt, { financialStatus, buyerExternalUserId, localStart, take, pageSize }) {
    const firstPage = Math.floor(localStart / pageSize) + 1;
    const lastPage = Math.floor((localStart + take - 1) / pageSize) + 1;
    const base = { buyerExternalUserId, financialStatus, pageSize };
    const first = await fetchByeMoneyPage(jwt, { ...base, page: firstPage });
    let items = first.items;
    let error = first.error;
    if (!error && lastPage > firstPage) {
        const second = await fetchByeMoneyPage(jwt, { ...base, page: lastPage });
        items = [...items, ...second.items];
        error = second.error;
    }
    const offset = localStart - (firstPage - 1) * pageSize;
    return { items: items.slice(offset, offset + take), totalCount: first.totalCount, error };
}

/**
 * سفارش‌های بای‌مانی یک تب از موقعیت `start` به تعداد `limit`.
 * API فقط یک financialStatus می‌پذیرد؛ تب چندوضعیتی (در انتظار) با چند فراخوانی ترتیبی و جمع شمارش‌ها
 * صفحه‌بندی می‌شود (Processing پیش از AwaitingPayment؛ نگاه کنید به TAB_FINANCIAL_STATUSES).
 * @returns {Promise<{ items: object[], totalCount: number, byemoneyWarning: boolean, error?: string }>}
 */
async function fetchByeMoneyOrdersRaw(jwt, { start = 0, limit = 20, buyerExternalUserId, status }) {
    const empty = { items: [], totalCount: 0, byemoneyWarning: false };
    if (buyerExternalUserId === '__USER_NOT_FOUND__') return empty;

    const statuses = financialStatusesForTab(status);
    if (statuses.length === 0) return empty;

    if (statuses.length === 1) {
        const r = await fetchByeMoneySlice(jwt, {
            financialStatus: statuses[0],
            buyerExternalUserId,
            localStart: start,
            take: limit,
            pageSize: limit,
        });
        return { items: r.items, totalCount: r.totalCount, byemoneyWarning: Boolean(r.error), error: r.error };
    }

    const probes = await Promise.all(
        statuses.map((financialStatus) =>
            fetchByeMoneyPage(jwt, { page: 1, pageSize: 1, buyerExternalUserId, financialStatus })
        )
    );
    let warning = probes.some((p) => p.error);
    const totals = probes.map((p) => p.totalCount);
    const totalCount = totals.reduce((a, b) => a + b, 0);

    const items = [];
    let cursor = start;
    let remaining = limit;
    let base = 0;
    for (let i = 0; i < statuses.length; i++) {
        if (remaining > 0 && cursor < base + totals[i]) {
            const localStart = cursor - base;
            const take = Math.min(remaining, totals[i] - localStart);
            const r = await fetchByeMoneySlice(jwt, {
                financialStatus: statuses[i],
                buyerExternalUserId,
                localStart,
                take,
                pageSize: limit,
            });
            if (r.error) warning = true;
            items.push(...r.items);
            cursor += r.items.length;
            remaining -= r.items.length;
        }
        base += totals[i];
    }
    return { items, totalCount, byemoneyWarning: warning };
}

async function fetchStrapiOrdersRaw(jwt, { start, limit, page, pageSize, status, search, statusPriority, period, settlementId }) {
    const params = new URLSearchParams();

    if (start !== undefined && limit !== undefined) {
        params.set('pagination[start]', String(start));
        params.set('pagination[limit]', String(limit));
    } else {
        params.set('pagination[page]', String(page || 1));
        params.set('pagination[pageSize]', String(pageSize || 20));
    }

    params.set('populate[user][fields][0]', 'username');
    params.set('populate[user][fields][1]', 'email');
    params.set('populate[user][fields][2]', 'phoneNumber');
    params.set('populate[user][fields][3]', 'firstName');
    params.set('populate[user][fields][4]', 'lastName');
    params.set('populate[receiptImage]', 'true');
    params.set('populate[items]', 'true');
    params.set('populate[settlement][fields][0]', 'title');
    params.set('populate[settlement][fields][1]', 'periodNumber');
    params.set('populate[settlement][fields][2]', 'settledAt');

    if (statusPriority) {
        params.set('statusPriority', 'true');
    } else {
        params.set('sort', 'createdAt:desc');
    }

    if (settlementId) {
        params.set('filters[settlement][id][$eq]', String(settlementId));
    } else if (period === 'current') {
        params.set('filters[settledAt][$null]', 'true');
    } else if (period === 'settled') {
        params.set('filters[settledAt][$notNull]', 'true');
    }

    if (status && status !== 'all') {
        if (status === 'pending') {
            params.set('filters[orderStatus][$eq]', 'pending');
        } else if (status === 'paid') {
            params.set('filters[orderStatus][$in][0]', 'paid');
            params.set('filters[orderStatus][$in][1]', 'shipped');
            params.set('filters[orderStatus][$in][2]', 'delivered');
        } else if (status === 'canceled') {
            params.set('filters[orderStatus][$eq]', 'canceled');
        } else if (status === 'online') {
            params.set('filters[paymentMethod][$eq]', 'online');
        }
    }

    if (search && search.trim()) {
        const rawQ = search.trim();
        const normalizedQ = toEnglishDigits(rawQ);
        const cleanDigits = normalizedQ.replace(/\D/g, '');
        const numericQ = normalizedQ.replace(/^#/, '').trim();
        const isPureNumber = /^\d+$/.test(numericQ);
        const isLikelyPhone = cleanDigits.length >= 7 || cleanDigits.startsWith('09') || cleanDigits.startsWith('98');

        let orIdx = 0;

        if (isPureNumber && !isLikelyPhone) {
            const idVal = parseInt(numericQ, 10);
            if (idVal > 0 && idVal <= 2147483647) {
                params.set(`filters[$or][${orIdx}][id][$eq]`, String(idVal));
                orIdx++;
            }
            if (numericQ.length >= 4) {
                params.set(`filters[$or][${orIdx}][trackingNumber][$containsi]`, numericQ);
                orIdx++;
            }
        } else if (isLikelyPhone) {
            const phoneCandidates = new Set();
            phoneCandidates.add(cleanDigits);
            if (cleanDigits.startsWith('98') && cleanDigits.length === 12) {
                phoneCandidates.add('0' + cleanDigits.slice(2));
                phoneCandidates.add(cleanDigits.slice(2));
            } else if (cleanDigits.startsWith('0') && cleanDigits.length === 11) {
                phoneCandidates.add(cleanDigits.slice(1));
            } else if (cleanDigits.startsWith('9') && cleanDigits.length === 10) {
                phoneCandidates.add('0' + cleanDigits);
            }

            for (const phone of phoneCandidates) {
                params.set(`filters[$or][${orIdx}][phone][$containsi]`, phone);
                orIdx++;
                params.set(`filters[$or][${orIdx}][user][phoneNumber][$containsi]`, phone);
                orIdx++;
                params.set(`filters[$or][${orIdx}][user][username][$containsi]`, phone);
                orIdx++;
            }
        } else {
            params.set(`filters[$or][${orIdx}][fullName][$containsi]`, rawQ);
            orIdx++;
            if (rawQ !== normalizedQ) {
                params.set(`filters[$or][${orIdx}][fullName][$containsi]`, normalizedQ);
                orIdx++;
            }
            params.set(`filters[$or][${orIdx}][cardHolderName][$containsi]`, rawQ);
            orIdx++;
            params.set(`filters[$or][${orIdx}][email][$containsi]`, normalizedQ);
            orIdx++;
            params.set(`filters[$or][${orIdx}][trackingNumber][$containsi]`, normalizedQ);
            orIdx++;
            params.set(`filters[$or][${orIdx}][user][username][$containsi]`, rawQ);
            orIdx++;
            if (rawQ !== normalizedQ) {
                params.set(`filters[$or][${orIdx}][user][username][$containsi]`, normalizedQ);
                orIdx++;
            }
            if (normalizedQ.length >= 8) {
                params.set(`filters[$or][${orIdx}][documentId][$containsi]`, normalizedQ);
                orIdx++;
            }
        }
    }

    const endpoint = `/api/orders?${params.toString()}`;
    const data = await adminFetch(endpoint, jwt);
    if (!data) return { orders: [], meta: null, error: true };

    const orders = (data.data || []).map((item) => {
        const attrs = item.attributes || item;
        const user = attrs.user?.data?.attributes || attrs.user || null;
        const receiptImage = attrs.receiptImage?.data?.attributes || attrs.receiptImage || null;
        const settlement = attrs.settlement?.data?.attributes || attrs.settlement || null;

        const rawItems = attrs.items || [];
        const items = rawItems.map(i => {
            const comp = i.__component || '';
            if (comp === 'order.course-order-item') {
                return {
                    __component: 'order.course-order-item',
                    title: i.title || '—',
                    price: i.price ?? 0,
                    courseId: i.courseId,
                    chapterId: i.chapterId || null,
                    slug: i.slug || '',
                };
            } else if (comp === 'order.product-order-item') {
                return {
                    __component: 'order.product-order-item',
                    title: i.title || '—',
                    price: i.price ?? 0,
                    quantity: i.quantity || 1,
                    productId: i.productId,
                    slug: i.slug || '',
                };
            }
            return { __component: comp, title: i.title || '—', price: i.price ?? 0 };
        });

        const userFullName = (user?.firstName || user?.lastName)
            ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
            : null;

        const extractFromNotes = (notes, label) => {
            if (!notes || typeof notes !== 'string') return null;
            const regex = new RegExp(`${label}\\s*([^\\n\\r]+)`, 'i');
            const match = notes.match(regex);
            return match ? match[1].trim() : null;
        };

        return {
            id: item.id,
            documentId: item.documentId || String(item.id),
            orderNumber: attrs.orderNumber || `#${item.id}`,
            source: 'strapi',
            orderSource: 'strapi',
            isByeMoney: false,
            paymentMethod: attrs.paymentMethod || 'unknown',
            paymentStatus: attrs.paymentStatus || 'pending_payment',
            orderStatus: attrs.orderStatus || 'pending',
            totalPrice: attrs.totalPrice ?? attrs.totalAmount ?? 0,
            trackingNumber: attrs.trackingNumber || null,
            cardHolderName: attrs.cardHolderName || null,
            fullName: attrs.fullName || userFullName || null,
            address: attrs.address || null,
            postalCode: attrs.postalCode || null,
            phone: attrs.phone || null,
            email: attrs.email || null,
            notes: attrs.notes || null,
            refNum: attrs.refNum || extractFromNotes(attrs.notes, 'رسید دیجیتال \\(RefNum\\):') || null,
            traceNo: attrs.traceNo || extractFromNotes(attrs.notes, 'کد رهگیری:') || attrs.trackingNumber || null,
            rrn: attrs.rrn || extractFromNotes(attrs.notes, 'شماره مرجع \\(RRN\\):') || null,
            securePan: attrs.securePan || extractFromNotes(attrs.notes, 'شماره کارت:') || null,
            hashedCardNumber: attrs.hashedCardNumber || null,
            paymentDate: attrs.paymentDate || null,
            createdAt: attrs.createdAt,
            settledAt: attrs.settledAt || null,
            settlement: settlement ? {
                id: attrs.settlement?.data?.id || attrs.settlement?.id,
                title: settlement.title,
                periodNumber: settlement.periodNumber,
                settledAt: settlement.settledAt,
            } : null,
            items,
            user: user ? {
                username: userFullName || user.username || user.name || '—',
                email: user.email || '—',
                phoneNumber: user.phoneNumber || '—',
            } : null,
            receiptImageUrl: receiptImage?.url
                ? (receiptImage.url.startsWith('http') ? receiptImage.url : `${STRAPI_API_URL}${receiptImage.url}`)
                : null,
            rejectionReason: attrs.rejectionReason || null,
        };
    });

    return { orders, meta: data.meta || null, error: false };
}

export async function getOrders(jwt, options = {}) {
    const {
        page,
        pageSize = 20,
        start,
        limit,
        status,
        search,
        statusPriority,
        period = 'current',
        settlementId,
        source = 'all',
    } = options;

    const reqLimit = limit !== undefined ? Number(limit) : (pageSize !== undefined ? Number(pageSize) : 20);
    const reqStart = start !== undefined ? Number(start) : ((Number(page) || 1) - 1) * reqLimit;

    // تب‌های «منقضی» و «نیازمند بررسی» فقط مفهوم بای‌مانی‌اند؛ ردیف‌های قدیمی استرپی در آن‌ها نیستند
    const strapiParams = { status, search, statusPriority, period, settlementId };
    const skipStrapi = BYEMONEY_ONLY_TABS.includes(status);
    // پوشهٔ آرشیو تسویه فقط سفارش‌های استرپی را دارد؛ سفارش‌های بای‌مانی تسویه نمی‌شوند
    const skipByeMoney = Boolean(settlementId);

    // ۱. فیلتر فقط استراپی
    if (source === 'strapi') {
        if (skipStrapi) {
            return { orders: [], meta: { pagination: { total: 0, start: reqStart, limit: reqLimit } }, byemoneyWarning: false, error: false };
        }
        const strapiData = await fetchStrapiOrdersRaw(jwt, { start: reqStart, limit: reqLimit, ...strapiParams });
        return {
            orders: strapiData.orders,
            meta: strapiData.meta,
            byemoneyWarning: false,
            error: strapiData.error,
        };
    }

    // شناسایی کاربر از استراپی برای ارسال به فیلتر بای‌مانی در صورت جستجو
    let buyerExternalUserId = null;
    if (search && search.trim()) {
        buyerExternalUserId = await findStrapiUserIdForByeMoney(jwt, search);
    }

    const bmData = skipByeMoney
        ? { items: [], totalCount: 0, byemoneyWarning: false }
        : await fetchByeMoneyOrdersRaw(jwt, {
            start: reqStart,
            limit: reqLimit,
            buyerExternalUserId,
            status,
        });

    // ۲. فیلتر فقط بای‌مانی
    if (source === 'byemoney') {
        return {
            orders: bmData.items,
            meta: {
                pagination: {
                    total: bmData.totalCount,
                    start: reqStart,
                    limit: reqLimit,
                    page: Math.floor(reqStart / reqLimit) + 1,
                    pageSize: reqLimit,
                },
            },
            byemoneyWarning: bmData.byemoneyWarning,
            error: false,
        };
    }

    // ۳. منبع «همه»: صفحه‌بندی متوالی (اول کل بای‌مانی از جدید به قدیم، سپس سفارش‌های استراپی)
    let orders = bmData.items;
    let strapiTotal = 0;

    if (!skipStrapi) {
        const strapiStart = Math.max(0, reqStart - bmData.totalCount);
        const strapiNeeded = reqLimit - bmData.items.length;
        const strapiData = await fetchStrapiOrdersRaw(jwt, {
            start: strapiStart,
            limit: Math.max(1, strapiNeeded),
            ...strapiParams,
        });
        strapiTotal = strapiData.meta?.pagination?.total || 0;
        if (strapiNeeded > 0) orders = [...orders, ...strapiData.orders];
    }

    return {
        orders,
        meta: {
            pagination: {
                total: bmData.totalCount + strapiTotal,
                start: reqStart,
                limit: reqLimit,
                page: Math.floor(reqStart / reqLimit) + 1,
                pageSize: reqLimit,
            },
        },
        byemoneyWarning: bmData.byemoneyWarning,
        error: false,
    };
}

export async function updateOrder(orderId, payload, jwt) {
    try {
        const res = await fetch(`${STRAPI_API_URL}/api/orders/${orderId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${jwt}`,
            },
            cache: 'no-store',
            body: JSON.stringify({ data: payload }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: err?.error?.message || `خطای ${res.status}` };
        }

        return { success: true, data: await res.json() };
    } catch (error) {
        return { success: false, error: 'Server error' };
    }
}
