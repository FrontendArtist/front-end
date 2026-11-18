/**
 * فهرست واحد منابع کد رهگیری کالای فیزیکی (SHIP-TRACKING).
 * مقدارها باید با فهرست منابع مجاز در دامنهٔ بای‌مانی یکی بمانند؛ افزودن واسط تازه فقط یک ردیف اینجاست.
 */
export const PHYSICAL_DELIVERY_PROVIDERS = [
    { value: 'Manual', label: 'ثبت دستی', requiresProviderReference: false, supportsCreate: false },
    { value: 'PostEx', label: 'پستکس', requiresProviderReference: true, supportsCreate: true },
];

/** واسط‌هایی که ساخت مرسوله از پنل برایشان فعال است. */
export function getCreatablePhysicalDeliveryProviders() {
    return PHYSICAL_DELIVERY_PROVIDERS.filter((provider) => provider.supportsCreate);
}

export function getPhysicalDeliveryProvider(value) {
    if (!value || typeof value !== 'string') return null;
    return PHYSICAL_DELIVERY_PROVIDERS.find((provider) => provider.value === value) || null;
}
