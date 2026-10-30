/**
 * Client-side API wrapper for Notifications
 * واکشی و بروزرسانی وضعیت خوانده‌شدن اعلان‌ها در دیتابیس
 */

export async function fetchClientNotifications() {
    const response = await fetch('/api/notifications', {
        cache: 'no-store',
    });

    if (!response.ok) {
        let errorMessage = 'خطا در دریافت لیست اعلان‌ها';
        try {
            const errBody = await response.json();
            errorMessage = errBody.message || errorMessage;
        } catch {
            // نادیده گرفتن خطای پارس
        }
        throw new Error(errorMessage);
    }

    return response.json();
}

export async function updateClientNotifications(payload) {
    const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        let errorMessage = 'خطا در بروزرسانی وضعیت اعلان';
        try {
            const errBody = await response.json();
            errorMessage = errBody.message || errorMessage;
        } catch {
            // نادیده گرفتن خطای پارس
        }
        throw new Error(errorMessage);
    }

    return response.json();
}

