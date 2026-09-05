import { adminFetch } from './adminFetch';
import { STRAPI_API_URL } from '../api';

export async function getOrdersStats(jwt) {
    const countData = await adminFetch('/api/orders?pagination[limit]=1', jwt);
    const totalOrders = countData?.meta?.pagination?.total ?? null;

    let totalRevenue = null;
    try {
        const pageSize = 100;
        const fieldsParams = 'fields[0]=totalPrice&fields[1]=orderStatus&fields[2]=paymentStatus&fields[3]=discountAmount&fields[4]=originalTotalPrice';
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

            // فقط سفارش‌های تأیید شده (پرداخت‌شده، ارسال‌شده، تحویل‌داده‌شده)
            const confirmedStatuses = ['paid', 'shipped', 'delivered'];

            totalRevenue = allOrders.reduce((sum, order) => {
                const attrs = order?.attributes || order || {};
                const oStatus = (attrs.orderStatus || order?.orderStatus || '').trim().toLowerCase();
                const pStatus = (attrs.paymentStatus || order?.paymentStatus || '').trim().toLowerCase();

                const isConfirmed = pStatus === 'paid' || confirmedStatuses.includes(oStatus);

                if (isConfirmed) {
                    // محاسبه مبلغ نهایی پرداختی پس از کسر کد تخفیف (درآمد واقعی)
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
        }
    } catch (err) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[getOrdersStats] Error calculating revenue:', err);
        }
        totalRevenue = null;
    }

    return { totalOrders, totalRevenue };
}

export async function getOrders(jwt, { page = 1, pageSize = 50, start, limit } = {}) {
    const paginationQuery = (start !== undefined && limit !== undefined)
        ? `pagination[start]=${start}&pagination[limit]=${limit}`
        : `pagination[page]=${page}&pagination[pageSize]=${pageSize}`;

    const endpoint =
        `/api/orders?populate[user][fields][0]=username&populate[user][fields][1]=email&populate[user][fields][2]=phoneNumber&populate[user][fields][3]=firstName&populate[user][fields][4]=lastName&populate[receiptImage]=true&populate[items]=true&sort=createdAt:desc&${paginationQuery}`;

    const data = await adminFetch(endpoint, jwt);
    if (!data) return { orders: [], meta: null, error: true };

    const orders = (data.data || []).map((item) => {
        const attrs = item.attributes || item;
        const user = attrs.user?.data?.attributes || attrs.user || null;
        const receiptImage = attrs.receiptImage?.data?.attributes || attrs.receiptImage || null;

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
