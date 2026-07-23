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
    const headers = { Authorization: `Bearer ${token}` };
    
    // دریافت همزمان پیام‌های تماس با ما (/api/contact-messages) و پیام‌های مشاوره استاد (/api/messages)
    const [contactRes, mentorRes] = await Promise.allSettled([
        apiClient('/api/contact-messages?populate=user&sort=createdAt:desc', { headers, cache: 'no-store' }),
        apiClient('/api/messages?populate=user&sort=createdAt:desc', { headers, cache: 'no-store' }),
    ]);

    const contactMsgs = contactRes.status === 'fulfilled' ? (contactRes.value?.data || []) : [];
    const mentorMsgs = mentorRes.status === 'fulfilled' ? (mentorRes.value?.data || []) : [];

    // ادغام هر دو نوع پیام و مرتب‌سازی بر اساس تاریخ (جدیدترین اول)
    const combined = [...contactMsgs, ...mentorMsgs].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    return { data: combined };
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

// ─────────────────────────────────────────────────────────────────────────────
// Instructor Chat API — توابع اختصاصی چت استاد
// ─────────────────────────────────────────────────────────────────────────────

/**
 * دریافت تمام پیام‌های از نوع 'instructor' برای داشبورد استاد
 * این تابع فقط توسط کامپوننت‌های مسیر /mentor فراخوانی می‌شود.
 * @param {string} token - JWT token ادمین (از session.user.jwt)
 * @returns {Promise<object>} - { data: Message[], meta: {...} }
 */
export async function getInstructorMessages(token) {
    // ⚠️ از `messageType` به جای `type` استفاده می‌کنیم چون `type` کلمه رزرو شده JSON:API است
    // و Strapi آن را در body با خطای 400 "Invalid key type" رد می‌کند.
    return apiClient(
        '/api/messages?filters[messageType][$eq]=instructor&populate=*&sort=createdAt:desc',
        {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        }
    );
}

/**
 * ارسال پیام جدید با نوع 'instructor' از طرف کاربر
 * دیتای فرم پیش‌نیاز (سن، تاهل، شغل، سابقه معنوی) در فیلد metaData به صورت JSON ذخیره می‌شود.
 * @param {{ subject: string, body: string, age: string, maritalStatus: string, job: string, spiritualBackground: string }} formData
 * @param {string} token - JWT token کاربر لاگین‌شده
 * @returns {Promise<object>} - پیام ایجادشده
 */
export async function submitInstructorMessage(formData, token) {
    // متادیتای فرم پیش‌نیاز را به صورت JSON stringify می‌کنیم
    const metaData = JSON.stringify({
        age: formData.age,
        maritalStatus: formData.maritalStatus,
        job: formData.job,
        spiritualBackground: formData.spiritualBackground,
    });

    return apiClient('/api/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            data: {
                subject: formData.subject?.trim() || 'درخواست مشاوره با استاد',
                body: formData.body?.trim(),
                // ⚠️ `messageType` به جای `type` — چون `type` در JSON:API رزرو است و
                // Strapi آن را با خطای 400 "Invalid key type" رد می‌کند.
                // در schema Strapi فیلد Enumeration با نام `messageType` تعریف شده باشد.
                messageType: 'instructor',
                metaData, // اطلاعات فرم پیش‌نیاز به صورت JSON string
            },
        }),
    });
}

/**
 * بروزرسانی پیام چت استاد (ارسال پاسخ یا تغییر وضعیت)
 * @param {number|string} id - documentId پیام
 * @param {string} token - JWT token کاربر یا استاد
 * @param {object} payload - داده‌های بروزرسانی (مثلا status یا replies)
 */
export async function updateInstructorMessage(id, token, payload) {
    return apiClient(`/api/messages/${id}`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data: payload }),
    });
}
