/**
 * @file src/lib/admin/manualOrderInput.js
 * @description اعتبارسنجی مشترک ورودی سفارش دستی ادمین (ثبت و پیش‌نمایش قیمت)؛ فقط دوره و فصل (I11-AO)
 */

const ITEM_TYPES = ['course', 'course_chapter'];
const MAX_ITEMS = 100;

/** @returns {{ items: {externalId:string,type:string,quantity:1}[] } | { error: string }} */
export function parseManualOrderItems(rawItems) {
    const list = Array.isArray(rawItems) ? rawItems : [];
    if (list.length === 0) return { error: 'حداقل یک دوره یا فصل باید انتخاب شود.' };
    if (list.length > MAX_ITEMS) return { error: 'تعداد اقلام بیش از حد مجاز است.' };

    const seen = new Set();
    const items = [];
    for (const raw of list) {
        const externalId = String(raw?.externalId ?? '').trim();
        if (!externalId || !ITEM_TYPES.includes(raw?.type)) return { error: 'قلم انتخاب‌شده نامعتبر است.' };
        const key = `${raw.type}:${externalId}`;
        if (seen.has(key)) return { error: 'قلم تکراری انتخاب شده است.' };
        seen.add(key);
        items.push({ externalId, type: raw.type, quantity: 1 });
    }
    return { items };
}

/**
 * شناسهٔ پایدار ذینفع (documentId) از استرپی؛ از مقدار کلاینت اعتماد نمی‌شود.
 * @returns {Promise<{ id: string } | { error: string, status: number }>}
 */
export async function resolveBeneficiary({ strapiBaseUrl, token, userId }) {
    const id = String(userId ?? '').trim();
    if (!id) return { error: 'کاربر مورد نظر انتخاب نشده است.', status: 400 };
    try {
        const res = await fetch(`${strapiBaseUrl}/api/users/${encodeURIComponent(id)}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
        });
        if (!res.ok) return { error: 'کاربر انتخاب شده در سیستم یافت نشد.', status: 404 };
        const user = await res.json();
        const documentId = user.documentId || (user.id != null ? String(user.id) : '');
        return documentId ? { id: documentId } : { error: 'شناسهٔ کاربر معتبر نیست.', status: 400 };
    } catch {
        return { error: 'خطا در بازیابی اطلاعات کاربر', status: 502 };
    }
}
