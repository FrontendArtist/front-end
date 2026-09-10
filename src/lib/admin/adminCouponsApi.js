import { adminFetch } from './adminFetch';

/**
 * دریافت تعداد کل کدهای تخفیف
 */
export async function getTotalCouponsCount(jwt) {
    const data = await adminFetch('/api/coupons?pagination[limit]=1', jwt);
    return data?.meta?.pagination?.total ?? null;
}

/**
 * دریافت لیست کدهای تخفیف همراه با صفحه‌بندی و اطلاعات محصولات و دوره‌های مرتبط
 */
export async function getAdminCoupons(jwt, { page = 1, pageSize = 50, start, limit } = {}) {
    const paginationQuery = (start !== undefined && limit !== undefined)
        ? `pagination[start]=${start}&pagination[limit]=${limit}`
        : `pagination[page]=${page}&pagination[pageSize]=${pageSize}`;

    const endpoint = `/api/coupons?populate[products][fields][0]=title&populate[products][fields][1]=slug&populate[products][fields][2]=price&populate[courses][fields][0]=title&populate[courses][fields][1]=slug&populate[courses][fields][2]=price&sort=createdAt:desc&${paginationQuery}`;

    const data = await adminFetch(endpoint, jwt);

    if (!data) return { coupons: [], meta: null, error: true };

    const coupons = (data.data || []).map((item) => {
        const attrs = item.attributes || item;
        const docId = item.documentId || String(item.id);

        const rawProducts = attrs.products?.data || attrs.products || [];
        const products = Array.isArray(rawProducts)
            ? rawProducts.map((p) => {
                const pAttrs = p.attributes || p;
                return {
                    id: p.id,
                    documentId: p.documentId || String(p.id),
                    title: pAttrs.title || '',
                    slug: pAttrs.slug || '',
                    price: pAttrs.price ?? null,
                };
            })
            : [];

        const rawCourses = attrs.courses?.data || attrs.courses || [];
        const courses = Array.isArray(rawCourses)
            ? rawCourses.map((c) => {
                const cAttrs = c.attributes || c;
                return {
                    id: c.id,
                    documentId: c.documentId || String(c.id),
                    title: cAttrs.title || '',
                    slug: cAttrs.slug || '',
                    price: cAttrs.price ?? null,
                };
            })
            : [];

        return {
            id: item.id,
            documentId: docId,
            code: attrs.code || '',
            title: attrs.title || '',
            discountType: attrs.discountType || 'percentage',
            discountValue: Number(attrs.discountValue) || 0,
            maxDiscountAmount: attrs.maxDiscountAmount ? Number(attrs.maxDiscountAmount) : null,
            minOrderAmount: attrs.minOrderAmount ? Number(attrs.minOrderAmount) : null,
            appliesToAllProducts: !!attrs.appliesToAllProducts,
            appliesToAllCourses: !!attrs.appliesToAllCourses,
            products,
            courses,
            startDate: attrs.startDate || null,
            expiresAt: attrs.expiresAt || null,
            maxUsage: attrs.maxUsage ? Number(attrs.maxUsage) : null,
            usedCount: Number(attrs.usedCount) || 0,
            isActive: attrs.isActive !== false,
            createdAt: attrs.createdAt || null,
            updatedAt: attrs.updatedAt || null,
        };
    });

    return { coupons, meta: data.meta || null, error: false };
}

/**
 * دریافت یک کد تخفیف با documentId
 */
export async function getAdminCouponById(jwt, id) {
    const endpoint = `/api/coupons/${id}?populate[products][fields][0]=title&populate[products][fields][1]=slug&populate[products][fields][2]=price&populate[courses][fields][0]=title&populate[courses][fields][1]=slug&populate[courses][fields][2]=price`;

    const data = await adminFetch(endpoint, jwt);
    if (!data?.data) return null;

    const item = data.data;
    const attrs = item.attributes || item;
    const docId = item.documentId || String(item.id);

    const rawProducts = attrs.products?.data || attrs.products || [];
    const products = Array.isArray(rawProducts)
        ? rawProducts.map((p) => {
            const pAttrs = p.attributes || p;
            return {
                id: p.id,
                documentId: p.documentId || String(p.id),
                title: pAttrs.title || '',
                slug: pAttrs.slug || '',
            };
        })
        : [];

    const rawCourses = attrs.courses?.data || attrs.courses || [];
    const courses = Array.isArray(rawCourses)
        ? rawCourses.map((c) => {
            const cAttrs = c.attributes || c;
            return {
                id: c.id,
                documentId: c.documentId || String(c.id),
                title: cAttrs.title || '',
                slug: cAttrs.slug || '',
            };
        })
        : [];

    return {
        id: item.id,
        documentId: docId,
        code: attrs.code || '',
        title: attrs.title || '',
        discountType: attrs.discountType || 'percentage',
        discountValue: Number(attrs.discountValue) || 0,
        maxDiscountAmount: attrs.maxDiscountAmount ? Number(attrs.maxDiscountAmount) : null,
        minOrderAmount: attrs.minOrderAmount ? Number(attrs.minOrderAmount) : null,
        appliesToAllProducts: !!attrs.appliesToAllProducts,
        appliesToAllCourses: !!attrs.appliesToAllCourses,
        products,
        courses,
        startDate: attrs.startDate || null,
        expiresAt: attrs.expiresAt || null,
        maxUsage: attrs.maxUsage ? Number(attrs.maxUsage) : null,
        usedCount: Number(attrs.usedCount) || 0,
        isActive: attrs.isActive !== false,
        createdAt: attrs.createdAt || null,
        updatedAt: attrs.updatedAt || null,
    };
}
