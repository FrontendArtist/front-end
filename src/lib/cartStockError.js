// پیام کمبود موجودی یک قلم سبد (I09-PH). سبد خودکار تغییر نمی‌کند؛ اصلاح قلم فقط با اقدام کاربر است.
// شناسهٔ قلم همان شناسه‌ای است که صفحهٔ سبد برای کالا به بای‌مانی می‌فرستد.
export function cartStockErrorMessage(error, items) {
    if (error?.code !== 'CART_STOCK_UNAVAILABLE' || !error.lineError?.externalId) return null;
    const { externalId, reason, availableQuantity } = error.lineError;
    const item = (items || []).find(candidate => candidate.type === 'product'
        && (candidate.documentId || candidate.externalCourseId || (candidate.id != null ? String(candidate.id) : null)) === externalId);
    if (!item?.title) return null;
    if (reason === 'INSUFFICIENT_STOCK' && Number.isInteger(availableQuantity)) {
        return `از «${item.title}» فقط ${availableQuantity} عدد موجود است؛ تعداد را در سبد کم کنید.`;
    }
    return `موجودی «${item.title}» تمام شده است؛ آن را از سبد حذف کنید.`;
}
