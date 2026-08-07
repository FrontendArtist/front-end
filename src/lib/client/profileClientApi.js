/**
 * Client-side API wrapper for Profile and Cart Hydration
 * این ماژول برای واکشی و آپدیت داده‌های پروفایل و سبد خرید سمت کاربر استفاده می‌شود
 */

export async function fetchProfileCartData() {
    const response = await fetch('/api/profile');
    if (!response.ok) {
        throw new Error('خطا در دریافت اطلاعات پروفایل');
    }
    return response.json();
}

export async function updateProfileCartData(cartDataPayload) {
    const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartData: cartDataPayload }),
    });
    
    if (!response.ok) {
        throw new Error('خطا در همگام‌سازی سبد خرید با سرور');
    }
    return response.json();
}
