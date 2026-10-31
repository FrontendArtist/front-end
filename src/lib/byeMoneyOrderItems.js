/**
 * نگاشت اقلام سفارش/خرید بای‌مانی به شکل قابل‌استفاده در دوره‌های من و دسترسی فصل
 */

function isChapterLike(item) {
    if (!item || typeof item !== 'object') return false;
    const rawType = String(item.itemType || item.type || '').toLowerCase().replace(/_/g, '');
    return rawType === 'coursechapter' || rawType === 'chapter' || Boolean(item.parentExternalId);
}

export function mapByeMoneyLineItem(item) {
    if (!item || typeof item !== 'object') return null;
    const isChapter = isChapterLike(item);
    const externalId = item.externalCourseId || item.courseExternalId || item.purchaseId || null;
    const parentExternalId = item.parentExternalId || item.courseDocumentId || null;
    const title = item.title || item.courseTitle || null;

    return {
        id: externalId,
        documentId: isChapter ? parentExternalId : externalId,
        courseDocumentId: isChapter ? parentExternalId : externalId,
        courseId: item.courseId || null,
        chapterId: item.chapterId || null,
        externalCourseId: externalId,
        integrationId: isChapter ? externalId : null,
        parentExternalId: isChapter ? parentExternalId : null,
        title,
        courseTitle: item.courseTitle || (isChapter ? null : title),
        chapterTitle: item.chapterTitle || null,
        slug: item.slug || null,
        courseSlug: item.courseSlug || null,
        price: item.finalAmountInNoor ?? item.priceInNoor ?? item.price ?? null,
        purchaseId: item.purchaseId || null,
        transactionId: item.transactionId || null,
        purchasedAtUtc: item.purchasedAtUtc || null,
        financialStatus: item.financialStatus || null,
        deliveryStatus: item.deliveryStatus || null,
        type: isChapter ? 'chapter' : 'course',
        itemType: item.itemType || (isChapter ? 'CourseChapter' : 'Course'),
        __component: 'order.course-order-item',
    };
}

export function mapByeMoneyPurchaseItem(purchase) {
    if (!purchase || typeof purchase !== 'object') return null;
    return mapByeMoneyLineItem({
        ...purchase,
        title: purchase.courseTitle || purchase.title,
        externalCourseId: purchase.courseExternalId || purchase.externalCourseId,
        courseExternalId: purchase.courseExternalId || purchase.externalCourseId,
    });
}

function cartKey(value) {
    if (!value) return '';
    const raw = String(value);
    const colon = raw.indexOf(':');
    return (colon >= 0 ? raw.slice(colon + 1) : raw).toLowerCase();
}

/**
 * اقلام واقعی خرید را به سفارش خلاصهٔ بای‌مانی وصل می‌کند تا عنوان و نوع فصل خالی نماند.
 */
export function attachPurchasesToByeMoneyOrder(order, purchases = []) {
    if (!order) return order;
    const orderCartKey = cartKey(order.cartId || order.orderId);
    const orderPurchaseKey = cartKey(String(order.orderId || '').startsWith('purchase:') ? order.orderId : '');
    const matched = (Array.isArray(purchases) ? purchases : []).filter((purchase) => {
        const purchaseCartKey = cartKey(purchase.cartId);
        const purchaseIdKey = cartKey(purchase.purchaseId);
        if (orderCartKey && purchaseCartKey && orderCartKey === purchaseCartKey) return true;
        if (orderPurchaseKey && purchaseIdKey && orderPurchaseKey === purchaseIdKey) return true;
        return false;
    });
    const mapped = matched.map(mapByeMoneyPurchaseItem).filter(Boolean);
    if (mapped.length > 0) {
        return { ...order, items: mapped };
    }
    return order;
}
