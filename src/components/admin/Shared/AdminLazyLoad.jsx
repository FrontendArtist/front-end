'use client';

/**
 * @file src/components/admin/Shared/AdminLazyLoad.jsx
 * @description کامپوننت مشترک Lazy Load و دکمه «نمایش بیشتر» برای تمام جداول پنل ادمین
 */

import React from 'react';
import styles from './AdminShared.module.scss';

export default function AdminLazyLoad({
    hasMore,
    isLoading,
    loadError,
    error,
    onLoadMore,
    total,
    totalCount,
    currentCount,
    sentinelRef,
    itemLabel = 'مورد',
}) {
    const finalTotal = total ?? totalCount ?? 0;
    const finalError = loadError || error || null;

    return (
        <div className={styles.lazyContainer}>
            {/* ── حالت در حال بارگذاری ───────────────────────────── */}
            {isLoading && (
                <div className={styles.loadingIndicator}>
                    <div className={styles.spinner} />
                    <span>در حال دریافت ۲۰ {itemLabel} دیگر...</span>
                </div>
            )}

            {/* ── حالت خطا ────────────────────────────────────────── */}
            {finalError && (
                <div className={styles.errorIndicator}>
                    <span>{finalError}</span>
                    <button
                        type="button"
                        onClick={onLoadMore}
                        className={styles.retryBtn}
                    >
                        تلاش مجدد
                    </button>
                </div>
            )}

            {/* ── دکمه دستی نمایش بیشتر ───────────────────────────── */}
            {hasMore && !isLoading && !finalError && (
                <button
                    type="button"
                    onClick={onLoadMore}
                    className={styles.loadMoreBtn}
                >
                    ⬇️ نمایش ۲۰ {itemLabel} بیشتر ({new Intl.NumberFormat('fa-IR').format(currentCount)} از {new Intl.NumberFormat('fa-IR').format(finalTotal || currentCount)})
                </button>
            )}

            {/* ── پیام اتمام بارگذاری تمام موارد ─────────────────── */}
            {!hasMore && currentCount > 0 && (
                <div className={styles.allLoaded}>
                    <span>✓ تمام {itemLabel}‌ها نمایش داده شده‌اند (مجموع: {new Intl.NumberFormat('fa-IR').format(finalTotal || currentCount)} {itemLabel})</span>
                </div>
            )}
        </div>
    );
}
