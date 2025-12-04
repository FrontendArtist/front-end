/**
 * Contact API - لایه API اختصاصی برای فرم تماس
 * 
 * نقش:
 * این ماژول رابط تمیز برای ارسال پیام‌های تماس به Strapi فراهم می‌کند.
 * این لایه بین UI (ContactForm) و apiClient قرار دارد.
 * 
 * @module lib/contactApi
 */

import { apiClient } from './apiClient';

/**
 * ارسال پیام تماس به Strapi
 * 
 * جریان داده:
 * 1. کاربر فرم را در ContactForm پر می‌کند
 * 2. فرم این تابع را با داده‌های فرم صدا می‌زند
 * 3. این تابع داده را به فرمت Strapi تبدیل می‌کند
 * 4. از apiClient برای POST به Strapi استفاده می‌کند
 * 5. نتیجه را به فرم برمی‌گرداند
 * 
 * @param {object} formData - داده‌های فرم
 * @param {string} formData.name - نام فرستنده (اجباری)
 * @param {string} formData.contactInfo - ایمیل یا تلفن (اجباری)
 * @param {string} formData.subject - موضوع پیام (اختیاری)
 * @param {string} formData.body - متن پیام (اجباری، حداقل 20 کاراکتر)
 * @returns {Promise<object>} پاسخ از Strapi
 * @throws {Error} در صورت شکست درخواست
 * 
 * @example
 * try {
 *   const result = await submitContactMessage({
 *     name: "علی رضایی",
 *     contactInfo: "ali@example.com",
 *     subject: "سوال درباره خدمات",
 *     body: "سلام، می‌خواستم در مورد خدمات شما بیشتر بدانم..."
 *   });
 *   console.log('پیام با موفقیت ارسال شد:', result);
 * } catch (error) {
 *   console.error('خطا در ارسال پیام:', error.message);
 * }
 */
export async function submitContactMessage(formData) {
    try {
        // اعتبارسنجی پایه در سمت کلاینت
        if (!formData.name || !formData.contactInfo || !formData.body) {
            throw new Error('فیلدهای اجباری باید پر شوند');
        }

        if (formData.body.length < 20) {
            throw new Error('متن پیام باید حداقل 20 کاراکتر باشد');
        }

        // تبدیل داده به فرمت Strapi
        // Strapi انتظار دارد: { data: { field1: value1, ... } }
        const payload = {
            data: {
                name: formData.name.trim(),
                contactInfo: formData.contactInfo.trim(),
                subject: formData.subject?.trim() || '',
                body: formData.body.trim(),
            }
        };

        // ارسال درخواست POST به endpoint پیام‌های تماس
        // نام صحیح endpoint: /api/contact-messages (جمع contact-message)
        const response = await apiClient('/api/contact-messages', {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        // برگرداندن پاسخ موفق
        // Strapi داده ایجاد شده را در { data: {...}, meta: {...} } برمی‌گرداند
        return response;

    } catch (error) {
        // ثبت خطا برای دیباگ
        console.error('خطای ارسال پیام تماس:', error.message);

        // پرتاب مجدد خطا برای مدیریت در کامپوننت
        throw error;
    }
}

/**
 * مزایای این معماری:
 * 
 * 1. جداسازی منطق کسب‌وکار از UI
 *    - کامپوننت فقط مدیریت state و رندر را انجام می‌دهد
 *    - این لایه منطق ارتباط با API را مدیریت می‌کند
 * 
 * 2. قابلیت تست
 *    - می‌توان این ماژول را در تست‌ها Mock کرد
 *    - می‌توان منطق API را جدا از UI تست کرد
 * 
 * 3. قابلیت نگهداری
 *    - تغییرات endpoint یا ساختار داده فقط اینجا اعمال می‌شوند
 *    - کامپوننت‌ها از جزئیات Strapi بی‌اطلاع هستند
 * 
 * 4. سازگاری با الگوی پروژه
 *    - همان الگوی servicesApi.js، productsApi.js و... را دنبال می‌کند
 *    - ساختار یکپارچه در کل پروژه
 */
