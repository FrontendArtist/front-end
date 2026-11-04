/**
 * برچسب فارسی وضعیت ارسال کالای فیزیکی بای‌مانی (I11-O).
 * مالک این وضعیت فقط بای‌مانی است؛ اینجا فقط نمایش می‌دهیم و مقدار ناشناخته خطا نمی‌دهد.
 */
export const PHYSICAL_DELIVERY_LABELS = {
    Preparing: 'در حال آماده‌سازی',
    Shipped: 'ارسال‌شده',
    Delivered: 'تحویل‌شده',
    Cancelled: 'لغو شده',
};

export function getPhysicalDeliveryLabel(status) {
    if (!status || typeof status !== 'string') return null;
    return PHYSICAL_DELIVERY_LABELS[status] || status;
}
