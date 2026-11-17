// مبدأ و آدرس نمایشی سبد/سفارش. شناسهٔ شهر به صفحه نمی‌رود.

export function pickShippingOrigin(origin) {
    if (!origin || typeof origin !== 'object') return null;
    const id = typeof origin.id === 'string' ? origin.id.trim() : '';
    const label = typeof origin.label === 'string' ? origin.label.trim() : '';
    if (!id && !label) return null;
    return { id: id || null, label: label || null };
}

export function shippingOriginText(origin) {
    const picked = pickShippingOrigin(origin);
    return picked ? (picked.label || picked.id) : null;
}

export function quotedShippingOriginText(data) {
    if (!data || typeof data !== 'object') return null;
    return shippingOriginText(data.shippingOrigin)
        || (typeof data.shippingOriginLabel === 'string' ? data.shippingOriginLabel.trim() : '')
        || (typeof data.shippingOriginId === 'string' ? data.shippingOriginId.trim() : '')
        || null;
}

function hasStreet(address) {
    return Boolean(address && typeof address.fullAddress === 'string' && address.fullAddress.trim());
}

export function quotedShippingAddress(data, profileAddress) {
    if (hasStreet(data?.shippingAddress)) return data.shippingAddress;
    if (hasStreet(data?.addressSnapshot)) return data.addressSnapshot;
    if (hasStreet(profileAddress)) return profileAddress;
    return null;
}
