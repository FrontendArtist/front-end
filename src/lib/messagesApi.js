/**
 * Messages API - لایه API برای پیام‌های کاربری (تیکتینگ)
 * @module lib/messagesApi
 */

import { apiClient } from './apiClient';

/**
 * دریافت لیست پیام‌های کاربر لاگین‌شده
 * کنترلر override شده فقط پیام‌های همین کاربر را برمی‌گرداند
 * @param {string} token - JWT token از session
 */
export async function getMyMessages(token) {
    return apiClient('/api/contact-messages?populate=user&sort=createdAt:desc', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
    });
}

/**
 * دریافت جزئیات یک پیام خاص
 * @param {number|string} id
 * @param {string} token
 */
export async function getMyMessageById(id, token) {
    return apiClient(`/api/contact-messages/${id}?populate=user`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
    });
}

/**
 * ارسال پیام جدید (فرم تماس) - نسخه ارتقاء‌یافته با لینک به کاربر
 * @param {object} formData
 * @param {string|null} token - JWT token (اگر کاربر لاگین باشد)
 */
export async function submitMessage(formData, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    return apiClient('/api/contact-messages', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            data: {
                name: formData.name?.trim(),
                contactInfo: formData.contactInfo?.trim(),
                subject: formData.subject?.trim() || '',
                body: formData.body?.trim(),
            },
        }),
    });
}

/**
 * بروزرسانی پیام توسط کاربر خودمان (ارسال پاسخ یا تغییر وضعیت)
 * @param {number|string} id - documentId پیام
 * @param {string} token - JWT token کاربر
 * @param {object} payload - داده‌های بروزرسانی (مثلا status یا replies)
 */
export async function updateMyMessage(id, token, payload) {
    return apiClient(`/api/contact-messages/${id}`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data: payload }),
    });
}
