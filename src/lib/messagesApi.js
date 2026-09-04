/**
 * Messages API - لایه API برای پیام‌های کاربری (تیکتینگ)
 * @module lib/messagesApi
 */

import { apiClient } from './apiClient';
import { withErrorHandling } from './apiErrorHandler';

/**
 * دریافت لیست پیام‌های کاربر لاگین‌شده
 * کنترلر override شده فقط پیام‌های همین کاربر را برمی‌گرداند
 * @param {string} token - JWT token از session
 */
export async function getMyMessages(token) {
    return withErrorHandling(
        async () => {
            const headers = { Authorization: `Bearer ${token}` };
            
            const [contactRes, mentorRes] = await Promise.allSettled([
                apiClient('/api/contact-messages?populate=user&sort=createdAt:desc', { headers, cache: 'no-store' }),
                apiClient('/api/messages?populate=user&sort=createdAt:desc', { headers, cache: 'no-store' }),
            ]);

            const contactMsgs = contactRes.status === 'fulfilled' ? (contactRes.value?.data || []) : [];
            const mentorMsgs = mentorRes.status === 'fulfilled' ? (mentorRes.value?.data || []) : [];

            const combined = [...contactMsgs, ...mentorMsgs].sort((a, b) => 
                new Date(b.createdAt) - new Date(a.createdAt)
            );

            return { data: combined };
        },
        'دریافت لیست پیام‌های کاربر',
        { data: [] }
    );
}

/**
 * دریافت جزئیات یک پیام خاص
 * @param {number|string} id
 * @param {string} token
 */
export async function getMyMessageById(id, token) {
    return withErrorHandling(
        async () => {
            return apiClient(`/api/contact-messages/${id}?populate=user`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: 'no-store',
            });
        },
        `دریافت جزئیات پیام ${id}`,
        null
    );
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
 * دریافت تنظیمات فرم پیش‌نیاز استاد
 * در صورت عدم تعریف یا 404 در استرپی، مقدار پیش‌فرض بدون خطای کنسول برمی‌گردد
 * @param {string|null} [token] - JWT token اختیاری کاربر
 * @returns {Promise<object>} - { data: { title, description, questions: [...] } }
 */
export async function getMentorFormSetting(token = null) {
    try {
        const headers = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        return await apiClient('/api/mentor-form-setting?populate=questions', {
            headers,
            cache: 'no-store',
            suppressErrorLog: true,
        });
    } catch {
        return { data: { title: '', description: '', questions: [] } };
    }
}

/**
 * ذخیره / بروزرسانی تنظیمات فرم پیش‌نیاز استاد
 * @param {{ title?: string, description?: string, questions: object[] }} payload
 * @param {string} token - JWT token ادمین
 */
export async function updateMentorFormSetting(payload, token) {
    return apiClient('/api/mentor-form-setting', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data: payload }),
    });
}

/**
 * دریافت پیام‌های ارتباط با استاد کاربر لاگین‌شده
 * جهت بررسی اینکه آیا قبلاً پیامی به استاد ارسال کرده یا خیر
 * @param {string} token - JWT token کاربر
 * @returns {Promise<object>} - { data: Message[] }
 */
export async function getMyMentorMessages(token) {
    try {
        return await apiClient('/api/messages?populate=user&sort=createdAt:desc', {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
            suppressErrorLog: true,
        });
    } catch {
        return { data: [] };
    }
}

/**
 * دریافت تمام پیام‌های از نوع 'instructor' برای داشبورد استاد
 * این تابع فقط توسط کامپوننت‌های مسیر /mentor فراخوانی می‌شود.
 * @param {string} token - JWT token ادمین (از session.user.jwt)
 * @returns {Promise<object>} - { data: Message[], meta: {...} }
 */
export async function getInstructorMessages(token) {
    return withErrorHandling(
        async () => {
            return apiClient(
                '/api/messages?filters[messageType][$eq]=instructor&populate=*&sort=createdAt:desc',
                {
                    headers: { Authorization: `Bearer ${token}` },
                    cache: 'no-store',
                }
            );
        },
        'دریافت پیام‌های داشبورد استاد',
        { data: [], meta: {} }
    );
}

/**
 * ارسال پیام جدید با نوع 'instructor' از طرف کاربر
 * دیتای فرم پیش‌نیاز در فیلد metaData به صورت JSON ذخیره می‌شود.
 * @param {{ subject?: string, body: string, metaData?: object|string }} formData
 * @param {string} token - JWT token کاربر لاگین‌شده
 * @returns {Promise<object>} - پیام ایجادشده
 */
export async function submitInstructorMessage(formData, token) {
    const metaData = typeof formData.metaData === 'object'
        ? JSON.stringify(formData.metaData)
        : (formData.metaData ?? JSON.stringify({
            age: formData.age,
            maritalStatus: formData.maritalStatus,
            job: formData.job,
            spiritualBackground: formData.spiritualBackground,
        }));

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

/**
 * حذف پیام یا مکالمه چت استاد
 * @param {number|string} id - documentId پیام
 * @param {string} token - JWT token استاد
 */
export async function deleteInstructorMessage(id, token) {
    return apiClient(`/api/messages/${id}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}
