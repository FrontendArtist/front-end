'use client';

/**
 * @file src/components/admin/Articles/ArticlesTable.jsx
 * @description List of articles - Client Component
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './Articles.module.scss';
import AdminSearch from '../Shared/AdminSearch';
import { AdminTableContainer, AdminTable, AdminToolbar } from '../Shared/AdminTable';
import AdminBadge from '../Shared/AdminBadge';
import AdminButton from '../Shared/AdminButton';
import { updateArticle, deleteArticle } from '@/lib/client/admin/articlesClient';

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
            await updateArticle(docId, { publishedAt: nextPublishedAt });

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
            await deleteArticle(deleteTarget.documentId);

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

    const headers = ['تصویر کاور', 'عنوان مقاله', 'خلاصه (Excerpt)', 'وضعیت انتشار', 'عملیات'];

    return (
        <>
            {/* ─── Articles Table Container ──────────────────────────────── */}
            <AdminTableContainer>
                {/* ── Toolbar ───────────────────────────────────────────── */}
                <AdminToolbar>
                    <AdminSearch
                        placeholder="جستجو (عنوان، اسلاگ)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <span className={styles.toolbar__count}>
                        {new Intl.NumberFormat('fa-IR').format(filtered.length)} مقاله
                    </span>
                </AdminToolbar>

                {/* ── Table ─────────────────────────────────────────────── */}
                {paginated.length === 0 ? (
                    <div className={styles.emptyState}>
                        <span className={styles.emptyIcon}>📝</span>
                        <p>مقاله‌ای یافت نشد.</p>
                    </div>
                ) : (
                    <AdminTable headers={headers}>
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
                                        <div style={{ fontSize: 'var(--font-xs)', opacity: 0.55, direction: 'ltr', textAlign: 'right' }}>
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
                                            <AdminBadge
                                                status={isPublished ? 'منتشر شده' : 'پیش‌نویس'}
                                                variant={isPublished ? 'success' : 'default'}
                                            />
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
                                            <AdminButton
                                                href={`/admin/articles/${article.documentId}`}
                                                variant="edit"
                                                title="ویرایش مقاله"
                                            >
                                                ✏️ ویرایش
                                            </AdminButton>
                                            <AdminButton
                                                variant="delete"
                                                onClick={() => setDeleteTarget(article)}
                                                title="حذف مقاله"
                                            >
                                                🗑 حذف
                                            </AdminButton>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </AdminTable>
                )}

                {/* ── Pagination ─────────────────────────────────────────── */}
                {pageCount > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', direction: 'rtl' }}>
                        <AdminButton
                            variant="default"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            ‹ قبلی
                        </AdminButton>

                        {pages.map((p) => (
                            <AdminButton
                                key={p}
                                variant={p === currentPage ? 'edit' : 'default'}
                                onClick={() => setCurrentPage(p)}
                            >
                                {new Intl.NumberFormat('fa-IR').format(p)}
                            </AdminButton>
                        ))}

                        <AdminButton
                            variant="default"
                            onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
                            disabled={currentPage === pageCount}
                        >
                            بعدی ›
                        </AdminButton>

                        <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)', marginRight: '1rem' }}>
                            صفحه {new Intl.NumberFormat('fa-IR').format(currentPage)} از{' '}
                            {new Intl.NumberFormat('fa-IR').format(pageCount)}
                        </span>
                    </div>
                )}
            </AdminTableContainer>

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
                            <AdminButton
                                variant="default"
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleteLoading}
                            >
                                انصراف
                            </AdminButton>
                            <AdminButton
                                variant="delete"
                                onClick={handleDelete}
                                disabled={deleteLoading}
                            >
                                {deleteLoading ? 'در حال حذف...' : 'بله، حذف کن'}
                            </AdminButton>
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
