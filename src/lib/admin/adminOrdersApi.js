import { adminFetch } from './adminFetch';
import { STRAPI_API_URL } from '../api';

function toEnglishDigits(str) {
    if (!str) return '';
    return String(str)
        .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
        .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
}

export async function getOrdersStats(jwt) {
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

import { getAdminCoursePurchases } from '../byeMoneyApi';

function mapByeMoneyToAdminOrder(item) {
    return {
        id: item.purchaseId,
        documentId: item.purchaseId,
        purchaseId: item.purchaseId,
        cartId: item.cartId,
        orderNumber: item.purchaseId.slice(0, 8).toUpperCase(),
        source: 'byemoney',
        orderSource: 'byemoney',
        isByeMoney: true,
        paymentMethod: 'noor',
        paymentStatus: 'paid',
        orderStatus: 'paid',
        totalPrice: item.finalAmountInNoor,
        financialStatus: item.financialStatus,
        deliveryStatus: item.deliveryStatus,
        createdAt: item.purchasedAtUtc,
        fullName: item.buyerDisplayName || 'کاربر بای‌مانی',
        buyerDisplayName: item.buyerDisplayName,
        buyerExternalUserId: item.buyerExternalUserId,
        phone: null,
        email: null,
        trackingNumber: null,
        cardHolderName: null,
        notes: null,
        items: [{
            __component: 'order.course-order-item',
            title: item.courseTitle || 'دوره آموزشی',
            price: item.finalAmountInNoor,
            type: 'order.course-order-item',
        }],
        user: {
            username: item.buyerDisplayName || item.buyerExternalUserId,
            documentId: item.buyerExternalUserId,
        },
        receiptImageUrl: null,
        settlement: null,
        settledAt: null,
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

async function fetchByeMoneyOrdersRaw(jwt, { page = 1, pageSize = 20, buyerExternalUserId, status }) {
    if (status === 'pending' || status === 'canceled') {
        return { items: [], totalCount: 0, byemoneyWarning: false };
    }
    if (buyerExternalUserId === '__USER_NOT_FOUND__') {
        return { items: [], totalCount: 0, byemoneyWarning: false };
    }

    try {
        const res = await getAdminCoursePurchases({
            jwt,
            page,
            pageSize,
            buyerExternalUserId: buyerExternalUserId || undefined,
            financialStatus: 'Paid',
        });
        if (res.success && res.data) {
            const mapped = (res.data.items || []).map(mapByeMoneyToAdminOrder);
            return {
                items: mapped,
                totalCount: res.data.totalCount || 0,
                byemoneyWarning: false,
            };
        }
        return {
            items: [],
            totalCount: 0,
            byemoneyWarning: true,
            error: res.error,
        };
    } catch (err) {
        console.error('[AdminOrdersApi] ByeMoney fetch error:', err);
        return {
            items: [],
            totalCount: 0,
            byemoneyWarning: true,
            error: err.message,
        };
    }
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

    // ۱. فیلتر فقط استراپی
    if (source === 'strapi') {
        const strapiData = await fetchStrapiOrdersRaw(jwt, {
            start: reqStart,
            limit: reqLimit,
            status,
            search,
            statusPriority,
            period,
            settlementId,
        });
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

    // ۲. فیلتر فقط بای‌مانی
    if (source === 'byemoney') {
        const bmPage = Math.floor(reqStart / reqLimit) + 1;
        const bmData = await fetchByeMoneyOrdersRaw(jwt, {
            page: bmPage,
            pageSize: reqLimit,
            buyerExternalUserId,
            status,
        });
        return {
            orders: bmData.items,
            meta: {
                pagination: {
                    total: bmData.totalCount,
                    start: reqStart,
                    limit: reqLimit,
                    page: bmPage,
                    pageSize: reqLimit,
                },
            },
            byemoneyWarning: bmData.byemoneyWarning,
            error: false,
        };
    }

    // ۳. منبع «همه»: صفحه‌بندی متوالی (اول کل بای‌مانی از جدید به قدیم، سپس سفارش‌های استراپی)
    const bmProbe = await fetchByeMoneyOrdersRaw(jwt, {
        page: 1,
        pageSize: reqLimit,
        buyerExternalUserId,
        status,
    });

    const bmTotal = bmProbe.totalCount || 0;
    const byemoneyWarning = bmProbe.byemoneyWarning;

    const rangeStart = reqStart;
    const rangeEnd = reqStart + reqLimit;

    let orders = [];
    let strapiTotal = 0;

    // حالت الف: کل این صفحه متعلق به بای‌مانی است
    if (rangeEnd <= bmTotal && bmTotal > 0) {
        const bmPage = Math.floor(rangeStart / reqLimit) + 1;
        if (bmPage === 1) {
            orders = bmProbe.items.slice(0, reqLimit);
        } else {
            const pageData = await fetchByeMoneyOrdersRaw(jwt, {
                page: bmPage,
                pageSize: reqLimit,
                buyerExternalUserId,
                status,
            });
            orders = pageData.items;
        }
        const strapiCountData = await fetchStrapiOrdersRaw(jwt, {
            start: 0,
            limit: 1,
            status,
            search,
            statusPriority,
            period,
            settlementId,
        });
        strapiTotal = strapiCountData.meta?.pagination?.total || 0;
    }
    // حالت ب: صفحه مرز بین بای‌مانی و استراپی (ته‌مانده بای‌مانی و بقیه از ابتدای استراپی)
    else if (rangeStart < bmTotal && rangeEnd > bmTotal && bmTotal > 0) {
        const bmCount = bmTotal - rangeStart;
        const bmPage = Math.floor(rangeStart / reqLimit) + 1;
        let bmRemaining = [];
        if (bmPage === 1) {
            bmRemaining = bmProbe.items.slice(rangeStart % reqLimit, bmTotal);
        } else {
            const pageData = await fetchByeMoneyOrdersRaw(jwt, {
                page: bmPage,
                pageSize: reqLimit,
                buyerExternalUserId,
                status,
            });
            bmRemaining = pageData.items.slice(0, bmCount);
        }

        const strapiCount = reqLimit - bmCount;
        const strapiData = await fetchStrapiOrdersRaw(jwt, {
            start: 0,
            limit: strapiCount,
            status,
            search,
            statusPriority,
            period,
            settlementId,
        });

        strapiTotal = strapiData.meta?.pagination?.total || 0;
        orders = [...bmRemaining, ...strapiData.orders];
    }
    // حالت ج: کل این صفحه از استراپی تامین می‌شود
    else {
        const strapiStart = Math.max(0, rangeStart - bmTotal);
        const strapiData = await fetchStrapiOrdersRaw(jwt, {
            start: strapiStart,
            limit: reqLimit,
            status,
            search,
            statusPriority,
            period,
            settlementId,
        });
        strapiTotal = strapiData.meta?.pagination?.total || 0;
        orders = strapiData.orders;
    }

    const totalCount = bmTotal + strapiTotal;

    return {
        orders,
        meta: {
            pagination: {
                total: totalCount,
                start: reqStart,
                limit: reqLimit,
                page: Math.floor(reqStart / reqLimit) + 1,
                pageSize: reqLimit,
            },
        },
        byemoneyWarning,
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
