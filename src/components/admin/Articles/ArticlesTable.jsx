'use client';

/**
 * @file src/components/admin/Articles/ArticlesTable.jsx
 * @description List of articles - Client Component
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './Articles.module.scss';

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
// ArticlesTable
// ─────────────────────────────────────────────────────────────────────────────

export default function ArticlesTable({ initialArticles }) {
    const router = useRouter();
    const { toasts, addToast } = useToast();

    // ── Local state ──────────────────────────────────────────────────────────
    const [articles, setArticles] = useState(initialArticles);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [loadingToggle, setLoadingToggle] = useState({}); // { [documentId]: boolean }
    const [deleteTarget, setDeleteTarget] = useState(null); // article to confirm delete
    const [deleteLoading, setDeleteLoading] = useState(false);

    // ── Toggle publish/unpublish ─────────────────────────────────────────────
    async function handleTogglePublish(article) {
        const docId = article.documentId;
        if (loadingToggle[docId]) return;

        const isPublished = !!article.publishedAt;
        const nextPublishedAt = isPublished ? null : new Date().toISOString();

        // Optimistic update
        setArticles((prev) =>
            prev.map((a) =>
                a.documentId === docId ? { ...a, publishedAt: nextPublishedAt } : a
            )
        );
        setLoadingToggle((prev) => ({ ...prev, [docId]: true }));

        try {
            const res = await fetch(`/api/admin/articles/${docId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ publishedAt: nextPublishedAt }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error || 'failed');
            }

            addToast(
                nextPublishedAt ? `«${article.title}» منتشر شد` : `«${article.title}» به پیش‌نویس منتقل شد`,
                'success'
            );
        } catch (err) {
            // Revert optimistic update
            setArticles((prev) =>
                prev.map((a) =>
                    a.documentId === docId ? { ...a, publishedAt: article.publishedAt } : a
                )
            );
            addToast(`خطا: ${err.message || 'بروزرسانی وضعیت انتشار با خطا مواجه شد'}`, 'error');
        } finally {
            setLoadingToggle((prev) => ({ ...prev, [docId]: false }));
            router.refresh();
        }
    }

    // ── Filtered articles ────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return articles;
        const q = searchQuery.toLowerCase();
        return articles.filter(
            (a) =>
                a.title?.toLowerCase().includes(q) ||
                a.slug?.toLowerCase().includes(q)
        );
    }, [articles, searchQuery]);

    // Reset to page 1 when search changes
    useEffect(() => { setCurrentPage(1); }, [searchQuery]);

    // ── Pagination ───────────────────────────────────────────────────────────
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    // ── Delete ───────────────────────────────────────────────────────────────
    async function handleDelete() {
        if (!deleteTarget) return;
        setDeleteLoading(true);

        try {
            const res = await fetch(`/api/admin/articles/${deleteTarget.documentId}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('delete failed');

            setArticles((prev) =>
                prev.filter((a) => a.documentId !== deleteTarget.documentId)
            );
            addToast(`مقاله «${deleteTarget.title}» حذف شد`, 'success');
            setDeleteTarget(null);
            router.refresh();
        } catch {
            addToast('خطا در حذف مقاله', 'error');
        } finally {
            setDeleteLoading(false);
        }
    }

    // ── Pagination pages array ────────────────────────────────────────────────
    const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

    return (
        <>
            {/* ─── Articles Table Container ──────────────────────────────── */}
            <div className={styles.tableContainer}>

                {/* ── Toolbar ───────────────────────────────────────────── */}
                <div className={styles.toolbar}>
                    <input
                        type="search"
                        placeholder="جستجو (عنوان، اسلاگ)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchBar}
                        aria-label="جستجوی مقاله"
                    />
                    <span className={styles.toolbar__count}>
                        {new Intl.NumberFormat('fa-IR').format(filtered.length)} مقاله
                    </span>
                </div>

                {/* ── Table ─────────────────────────────────────────────── */}
                {paginated.length === 0 ? (
                    <div className={styles.emptyState}>
                        <span className={styles.emptyIcon}>📝</span>
                        <p>مقاله‌ای یافت نشد.</p>
                    </div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>تصویر کاور</th>
                                <th>عنوان مقاله</th>
                                <th>خلاصه (Excerpt)</th>
                                <th>وضعیت انتشار</th>
                                <th>عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map((article) => {
                                const imgUrl = article.cover?.url
                                    ? `${STRAPI_URL}${article.cover.url}`
                                    : null;
                                const isPublished = !!article.publishedAt;

                                return (
                                    <tr key={article.documentId}>
                                        {/* تصویر */}
                                        <td>
                                            {imgUrl ? (
                                                <img
                                                    src={imgUrl}
                                                    alt={article.title}
                                                    className={styles.thumbnail}
                                                />
                                            ) : (
                                                <div className={styles.thumbnailPlaceholder}>📷</div>
                                            )}
                                        </td>

                                        {/* عنوان و اسلاگ */}
                                        <td>
                                            <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-card-text)' }}>
                                                {article.title}
                                            </div>
                                            <div style={{ fontSize: 'var(--font-ssm)', opacity: 0.55, direction: 'ltr', textAlign: 'right' }}>
                                                {article.slug}
                                            </div>
                                        </td>

                                        {/* خلاصه */}
                                        <td>
                                            <div style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-primary)' }}>
                                                {article.excerpt ? (article.excerpt.length > 50 ? `${article.excerpt.substring(0, 50)}...` : article.excerpt) : '—'}
                                            </div>
                                        </td>

                                        {/* وضعیت انتشار */}
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                                <span
                                                    className={`${styles.badge} ${isPublished ? styles['badge--published'] : styles['badge--draft']}`}
                                                >
                                                    {isPublished ? 'منتشر شده' : 'پیش‌نویس'}
                                                </span>
                                                <label className={styles.toggleLabel} title="تغییر وضعیت انتشار">
                                                    <input
                                                        type="checkbox"
                                                        className={styles.toggleInput}
                                                        checked={isPublished}
                                                        disabled={!!loadingToggle[article.documentId]}
                                                        onChange={() => handleTogglePublish(article)}
                                                        aria-label={`تغییر وضعیت انتشار مقاله‌ی ${article.title}`}
                                                    />
                                                    <span className={styles.toggleTrack} />
                                                </label>
                                            </div>
                                        </td>

                                        {/* عملیات */}
                                        <td>
                                            <div className={styles.actions}>
                                                <Link
                                                    href={`/admin/articles/${article.documentId}`}
                                                    className={`${styles.btnAction} ${styles['btnAction--edit']}`}
                                                    title="ویرایش مقاله"
                                                >
                                                    ✏️ ویرایش
                                                </Link>
                                                <button
                                                    className={`${styles.btnAction} ${styles['btnAction--delete']}`}
                                                    onClick={() => setDeleteTarget(article)}
                                                    title="حذف مقاله"
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
                        <h3>حذف مقاله</h3>
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
