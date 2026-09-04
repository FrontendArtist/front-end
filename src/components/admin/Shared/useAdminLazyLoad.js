'use client';

/**
 * @file src/components/admin/Shared/useAdminLazyLoad.js
 * @description هوک جامع برای مدیریت Lazy Loading و Infinite Scroll در تمام جداول پنل ادمین
 */

import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * @param {object} options
 * @param {Array} options.initialItems - داده‌های اولیه از سرور (معمولاً ۵۰ مورد)
 * @param {object|null} options.initialMeta - اطلاعات صفحه‌بندی اولیه استرپی
 * @param {Function} options.fetchFn - تابعی که داده‌های بیشتر را دریافت می‌کند: ({ start, limit }) => Promise<{ items, meta }>
 * @param {number} [options.chunkSize=20] - تعداد آیتم‌های واکشی‌شده در هر بار (پیش‌فرض ۲۰)
 * @param {string} [options.idKey='id'] - کلید شناسه برای جلوگیری از موارد تکراری
 */
function computeHasMore(currentItems, currentMeta) {
    if (!currentMeta?.pagination) {
        return (currentItems?.length || 0) >= 50;
    }
    const { total, start = 0, limit = (currentItems?.length || 50) } = currentMeta.pagination;
    if (total !== undefined && total !== null && total > 0) {
        return (start + limit) < total || (currentItems?.length || 0) < total;
    }
    return (currentItems?.length || 0) >= limit;
}

export function useAdminLazyLoad({
    initialItems = [],
    initialMeta = null,
    fetchFn,
    chunkSize = 20,
    idKey = 'id',
}) {
    const [items, setItems] = useState(initialItems);
    const initialTotal = initialMeta?.pagination?.total ?? initialItems.length;
    const [total, setTotal] = useState(initialTotal);
    const [hasMore, setHasMore] = useState(() => computeHasMore(initialItems, initialMeta));
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const sentinelRef = useRef(null);

    // همگام‌سازی وضعیت اگر initialItems تغییر کرد
    useEffect(() => {
        setItems(initialItems);
        const newTotal = initialMeta?.pagination?.total ?? initialItems.length;
        setTotal(newTotal);
        setHasMore(computeHasMore(initialItems, initialMeta));
    }, [initialItems, initialMeta]);

    const loadMore = useCallback(async () => {
        if (isLoading || !hasMore || !fetchFn) return;

        setIsLoading(true);
        setLoadError(null);

        try {
            const startOffset = items.length;
            const res = await fetchFn({ start: startOffset, limit: chunkSize });

            const newItems = res?.items || res?.data || [];
            if (Array.isArray(newItems) && newItems.length > 0) {
                setItems((prev) => {
                    const existingKeys = new Set(prev.map((i) => i[idKey] || i.documentId || i.id));
                    const filteredNew = newItems.filter(
                        (i) => !existingKeys.has(i[idKey] || i.documentId || i.id)
                    );
                    return [...prev, ...filteredNew];
                });

                const newTotal = res?.meta?.pagination?.total ?? total;
                setTotal(newTotal);

                // اگر تعداد برگشتی کمتر از chunkSize باشد یا به کل تعداد رسیده باشیم، hasMore تمام می‌شود
                if (newItems.length < chunkSize || items.length + newItems.length >= newTotal) {
                    setHasMore(false);
                }
            } else {
                setHasMore(false);
            }
        } catch (err) {
            console.error('[useAdminLazyLoad] Error loading more:', err);
            setLoadError('خطا در دریافت اطلاعات بیشتر');
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, hasMore, fetchFn, items.length, chunkSize, idKey, total]);

    // بارگذاری دستی فقط با کلیک روی دکمه «نمایش بیشتر»
    return {
        items,
        setItems,
        total,
        hasMore,
        isLoading,
        loadError,
        loadMore,
        sentinelRef,
    };
}
