/**
 * Comments API - لایه API اختصاصی برای سیستم نظرات
 * آپدیت شده: هماهنگی با نام‌های جدید فیلدها (comment_parent, comment_replies) در Strapi
 */

import { apiClient } from './apiClient';

// شناسه کاربر تستی (اگر سیستم Auth ندارید)
const MOCK_USER_ID = 1;

/**
 * واکشی نظرات تأیید شده برای یک موجودیت
 */
export async function getComments(entityType, entityId) {
    try {
        if (!entityType || !entityId) {
            throw new Error('entityType و entityId الزامی هستند');
        }

        const entityFieldMap = {
            article: 'article',
            product: 'product',
            course: 'course',
            user: 'user'
        };

        const entityField = entityFieldMap[entityType];
        if (!entityField) {
            throw new Error(`نوع موجودیت نامعتبر: ${entityType}`);
        }

        // ساخت Query String با نام‌های جدید فیلدها
        const queryParams = new URLSearchParams({
            // ✅ ۱. فیلتر برای کامنت‌های سطح اول
            'filters[isApproved][$eq]': 'true',
            [`filters[${entityField}][documentId][$eq]`]: entityId,

            // فیلتر برای کامنت‌های والد (فقط root comments)
            'filters[comment_parent][$null]': 'true',

            // فیلدهای کاربر در سطح اول
            'populate[user][fields][0]': 'username',
            'populate[user][fields][1]': 'documentId',

            // 👇👇👇 فیکس اصلی برای سطح اول پاسخ‌ها (Level 1 Replies)
            'populate[comment_replies][filters][isApproved][$eq]': 'true', // ✅ فیلتر برای Level 1
            'populate[comment_replies][populate][user][fields][0]': 'username',
            'populate[comment_replies][populate][user][fields][1]': 'documentId',

            // 👇👇👇 فیکس اصلی برای سطح دوم پاسخ‌ها (Level 2 Replies)
            'populate[comment_replies][populate][comment_replies][filters][isApproved][$eq]': 'true', // ✅ فیلتر برای Level 2
            'populate[comment_replies][populate][comment_replies][populate][user][fields][0]': 'username',
            'populate[comment_replies][populate][comment_replies][populate][user][fields][1]': 'documentId',

            'sort': 'createdAt:desc'
        });

        const endpoint = `/api/comments?${queryParams.toString()}`;
        const response = await apiClient(endpoint);

        return formatComments(response.data || []);

    } catch (error) {
        console.error('خطا در واکشی نظرات:', error.message);
        return [];
    }
}

/**
 * فرمت کردن داده‌ها و تبدیل نام‌های جدید به ساختار استاندارد UI
 */
function formatComments(rawComments) {
    if (!Array.isArray(rawComments)) {
        return [];
    }

    return rawComments.map(item => {
        const attrs = item.attributes || item;

        return {
            id: item.id,
            documentId: item.documentId, // جهت احتیاط برای عملیات بعدی
            name: attrs.name, // 👈 نام وارد شده توسط کاربر در هنگام ثبت
            content: attrs.content || '',
            rating: attrs.rating || 0,
            createdAt: attrs.createdAt || new Date().toISOString(),
            user: formatUser(attrs.user?.data || attrs.user),

            // 👇 اینجا جادو اتفاق می‌افتد:
            // ما دیتای 'comment_replies' را می‌خوانیم اما به نام 'replies' برمی‌گردانیم
            // تا کامپوننت‌های React (CommentItem) خراب نشوند.
            replies: formatComments(attrs.comment_replies?.data || attrs.comment_replies || [])
        };
    });
}

function formatUser(userData) {
    if (!userData) return { id: 0, username: 'کاربر مهمان' };
    const attrs = userData.attributes || userData;
    return { id: userData.id || 0, username: attrs.username || 'کاربر مهمان' };
}

/**
 * ارسال نظر جدید (آپدیت شده با comment_parent)
 */
export async function submitComment(commentData) {
    try {
        const dataPayload = {
            name: commentData.name, // 👈 اضافه شد
            content: commentData.content.trim(),
            rating: Number(commentData.rating) || 5,
            isApproved: false,
        };

        // اتصال موجودیت ها
        if (commentData.entityType === 'article') {
            dataPayload.article = commentData.entityId;
        } else if (commentData.entityType === 'product') {
            dataPayload.product = commentData.entityId;
        } else if (commentData.entityType === 'course') {
            dataPayload.course = commentData.entityId;
        }

        // 👇 اتصال پاسخ به والد
        if (commentData.parentId) {
            console.log("🔗 Connecting reply to parent:", commentData.parentId);
            dataPayload.comment_parent = {
                connect: [commentData.parentId]
            };
        }

        console.log('📤 Sending Request to local API Proxy: /api/comments', {
            payload: dataPayload
        });

        // فراخوانی مستقیم API Proxy فرانت‌اند جهت امنیت و سازگاری آسان‌تر با تمام سشن‌ها و احراز هویت
        const response = await fetch('/api/comments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data: dataPayload })
        });

        if (!response.ok) {
            const errorMsg = await response.text();
            throw new Error(`API_ERROR_${response.status}`);
        }

        const resData = await response.json();

        // چون فرمت خروجی Strapi ممکنه هنوز comment_replies باشه، از فرمتر ردش می‌کنیم
        const formatted = formatComments([resData.data || resData]);
        return formatted[0];

    } catch (error) {
        console.error('خطا در ارسال نظر:', error.message);
        throw error;
    }
}