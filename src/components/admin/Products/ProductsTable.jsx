'use client';

/**
 * @file src/components/admin/Products/ProductsTable.jsx
 * @description جدول مدیریت محصولات – Client Component
 *
 * ✅ ویژگی‌ها:
 *   - جستجوی لحظه‌ای روی title / slug
 *   - صفحه‌بندی (pagination) سمت کلاینت
 *   - تاگل فوری isAvailable با آپدیت optimistic
 *   - دیالوگ تأیید حذف
 *   - اعلان Toast برای هر عملیات
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './Products.module.scss';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';
const PAGE_SIZE = 12;

// ─────────────────────────────────────────────────────────────────────────────
// Toast helper
// ─────────────────────────────────────────────────────────────────────────────

function useToast() {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'success') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3500);
    }, []);

    return { toasts, addToast };
}

const TOAST_ICONS = { success: '✅', error: '❌', info: 'ℹ️' };

// ─────────────────────────────────────────────────────────────────────────────
// ProductsTable
// ─────────────────────────────────────────────────────────────────────────────

export default function ProductsTable({ initialProducts }) {
    const router = useRouter();
    const { toasts, addToast } = useToast();

    // ── Local state ──────────────────────────────────────────────────────────
    const [products, setProducts] = useState(initialProducts);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [loadingToggle, setLoadingToggle] = useState({}); // { [documentId]: boolean }
    const [deleteTarget, setDeleteTarget] = useState(null); // product to confirm delete
    const [deleteLoading, setDeleteLoading] = useState(false);

    // ── Filtered products ────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return products;
        const q = searchQuery.toLowerCase();
        return products.filter(
            (p) =>
                p.title?.toLowerCase().includes(q) ||
                p.slug?.toLowerCase().includes(q)
        );
    }, [products, searchQuery]);

    // Reset to page 1 when search changes
    useEffect(() => { setCurrentPage(1); }, [searchQuery]);

    // ── Pagination ───────────────────────────────────────────────────────────
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    // ── Toggle isAvailable ───────────────────────────────────────────────────
    async function handleToggle(product) {
        const docId = product.documentId;
        if (loadingToggle[docId]) return;

        const nextVal = !product.isAvailable;

        // Optimistic update
        setProducts((prev) =>
            prev.map((p) =>
                p.documentId === docId ? { ...p, isAvailable: nextVal } : p
            )
        );
        setLoadingToggle((prev) => ({ ...prev, [docId]: true }));

        try {
            const res = await fetch(`/api/admin/products/${docId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isAvailable: nextVal }),
            });

            if (!res.ok) {
                throw new Error('update failed');
            }

            addToast(
                nextVal ? `«${product.title}» در دسترس شد` : `«${product.title}» غیر فعال شد`,
                'success'
            );
        } catch {
            // Revert optimistic update
            setProducts((prev) =>
                prev.map((p) =>
                    p.documentId === docId ? { ...p, isAvailable: !nextVal } : p
                )
            );
            addToast('خطا در بروزرسانی وضعیت محصول', 'error');
        } finally {
            setLoadingToggle((prev) => ({ ...prev, [docId]: false }));
        }
    }

    // ── Delete ───────────────────────────────────────────────────────────────
    async function handleDelete() {
        if (!deleteTarget) return;
        setDeleteLoading(true);

        try {
            const res = await fetch(`/api/admin/products/${deleteTarget.documentId}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('delete failed');

            setProducts((prev) =>
                prev.filter((p) => p.documentId !== deleteTarget.documentId)
            );
            addToast(`محصول «${deleteTarget.title}» حذف شد`, 'success');
            setDeleteTarget(null);
        } catch {
            addToast('خطا در حذف محصول', 'error');
        } finally {
            setDeleteLoading(false);
        }
    }

    // ── Pagination pages array ────────────────────────────────────────────────
    const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

    return (
        <>
            {/* ─── Products Table Container ──────────────────────────────── */}
            <div className={styles.tableContainer}>

                {/* ── Toolbar ───────────────────────────────────────────── */}
                <div className={styles.toolbar}>
                    <input
                        type="search"
                        placeholder="جستجو (نام، اسلاگ)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchBar}
                        aria-label="جستجوی محصول"
                    />
                    <span className={styles.toolbar__count}>
                        {new Intl.NumberFormat('fa-IR').format(filtered.length)} محصول
                    </span>
                </div>

                {/* ── Table ─────────────────────────────────────────────── */}
                {paginated.length === 0 ? (
                    <div className={styles.emptyState}>
                        <span className={styles.emptyIcon}>📦</span>
                        <p>محصولی یافت نشد.</p>
                    </div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>تصویر</th>
                                <th>نام محصول</th>
                                <th>قیمت (تومان)</th>
                                <th>موجودی</th>
                                <th>وضعیت</th>
                                <th>در دسترس</th>
                                <th>عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map((product) => {
                                const imgUrl = product.images?.[0]?.url
                                    ? `${STRAPI_URL}${product.images[0].url}`
                                    : null;
                                const isPublished = !!product.publishedAt;

                                return (
                                    <tr key={product.documentId}>
                                        {/* تصویر */}
                                        <td>
                                            {imgUrl ? (
                                                <img
                                                    src={imgUrl}
                                                    alt={product.title}
                                                    className={styles.thumbnail}
                                                />
                                            ) : (
                                                <div className={styles.thumbnailPlaceholder}>📷</div>
                                            )}
                                        </td>

                                        {/* نام */}
                                        <td>
                                            <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-card-text)' }}>
                                                {product.title}
                                            </div>
                                            <div style={{ fontSize: 'var(--font-ssm)', opacity: 0.55, direction: 'ltr', textAlign: 'right' }}>
                                                {product.slug}
                                            </div>
                                        </td>

                                        {/* قیمت */}
                                        <td className={styles.priceCell}>
                                            {product.price != null
                                                ? new Intl.NumberFormat('fa-IR').format(product.price)
                                                : '—'}
                                        </td>

                                        {/* موجودی */}
                                        <td className={styles.stockCell}>
                                            {product.stock ?? '—'}
                                        </td>

                                        {/* وضعیت انتشار */}
                                        <td>
                                            <span
                                                className={`${styles.badge} ${isPublished ? styles['badge--published'] : styles['badge--draft']}`}
                                            >
                                                {isPublished ? 'منتشر شده' : 'پیش‌نویس'}
                                            </span>
                                        </td>

                                        {/* تاگل isAvailable */}
                                        <td>
                                            <label className={styles.toggleLabel} title="تغییر دسترس‌پذیری">
                                                <input
                                                    type="checkbox"
                                                    className={styles.toggleInput}
                                                    checked={!!product.isAvailable}
                                                    disabled={!!loadingToggle[product.documentId]}
                                                    onChange={() => handleToggle(product)}
                                                    aria-label={`تاگل دسترس‌پذیری ${product.title}`}
                                                />
                                                <span className={styles.toggleTrack} />
                                            </label>
                                        </td>

                                        {/* عملیات */}
                                        <td>
                                            <div className={styles.actions}>
                                                <Link
                                                    href={`/admin/products/${product.documentId}`}
                                                    className={`${styles.btnAction} ${styles['btnAction--edit']}`}
                                                    title="ویرایش محصول"
                                                >
                                                    ✏️ ویرایش
                                                </Link>
                                                <button
                                                    className={`${styles.btnAction} ${styles['btnAction--delete']}`}
                                                    onClick={() => setDeleteTarget(product)}
                                                    title="حذف محصول"
                                                >
                                                    🗑 حذف
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}

                {/* ── Pagination ─────────────────────────────────────────── */}
                {pageCount > 1 && (
                    <div className={styles.pagination}>
                        <button
                            className={styles.pagination__btn}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            ‹ قبلی
                        </button>

                        {pages.map((p) => (
                            <button
                                key={p}
                                className={`${styles.pagination__btn} ${p === currentPage ? styles['pagination__btn--active'] : ''}`}
                                onClick={() => setCurrentPage(p)}
                            >
                                {new Intl.NumberFormat('fa-IR').format(p)}
                            </button>
                        ))}

                        <button
                            className={styles.pagination__btn}
                            onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                            disabled={currentPage === pageCount}
                        >
                            بعدی ›
                        </button>

                        <span className={styles.pagination__info}>
                            صفحه {new Intl.NumberFormat('fa-IR').format(currentPage)} از{' '}
                            {new Intl.NumberFormat('fa-IR').format(pageCount)}
                        </span>
                    </div>
                )}
            </div>

            {/* ─── Delete Confirmation Dialog ────────────────────────────── */}
            {deleteTarget && (
                <div className={styles.confirmOverlay} onClick={() => !deleteLoading && setDeleteTarget(null)}>
                    <div className={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
                        <h3>حذف محصول</h3>
                        <p>
                            آیا از حذف <strong>«{deleteTarget.title}»</strong> اطمینان دارید؟
                            این عمل غیرقابل بازگشت است.
                        </p>
                        <div className={styles.confirmBox__buttons}>
                            <button
                                className={styles.confirmBox__cancel}
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleteLoading}
                            >
                                انصراف
                            </button>
                            <button
                                className={styles.confirmBox__confirm}
                                onClick={handleDelete}
                                disabled={deleteLoading}
                            >
                                {deleteLoading ? 'در حال حذف...' : 'بله، حذف کن'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Toast Notifications ──────────────────────────────────── */}
            <div className={styles.toastContainer} aria-live="polite">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`${styles.toast} ${styles[`toast--${t.type}`]}`}
                        role="alert"
                    >
                        <span className={styles.toastIcon}>{TOAST_ICONS[t.type]}</span>
                        {t.message}
                    </div>
                ))}
            </div>
        </>
    );
}
