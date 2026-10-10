export const itemKey = (item) => {
    if (item.chapterId || item.type === 'chapter') return `chapter:${item.chapterId || String(item.id).replace('chapter-', '')}`;
    if (item.courseId || item.type === 'course' || item.__component === 'order.course-order-item') return `course:${item.courseId || item.id}`;
    return `product:${item.productId || item.id}`;
};

export function removeOrderItems(items, purchased) {
    const quantities = new Map();
    for (const item of purchased) {
        const key = itemKey(item);
        quantities.set(key, (quantities.get(key) || 0) + (Number(item.quantity) || 1));
    }
    return items.flatMap((item) => {
        const quantity = quantities.get(itemKey(item));
        if (!quantity) return [item];
        if (item.type === 'product' && item.quantity > quantity) return [{ ...item, quantity: item.quantity - quantity }];
        return [];
    });
}

export function mergeRecoveredItems(items, recovered) {
    const merged = [...items];
    for (const item of recovered) {
        const index = merged.findIndex((current) => itemKey(current) === itemKey(item));
        if (index < 0) merged.push(item);
        else merged[index] = { ...item, quantity: item.type === 'product'
            ? Math.min(item.stock, Math.max(merged[index].quantity || 1, item.quantity)) : 1 };
    }
    return merged;
}
