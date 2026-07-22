/**
 * @file src/lib/adminApi.js
 * @description توابع API مخصوص پنل ادمین
 *
 * ⚠️ تفاوت با سایر Api فایل‌ها:
 *   - این فایل از JWT توکن ادمین (session.user.jwt) در هدر استفاده می‌کند.
 *   - فقط باید در Server Components داخل /app/admin/* استفاده شود.
 *   - هرگز این توابع را در Client Components صدا نزنید (توکن داخل مرورگر expose می‌شود).
 *
 * چرا apiClient را مستقیم استفاده نمی‌کنیم؟
 *   apiClient ماژول عمومی است و هدر Authorization را accept نمی‌کند به شکل typed.
 *   اینجا یک fetch جداگانه با هدر Authorization داریم تا کنترل کامل داشته باشیم.
 */

const STRAPI_API_URL =
    process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

/**
 * واکشی ایمن از Strapi با Authorization هدر ادمین.
 *
 * @param {string} endpoint  - مسیر Strapi (مثلاً '/api/orders?pagination[limit]=1')
 * @param {string} jwt       - توکن JWT ادمین از session.user.jwt
 * @returns {Promise<object|null>} - پاسخ JSON از Strapi یا null در صورت خطا
 */
async function adminFetch(endpoint, jwt) {
    try {
        const res = await fetch(`${STRAPI_API_URL}${endpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Bearer token: اعتبارسنجی ادمین در سمت Strapi
                Authorization: `Bearer ${jwt}`,
            },
            // هیچ‌وقت نتایج پنل ادمین را cache نکن
            cache: 'no-store',
        });

        if (!res.ok) {
            if (process.env.NODE_ENV === 'development') {
                console.warn(`[adminApi] Strapi returned ${res.status} for ${endpoint}`);
            }
            return null;
        }

        return await res.json();
    } catch (error) {
        // اگر سرور در دسترس نباشد یا خطای شبکه داشته باشیم:
        if (process.env.NODE_ENV === 'development') {
            console.warn(`[adminApi] Fetch failed for ${endpoint}:`, error.message);
        }
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 📦 تعداد کل محصولات
// از endpoint استاندارد Strapi با pagination[limit]=1 استفاده می‌کنیم
// تا فقط meta.pagination.total را دریافت کنیم، بدون دانلود کل داده‌ها.
// ─────────────────────────────────────────────────────────────────────────────
export async function getTotalProductsCount(jwt) {
    const data = await adminFetch('/api/products?pagination[limit]=1', jwt);
    // Strapi در meta.pagination.total تعداد کل رکوردها را برمی‌گرداند
    return data?.meta?.pagination?.total ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 👥 تعداد کل کاربران ثبت‌نام‌شده
// /api/users در Strapi Users & Permissions یک آرایه ساده برمی‌گرداند (بدون meta)
// بنابراین باید length آرایه را بخوانیم.
// ─────────────────────────────────────────────────────────────────────────────
export async function getTotalUsersCount(jwt) {
    const data = await adminFetch('/api/users?pagination[limit]=1&pagination[withCount]=true', jwt);
    // اگر Strapi با پیکربندی Users & Permissions کار می‌کند، total در meta است
    if (data?.meta?.pagination?.total !== undefined) {
        return data.meta.pagination.total;
    }
    // Fallback: اگر آرایه مستقیم برگشت
    if (Array.isArray(data)) {
        return data.length;
    }
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 🛒 آمار سفارش‌ها: تعداد کل و مجموع درآمد
// Strapi باید یک collection به نام 'orders' داشته باشد با فیلد 'totalPrice'.
// ─────────────────────────────────────────────────────────────────────────────
export async function getOrdersStats(jwt) {
    // pagination[limit]=1 فقط برای گرفتن meta.pagination.total
    const countData = await adminFetch('/api/orders?pagination[limit]=1', jwt);
    const totalOrders = countData?.meta?.pagination?.total ?? null;

    // برای محاسبه درآمد، باید همه سفارش‌ها را بگیریم (یا endpoint مجموع بسازیم)
    // اینجا limit=100 برای نمونه استفاده می‌کنیم
    // در پروداکشن بهتر است یک custom endpoint روی Strapi بسازید
    const revenueData = await adminFetch(
        '/api/orders?fields[0]=totalPrice&pagination[limit]=100',
        jwt
    );

    let totalRevenue = null;
    if (revenueData?.data && Array.isArray(revenueData.data)) {
        totalRevenue = revenueData.data.reduce((sum, order) => {
            // سازگاری با هر دو فرمت Strapi v4 (attributes) و v5 (flat)
            const price =
                order?.attributes?.totalPrice ?? order?.totalPrice ?? 0;
            return sum + Number(price);
        }, 0);
    }

    return { totalOrders, totalRevenue };
}

// ─────────────────────────────────────────────────────────────────────────────
// 📋 واکشی لیست سفارش‌ها برای صفحه مدیریت سفارش‌ها
// شامل اطلاعات کاربر (user) و تصویر رسید (receiptImage) می‌شود.
// از pagination استفاده می‌کنیم تا صفحات سنگین نشوند.
// ─────────────────────────────────────────────────────────────────────────────
export async function getOrders(jwt, { page = 1, pageSize = 20 } = {}) {
    const endpoint =
        `/api/orders?populate[user][fields][0]=username&populate[user][fields][1]=email&populate[user][fields][2]=phoneNumber&populate[receiptImage]=true&populate[items]=true&sort=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=${pageSize}`;

    const data = await adminFetch(endpoint, jwt);
    if (!data) return { orders: [], meta: null, error: true };

    // نرمال‌سازی: سازگاری با Strapi v4 (attributes) و v5 (flat)
    const orders = (data.data || []).map((item) => {
        const attrs = item.attributes || item;
        const user = attrs.user?.data?.attributes || attrs.user || null;
        const receiptImage = attrs.receiptImage?.data?.attributes || attrs.receiptImage || null;

        // نرمال‌سازی اقلام (Dynamic Zone)
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
            fullName: attrs.fullName || null,
            address: attrs.address || null,
            postalCode: attrs.postalCode || null,
            phone: attrs.phone || null,
            email: attrs.email || null,
            notes: attrs.notes || null,
            createdAt: attrs.createdAt,
            items,
            user: user ? {
                username: user.username || user.name || '—',
                email: user.email || '—',
                phoneNumber: user.phoneNumber || '—',
            } : null,
            receiptImageUrl: receiptImage?.url
                ? `${process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337'}${receiptImage.url}`
                : null,
        };
    });

    return { orders, meta: data.meta || null, error: false };
}


