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
        `/api/orders?populate[user][fields][0]=username&populate[user][fields][1]=email&populate[user][fields][2]=phoneNumber&populate[receiptImage]=true&sort=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=${pageSize}`;

    const data = await adminFetch(endpoint, jwt);
    if (!data) return { orders: [], meta: null, error: true };

    // نرمال‌سازی: سازگاری با Strapi v4 (attributes) و v5 (flat)
    const orders = (data.data || []).map((item) => {
        const attrs = item.attributes || item;
        const user = attrs.user?.data?.attributes || attrs.user || null;
        const receiptImage = attrs.receiptImage?.data?.attributes || attrs.receiptImage || null;
        return {
            id: item.id,
            /*
             * ⚠️ Strapi v5: برای عملیات PUT/PATCH باید از documentId استفاده شود.
             * numeric id فقط برای نمایش است. Strapi v5 روتهای REST را با documentId می‌شناسد.
             * اگر Strapi v4 باشد، documentId وجود ندارد و از id استفاده می‌شود.
             */
            documentId: item.documentId || String(item.id),
            orderNumber: attrs.orderNumber || `#${item.id}`,
            paymentMethod: attrs.paymentMethod || 'unknown',
            paymentStatus: attrs.paymentStatus || 'pending_payment',
            orderStatus: attrs.orderStatus || 'pending',
            totalPrice: attrs.totalPrice ?? attrs.totalAmount ?? 0,
            trackingNumber: attrs.trackingNumber || null,
            cardHolderName: attrs.cardHolderName || null,
            createdAt: attrs.createdAt,
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
        return { success: false, error: error.message || 'خطای شبکه' };
    }
}
