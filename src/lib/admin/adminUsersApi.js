import { adminFetch } from './adminFetch';

export async function getTotalUsersCount(jwt) {
    try {
        const countData = await adminFetch('/api/users/count', jwt);
        if (typeof countData === 'number') return countData;
        if (countData?.count !== undefined) return countData.count;
    } catch (_) {}

    try {
        const data = await adminFetch('/api/users?pagination[limit]=1&pagination[withCount]=true', jwt);
        if (data?.meta?.pagination?.total !== undefined) {
            return data.meta.pagination.total;
        }
        if (Array.isArray(data)) {
            return data.length;
        }
    } catch (_) {}
    return null;
}

export async function getUsers(jwt, { page, pageSize, start, limit = 20 } = {}) {
    const currentLimit = (pageSize || limit || 50);
    let currentStart = 0;
    if (start !== undefined && start !== null) {
        currentStart = Number(start) || 0;
    } else if (page !== undefined && page !== null) {
        const p = Number(page) || 1;
        const ps = Number(pageSize) || 50;
        currentStart = (p - 1) * ps;
    }

    const paginationQuery = `_start=${currentStart}&_limit=${currentLimit}&start=${currentStart}&limit=${currentLimit}&pagination[start]=${currentStart}&pagination[limit]=${currentLimit}`;
    const endpoint = `/api/users?populate=role&sort=createdAt:desc&${paginationQuery}`;

    try {
        const [res, totalCount] = await Promise.all([
            adminFetch(endpoint, jwt),
            getTotalUsersCount(jwt).catch(() => null),
        ]);
        if (!res) return { users: [], meta: null, error: true };

        const isArray = Array.isArray(res);
        const usersList = isArray ? res : (res.data || []);

        // اگر استراپی تمام کاربران را یکجا فرستاد و پارامتر لیمیت را اعمال نکرد، بر اساس start و limit برش می‌زنیم
        let slicedList = usersList;
        if (usersList.length > currentLimit) {
            slicedList = usersList.slice(currentStart, currentStart + currentLimit);
        }

        const users = slicedList.map((u) => {
            const attrs = u.attributes || u;
            return {
                id: u.id,
                documentId: u.documentId || String(u.id),
                username: attrs.username || attrs.name || '—',
                firstName: attrs.firstName || '',
                lastName: attrs.lastName || '',
                email: attrs.email || '—',
                phoneNumber: attrs.phoneNumber || '—',
                role: attrs.role?.name || attrs.role?.type || 'نامشخص',
                light: attrs.light ?? 0,
                createdAt: attrs.createdAt
            };
        });

        const total = totalCount ?? (res.meta?.pagination?.total ?? usersList.length);

        const meta = {
            pagination: {
                total,
                start: currentStart,
                limit: currentLimit,
                page: page || 1,
                pageSize: currentLimit,
            }
        };

        return { users, meta, error: false };
    } catch (e) {
        console.error('[getUsers] error:', e);
        return { users: [], meta: null, error: true };
    }
}

export async function getUserDetails(userId, jwt) {
    const userEndpoint = `/api/users/${userId}?populate[orders][fields][0]=id&populate[orders][fields][1]=totalPrice&populate[orders][fields][2]=orderStatus&populate[orders][fields][3]=paymentStatus&populate[orders][fields][4]=createdAt&populate[courses][fields][0]=id&populate[courses][fields][1]=title&populate[courses][fields][2]=price`;
    const commentsEndpoint = `/api/comments?filters[user][id][$eq]=${userId}&populate[article][fields][0]=title&populate[article][fields][1]=slug&populate[course][fields][0]=title&populate[course][fields][1]=slug&populate[product][fields][0]=title&populate[product][fields][1]=slug&populate[user][fields][0]=username&sort=createdAt:desc&pagination[limit]=100`;

    try {
        const [userRes, commentsRes] = await Promise.all([
            adminFetch(userEndpoint, jwt),
            adminFetch(commentsEndpoint, jwt),
        ]);

        if (!userRes) return { user: null, error: true };

        const attrs = userRes.data ? (userRes.data.attributes || userRes.data) : (userRes.attributes || userRes);
        const dataWrap = userRes.data || userRes;

        const rawComments = commentsRes?.data || [];

        const comments = rawComments.map(c => {
            const cAttrs = c.attributes || c;

            const rawArticle = cAttrs.article?.data || cAttrs.article;
            const articleAttrs = rawArticle?.attributes || rawArticle;
            const article = rawArticle
                ? { id: rawArticle.id, documentId: rawArticle.documentId, slug: articleAttrs?.slug, title: articleAttrs?.title }
                : null;

            const rawCourse = cAttrs.course?.data || cAttrs.course;
            const courseAttrs = rawCourse?.attributes || rawCourse;
            const course = rawCourse
                ? { id: rawCourse.id, documentId: rawCourse.documentId, slug: courseAttrs?.slug, title: courseAttrs?.title }
                : null;

            const rawProduct = cAttrs.product?.data || cAttrs.product;
            const productAttrs = rawProduct?.attributes || rawProduct;
            const product = rawProduct
                ? { id: rawProduct.id, documentId: rawProduct.documentId, slug: productAttrs?.slug, title: productAttrs?.title }
                : null;

            let relatedTo = null;
            if (article) relatedTo = { type: 'مقاله', title: article.title };
            if (course) relatedTo = { type: 'دوره', title: course.title };
            if (product) relatedTo = { type: 'محصول', title: product.title };

            return {
                id: c.id,
                documentId: c.documentId || String(c.id),
                content: cAttrs.content,
                isApproved: cAttrs.isApproved || false,
                createdAt: cAttrs.createdAt,
                relatedTo,
                article,
                course,
                product
            };
        });

        const user = {
            id: dataWrap.id,
            documentId: dataWrap.documentId || String(dataWrap.id),
            username: attrs.username || '—',
            email: attrs.email || '—',
            phoneNumber: attrs.phoneNumber || '—',
            createdAt: attrs.createdAt,
            orders: (attrs.orders?.data || attrs.orders || []).map(o => ({
                id: o.id,
                documentId: o.documentId,
                totalPrice: o.totalPrice ?? o.attributes?.totalPrice ?? 0,
                orderStatus: o.orderStatus || o.attributes?.orderStatus || 'pending',
                paymentStatus: o.paymentStatus || o.attributes?.paymentStatus || 'pending_payment',
                createdAt: o.createdAt || o.attributes?.createdAt,
                items: o.items || o.attributes?.items || []
            })),
            courses: (attrs.courses?.data || attrs.courses || []).map(c => ({
                id: c.id,
                documentId: c.documentId,
                title: c.title || c.attributes?.title || '—',
                price: c.price || c.attributes?.price || 0,
            })),
            comments,
        };

        return { user, error: false };
    } catch (e) {
        console.error('[getUserDetails] error:', e);
        return { user: null, error: true };
    }
}
