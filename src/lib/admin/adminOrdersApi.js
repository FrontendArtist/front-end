import { adminFetch } from './adminFetch';
import { STRAPI_API_URL } from '../api';

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

        return {
            totalOrders: list.length,
            totalRevenue: revenue,
            statusCounts: {
                pending: pendingCount,
                paid: paidCount,
                canceled: canceledCount,
            },
        };
    }

    try {
        const pageSize = 100;
        const fieldsParams = 'fields[0]=totalPrice&fields[1]=orderStatus&fields[2]=paymentStatus&fields[3]=discountAmount&fields[4]=originalTotalPrice&fields[5]=settledAt';
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

export async function getOrders(jwt, { page, pageSize = 50, start, limit, status, search, statusPriority, period = 'current', settlementId } = {}) {
    const params = new URLSearchParams();

    // ۱. صفحه‌بندی
    if (start !== undefined && limit !== undefined) {
        params.set('pagination[start]', String(start));
        params.set('pagination[limit]', String(limit));
    } else {
        params.set('pagination[page]', String(page || 1));
        params.set('pagination[pageSize]', String(pageSize));
    }

    // ۲. فیلدهای ارتباطی و مدیا
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

    // ۳. اولویت‌بندی وضعیت / مرتب‌سازی
    if (statusPriority) {
        params.set('statusPriority', 'true');
    } else {
        params.set('sort', 'createdAt:desc');
    }

    // ۴. فیلتر دوره تسویه
    if (settlementId) {
        params.set('filters[settlement][id][$eq]', String(settlementId));
    } else if (period === 'current') {
        params.set('filters[settledAt][$null]', 'true');
    } else if (period === 'settled') {
        params.set('filters[settledAt][$notNull]', 'true');
    }
    // اگر period === 'all' باشد، هیچ فیلتری روی settledAt اعمال نمی‌شود

    // ۵. فیلتر وضعیت سفارش
    if (status && status !== 'all') {
        if (status === 'pending') {
            params.set('filters[orderStatus][$eq]', 'pending');
        } else if (status === 'paid') {
            params.set('filters[orderStatus][$in][0]', 'paid');
            params.set('filters[orderStatus][$in][1]', 'shipped');
            params.set('filters[orderStatus][$in][2]', 'delivered');
        } else if (status === 'canceled') {
            params.set('filters[orderStatus][$eq]', 'canceled');
        }
    }

    // ۶. فیلتر جستجو
    if (search && search.trim()) {
        const rawQ = search.trim();
        const numericQ = rawQ.replace(/^#/, '').trim();
        const isNumeric = /^\d+$/.test(numericQ);

        let orIdx = 0;
        if (isNumeric) {
            params.set(`filters[$or][${orIdx}][id][$eq]`, numericQ);
            orIdx++;
        }
        params.set(`filters[$or][${orIdx}][documentId][$containsi]`, rawQ);
        orIdx++;
        params.set(`filters[$or][${orIdx}][fullName][$containsi]`, rawQ);
        orIdx++;
        params.set(`filters[$or][${orIdx}][cardHolderName][$containsi]`, rawQ);
        orIdx++;
        params.set(`filters[$or][${orIdx}][phone][$containsi]`, rawQ);
        orIdx++;
        params.set(`filters[$or][${orIdx}][email][$containsi]`, rawQ);
        orIdx++;
        params.set(`filters[$or][${orIdx}][trackingNumber][$containsi]`, rawQ);
        orIdx++;
        params.set(`filters[$or][${orIdx}][user][username][$containsi]`, rawQ);
        orIdx++;
        params.set(`filters[$or][${orIdx}][user][phoneNumber][$containsi]`, rawQ);
        orIdx++;
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

        return {
            id: item.id,
            documentId: item.documentId || String(item.id),
            orderNumber: attrs.orderNumber || `#${item.id}`,
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