// ─────────────────────────────────────────────────────────────────────────────
// ✏️ آپدیت سفارش (paymentStatus, orderStatus, trackingCode)
// این تابع از Client Components صدا زده می‌شود از طریق API Route
// تا JWT در مرورگر expose نشود.
// ─────────────────────────────────────────────────────────────────────────────
export async function updateOrder(orderId, payload, jwt) {
    const STRAPI_API_URL =
        process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';
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

// ─────────────────────────────────────────────────────────────────────────────
// 👥 واکشی لیست کاربران (ساده)
// ─────────────────────────────────────────────────────────────────────────────
export async function getUsers(jwt, { page = 1, pageSize = 50 } = {}) {
    const endpoint = `/api/users?populate=role&sort=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=${pageSize}`;

    // The users-permissions plugin natively returns an array or object in v5 depending on configuration, 
    // but typically it returns an array for /api/users
    try {
        const res = await adminFetch(endpoint, jwt);
        if (!res) return { users: [], error: true };

        // Handle both possible structures from Strapi v5
        const isArray = Array.isArray(res);
        const usersList = isArray ? res : (res.data || []);

        const users = usersList.map((u) => {
            const attrs = u.attributes || u; // fallback for v4/v5 consistency
            return {
                id: u.id,
                documentId: u.documentId || String(u.id),
                username: attrs.username || attrs.name || '—',
                firstName: attrs.firstName || '',
                lastName: attrs.lastName || '',
                email: attrs.email || '—',
                phoneNumber: attrs.phoneNumber || '—',
                role: attrs.role?.name || attrs.role?.type || 'نامشخص',
                createdAt: attrs.createdAt
            };
        });

        return { users, meta: isArray ? null : res.meta, error: false };
    } catch (e) {
        console.error('[getUsers] error:', e);
        return { users: [], error: true };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 👤 واکشی جزئیات کامل کاربر (همراه با سفارشات، دوره‌ها و کامنت‌ها)
// ─────────────────────────────────────────────────────────────────────────────
export async function getUserDetails(userId, jwt) {
    // ── کوئری ۱: اطلاعات پایه + سفارشات + دوره‌ها (بدون کامنت‌ها) ──────────────
    // دلیل جدا کردن کامنت‌ها: وقتی Strapi چند رابطه Deep را در یک JOIN واکشی می‌کند
    // ضرب دکارتی (Cartesian Product) ایجاد می‌شود و رکوردها تکرار می‌گردند.
    const userEndpoint = `/api/users/${userId}?populate[orders][fields][0]=id&populate[orders][fields][1]=totalPrice&populate[orders][fields][2]=orderStatus&populate[orders][fields][3]=paymentStatus&populate[orders][fields][4]=createdAt&populate[courses][fields][0]=id&populate[courses][fields][1]=title&populate[courses][fields][2]=price`;

    // ── کوئری ۲: کامنت‌های کاربر — جداگانه با populate کامل روابط ───────────────
    const commentsEndpoint = `/api/comments?filters[user][id][$eq]=${userId}&populate[article][fields][0]=title&populate[article][fields][1]=slug&populate[course][fields][0]=title&populate[course][fields][1]=slug&populate[product][fields][0]=title&populate[product][fields][1]=slug&populate[user][fields][0]=username&sort=createdAt:desc&pagination[limit]=100`;

    try {
        const [userRes, commentsRes] = await Promise.all([
            adminFetch(userEndpoint, jwt),
            adminFetch(commentsEndpoint, jwt),
        ]);

        if (!userRes) return { user: null, error: true };

        const attrs = userRes.data ? (userRes.data.attributes || userRes.data) : (userRes.attributes || userRes);
        const dataWrap = userRes.data || userRes;

        // ── نرمال‌سازی کامنت‌ها ────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// 📦 محصولات – لیست کامل برای پنل ادمین
// publicationState=preview تا پیش‌نویس‌ها هم دیده شوند
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdminProducts(jwt, { page = 1, pageSize = 100 } = {}) {
    const endpoint =
        `/api/products?populate[images][fields][0]=url&populate[images][fields][1]=name&populate[images][fields][2]=id&populate[images][fields][3]=documentId&populate[categories][fields][0]=name&populate[categories][fields][1]=documentId&populate[tags][fields][0]=name&populate[tags][fields][1]=documentId&sort=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=${pageSize}&publicationState=preview`;

    const data = await adminFetch(endpoint, jwt);
    if (!data) return { products: [], meta: null, error: true };

    const products = (data.data || []).map((item) => {
        const attrs = item.attributes || item;

        // نرمال‌سازی تصاویر (Strapi v4 و v5)
        const rawImages = attrs.images?.data || attrs.images || [];
        const images = rawImages.map((img) => {
            const imgAttrs = img.attributes || img;
            return {
                id: img.id,
                documentId: img.documentId || String(img.id),
                url: imgAttrs.url,
                name: imgAttrs.name,
            };
        });

        // نرمال‌سازی دسته‌بندی‌ها
        const rawCats = attrs.categories?.data || attrs.categories || [];
        const categories = rawCats.map((c) => {
            const cAttrs = c.attributes || c;
            return {
                id: c.id,
                documentId: c.documentId || String(c.id),
                name: cAttrs.name,
            };
        });

        // نرمال‌سازی تگ‌ها
        const rawTags = attrs.tags?.data || attrs.tags || [];
        const tags = rawTags.map((t) => {
            const tAttrs = t.attributes || t;
            return {
                id: t.id,
                documentId: t.documentId || String(t.id),
                name: tAttrs.name,
            };
        });

        return {
            id: item.id,
            documentId: item.documentId || String(item.id),
            title: attrs.title,
            slug: attrs.slug,
            price: attrs.price ?? null,
            stock: attrs.stock ?? null,
            isAvailable: attrs.isAvailable ?? false,
            publishedAt: attrs.publishedAt || null,
            images,
            categories,
            tags,
        };
    });

    return { products, meta: data.meta || null, error: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// 📦 واکشی یک محصول با documentId (برای صفحه ویرایش)
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdminProductById(documentId, jwt) {
    const endpoint =
        `/api/products/${documentId}?populate[images]=true&populate[categories]=true&populate[tags]=true&publicationState=preview`;

    const data = await adminFetch(endpoint, jwt);
    if (!data) return { product: null, error: true };

    const item = data.data || data;
    const attrs = item.attributes || item;

    const rawImages = attrs.images?.data || attrs.images || [];
    const images = rawImages.map((img) => {
        const imgAttrs = img.attributes || img;
        return {
            id: img.id,
            documentId: img.documentId || String(img.id),
            url: imgAttrs.url,
            name: imgAttrs.name,
        };
    });

    const rawCats = attrs.categories?.data || attrs.categories || [];
    const categories = rawCats.map((c) => {
        const cAttrs = c.attributes || c;
        return { id: c.id, documentId: c.documentId || String(c.id), name: cAttrs.name };
    });

    const rawTags = attrs.tags?.data || attrs.tags || [];
    const tags = rawTags.map((t) => {
        const tAttrs = t.attributes || t;
        return { id: t.id, documentId: t.documentId || String(t.id), name: tAttrs.name };
    });

    const product = {
        id: item.id,
        documentId: item.documentId || String(item.id),
        title: attrs.title,
        slug: attrs.slug,
        price: attrs.price ?? null,
        stock: attrs.stock ?? null,
        isAvailable: attrs.isAvailable ?? false,
        description: attrs.description,
        publishedAt: attrs.publishedAt || null,
        images,
        categories,
        tags,
    };

    return { product, error: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// 🏷️ واکشی همه دسته‌بندی‌ها برای فرم محصول
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdminCategories(jwt) {
    const data = await adminFetch('/api/categories?fields[0]=name&fields[1]=slug&fields[2]=documentId&pagination[limit]=200', jwt);
    if (!data) return [];
    return (data.data || []).map((c) => {
        const attrs = c.attributes || c;
        return { id: c.id, documentId: c.documentId || String(c.id), name: attrs.name };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// 🏷️ واکشی همه تگ‌ها برای فرم محصول
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdminTags(jwt) {
    const data = await adminFetch('/api/tags?fields[0]=name&fields[1]=documentId&pagination[limit]=200', jwt);
    if (!data) return [];
    return (data.data || []).map((t) => {
        const attrs = t.attributes || t;
        return { id: t.id, documentId: t.documentId || String(t.id), name: attrs.name };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// 📄 واکشی لیست مقالات
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdminArticles(jwt, { page = 1, pageSize = 100 } = {}) {
    // Using simple populate to prevent 400 errors from strict field matching
    const endpoint =
        `/api/articles?populate[cover]=true&populate[articles_categories]=true&populate[tags]=true&sort=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=${pageSize}&publicationState=preview`;

    const data = await adminFetch(endpoint, jwt);
    if (!data) return { articles: [], meta: null, error: true };

    const articles = (data.data || []).map((item) => {
        const attrs = item.attributes || item;

        const coverData = attrs.cover?.data || attrs.cover;
        const cover = coverData ? {
            id: coverData.id,
            documentId: coverData.documentId || String(coverData.id),
            url: coverData.attributes?.url || coverData.url,
            name: coverData.attributes?.name || coverData.name,
        } : null;

        const rawCats = attrs.articles_categories?.data || attrs.articles_categories || [];
        const categories = rawCats.map((c) => {
            const cAttrs = c.attributes || c;
            return {
                id: c.id,
                documentId: c.documentId || String(c.id),
                name: cAttrs.name || cAttrs.title,
            };
        });

        const rawTags = attrs.tags?.data || attrs.tags || [];
        const tags = rawTags.map((t) => {
            const tAttrs = t.attributes || t;
            return {
                id: t.id,
                documentId: t.documentId || String(t.id),
                name: tAttrs.name || tAttrs.title,
            };
        });

        return {
            id: item.id,
            documentId: item.documentId || String(item.id),
            title: attrs.title,
            slug: attrs.slug,
            excerpt: attrs.excerpt || '',
            publishedAt: attrs.publishedAt || null,
            cover,
            categories,
            tags,
        };
    });

    return { articles, meta: data.meta || null, error: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// 📄 واکشی یک مقاله با documentId
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdminArticleById(documentId, jwt) {
    const endpoint =
        `/api/articles/${documentId}?populate[cover]=true&populate[articles_categories]=true&populate[tags]=true&publicationState=preview`;

    const data = await adminFetch(endpoint, jwt);
    if (!data) return { article: null, error: true };

    const item = data.data || data;
    const attrs = item.attributes || item;

    const coverData = attrs.cover?.data || attrs.cover;
    const cover = coverData ? {
        id: coverData.id,
        documentId: coverData.documentId || String(coverData.id),
        url: coverData.attributes?.url || coverData.url,
        name: coverData.attributes?.name || coverData.name,
    } : null;

    const rawCats = attrs.articles_categories?.data || attrs.articles_categories || [];
    const categories = rawCats.map((c) => {
        const cAttrs = c.attributes || c;
        return { id: c.id, documentId: c.documentId || String(c.id), title: cAttrs.title || cAttrs.name || '' };
    });

    const rawTags = attrs.tags?.data || attrs.tags || [];
    const tags = rawTags.map((t) => {
        const tAttrs = t.attributes || t;
        return { id: t.id, documentId: t.documentId || String(t.id), name: tAttrs.name || tAttrs.title || '' };
    });

    const article = {
        id: item.id,
        documentId: item.documentId || String(item.id),
        title: attrs.title,
        slug: attrs.slug,
        excerpt: attrs.excerpt || '',
        content: attrs.content || '',
        publishedAt: attrs.publishedAt || null,
        cover,
        articles_categories: categories, // Expected array of category objects by form component
        tags,
    };

    return { article, error: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// 🏷️ واکشی دسته‌بندی مقالات
// ─────────────────────────────────────────────────────────────────────────────
export async function getAdminArticlesCategories(jwt) {
    const data = await adminFetch('/api/articles-categories?pagination[limit]=200', jwt);
    if (!data) return [];
    return (data.data || []).map((c) => {
        const attrs = c.attributes || c;
        return { id: c.id, documentId: c.documentId || String(c.id), title: attrs.title || attrs.name };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// 📬 واکشی لیست پیام‌های تماس برای پنل ادمین
// ─────────────────────────────────────────────────────────────────────────────
export async function getContactMessages(jwt, { page = 1, pageSize = 50 } = {}) {
    const endpoint = `/api/contact-messages?sort=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=${pageSize}&publicationState=preview`;
    try {
        const data = await adminFetch(endpoint, jwt);
        if (!data) return { messages: [], meta: null, error: true };

        const messages = (data.data || []).map((item) => {
            const attrs = item.attributes || item;
            return {
                id: item.id,
                documentId: item.documentId || String(item.id),
                name: attrs.name || '—',
                contactInfo: attrs.contactInfo || '—',
                subject: attrs.subject || 'بدون موضوع',
                body: attrs.body || '',
                isRead: attrs.isRead ?? false,
                status: attrs.status || 'open',
                replies: attrs.replies || [],
                createdAt: attrs.createdAt
            };
        });

        return { messages, meta: data.meta || null, error: false };
    } catch (e) {
        console.error('[getContactMessages] error:', e);
        return { messages: [], meta: null, error: true };
    }
}

