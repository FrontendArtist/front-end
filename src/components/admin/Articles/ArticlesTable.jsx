'use client';

/**
 * @file src/components/admin/Articles/ArticlesTable.jsx
 * @description List of articles - Client Component
 */

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './Articles.module.scss';
import AdminSearch from '../Shared/AdminSearch';
import { AdminTableContainer, AdminTable, AdminToolbar } from '../Shared/AdminTable';
import AdminBadge from '../Shared/AdminBadge';
import AdminButton from '../Shared/AdminButton';
import AdminLazyLoad from '../Shared/AdminLazyLoad';
import { useAdminLazyLoad } from '../Shared/useAdminLazyLoad';
import { fetchAdminArticles, updateArticle, deleteArticle } from '@/lib/client/admin/articlesClient';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

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

export default function ArticlesTable({ initialArticles = [], initialMeta = null }) {
    const router = useRouter();
    const { toasts, addToast } = useToast();

    // ── Lazy Loading State ───────────────────────────────────────────────────
    const {
        items: articles,
        setItems: setArticles,
        total: totalArticles,
        hasMore,
        isLoading: isLoadingMore,
        loadError,
        loadMore: loadMoreArticles,
        sentinelRef,
    } = useAdminLazyLoad({
        initialItems: initialArticles,
        initialMeta,
        fetchFn: fetchAdminArticles,
        chunkSize: 20,
        idKey: 'documentId',
    });

    const [searchQuery, setSearchQuery] = useState('');
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

    // ── Filtered & Sorted articles ──────────────────────────────────────────
    const filtered = useMemo(() => {
        let list = articles;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = articles.filter(
                (a) =>
                    a.title?.toLowerCase().includes(q) ||
                    a.slug?.toLowerCase().includes(q)
            );
        }

        return [...list].sort((a, b) => {
            const aPub = a.publishedAt ? new Date(a.publishedAt).getTime() : null;
            const bPub = b.publishedAt ? new Date(b.publishedAt).getTime() : null;

            if (aPub && bPub) {
                return bPub - aPub;
            }
            if (aPub && !bPub) {
                return -1;
            }
            if (!aPub && bPub) {
                return 1;
            }
            const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return bDate - aDate;
        });
    }, [articles, searchQuery]);

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
                        {searchQuery.trim()
                            ? `${new Intl.NumberFormat('fa-IR').format(filtered.length)} مقاله یافت‌شده`
                            : `نمایش ${new Intl.NumberFormat('fa-IR').format(articles.length)} از ${new Intl.NumberFormat('fa-IR').format(totalArticles)} مقاله`}
                    </span>
                </AdminToolbar>

                {/* ── Table ─────────────────────────────────────────────── */}
                {filtered.length === 0 ? (
                    <div className={styles.emptyState}>
                        <span className={styles.emptyIcon}>📝</span>
                        <p>مقاله‌ای یافت نشد.</p>
                    </div>
                ) : (
                    <AdminTable headers={headers}>
                        {filtered.map((article) => {
                            const imgUrl = article.cover?.url
                                ? (article.cover.url.startsWith('http') ? article.cover.url : `${STRAPI_URL}${article.cover.url}`)
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

                {/* ── Lazy Loading & Load More ───────────────────────── */}
                <AdminLazyLoad
                    hasMore={hasMore}
                    isLoading={isLoadingMore}
                    loadError={loadError}
                    onLoadMore={loadMoreArticles}
                    total={totalArticles}
                    currentCount={articles.length}
                    sentinelRef={sentinelRef}
                    itemLabel="مقاله"
                />
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
