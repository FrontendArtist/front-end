/**
 * @file src/utils/enumMappers.js
 * @description نگاشت و ترجمه انواع اینام‌ها، نقش‌ها و وضعیت‌ها به زبان فارسی
 */

export const ROLE_MAP = {
    authenticated: 'کاربر عادی',
    Authenticated: 'کاربر عادی',
    administrator: 'مدیر کل',
    Administrator: 'مدیر کل',
    admin: 'مدیر کل',
    Admin: 'مدیر کل',
    financial_manager: 'مدیر مالی',
    'Financial Manager': 'مدیر مالی',
    public: 'کاربر مهمان',
    Public: 'کاربر مهمان',
};

export const STATUS_MAP = {
    // هدیه نور و تراکنش‌های بانکی
    granted: 'اعطا شد',
    Granted: 'اعطا شد',
    success: 'موفق',
    Success: 'موفق',
    completed: 'تکمیل شده',
    Completed: 'تکمیل شده',
    pending: 'در انتظار',
    Pending: 'در انتظار',
    processing: 'در حال پردازش',
    Processing: 'در حال پردازش',
    failed: 'ناموفق',
    Failed: 'ناموفق',
    error: 'خطا',
    Error: 'خطا',
    cancelled: 'لغو شده',
    Cancelled: 'لغو شده',
    canceled: 'لغو شده',
    approved: 'تأیید شده',
    Approved: 'تأیید شده',
    rejected: 'رد شده',
    Rejected: 'رد شده',
    paid: 'پرداخت شده',
    delivered: 'تحویل شده',
    available: 'موجود',
    unavailable: 'ناموجود',
    published: 'منتشر شده',
    draft: 'پیش‌نویس',
};

/**
 * دریافت برچسب فارسی نقش کاربری
 * @param {string|object} role
 * @returns {string}
 */
export function getRoleLabel(role) {
    if (!role) return 'نامشخص';
    const key = typeof role === 'string' ? role.trim() : (role.name || role.type || '').trim();
    return ROLE_MAP[key] || key || 'نامشخص';
}

/**
 * دریافت برچسب فارسی وضعیت
 * @param {string} status
 * @returns {string}
 */
export function getStatusLabel(status) {
    if (!status) return '—';
    const key = String(status).trim();
    return STATUS_MAP[key] || key;
}

