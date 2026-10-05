/**
 * @file src/config/adminPermissions.js
 * @description پیکربندی متمرکز مجوزهای پنل مدیریت مطابق با ماتریس رسمی دسترسی ByeMoney
 * 
 * ⚠️ بر اساس سند Permissions-Matrix.md در ByeMoney:
 * کدهای پرمیژن بدون تغییر و انعکاس‌یافته از پایگاه داده هستند:
 *   - Noor.Inject
 *   - TopUp.Review
 *   - Courses.Manage
 *   - Wallet.View
 */

export const ADMIN_PERMISSIONS = {
    NOOR_INJECT: 'Noor.Inject',
    TOPUP_REVIEW: 'TopUp.Review',
    COURSES_MANAGE: 'Courses.Manage',
    WALLET_VIEW: 'Wallet.View',
};

/**
 * نگاشت مسیرهای صفحات ادمین به مجوزهای مورد نیاز ByeMoney.
 * اگر مقدار null باشد، یعنی صرف داشتن نقش ادمین و احراز هویت اولیه برای ورود به صفحه کافی است
 * و اکشن‌های حساس درون آن صفحه با کامپوننت <Can> کنترل می‌شوند.
 */
export const ROUTE_PERMISSIONS = {
    '/admin': null,
    '/admin/orders': null,
    '/admin/orders/new': [ADMIN_PERMISSIONS.COURSES_MANAGE],
    '/admin/users': null,
    '/admin/courses': null,
    '/admin/products': null,
    '/admin/articles': null,
    '/admin/contact-messages': null,
    '/admin/comments': null,
    '/admin/coupons': null,
    '/admin/top-banner': null,
};

/**
 * دریافت مجوزهای الزامی یک مسیر
 * @param {string} pathname
 * @returns {string[] | null}
 */
export function getRequiredPermissionsForRoute(pathname) {
    if (!pathname) return null;

    // تطابق دقیق اول
    if (Object.prototype.hasOwnProperty.call(ROUTE_PERMISSIONS, pathname)) {
        return ROUTE_PERMISSIONS[pathname];
    }

    // بررسی زیرمسیرها (به عنوان مثال /admin/orders/new پیش از /admin/orders تطابق یابد)
    // مرتب‌سازی کلیدها بر اساس طول مسیر نزولی برای تطابق دقیق‌ترین پیشوند
    const sortedRoutes = Object.keys(ROUTE_PERMISSIONS).sort((a, b) => b.length - a.length);
    for (const route of sortedRoutes) {
        if (pathname.startsWith(route) && route !== '/admin') {
            return ROUTE_PERMISSIONS[route];
        }
    }

    return ROUTE_PERMISSIONS['/admin'] || null;
}
