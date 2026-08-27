'use client';

/**
 * @file src/components/admin/Courses/CoursesTable.jsx
 * @description جدول مدیریت دوره‌ها – Client Component
 *
 * ✅ ویژگی‌ها:
 *   - جستجوی لحظه‌ای روی title / slug
 *   - صفحه‌بندی سمت کلاینت
 *   - تاگل فوری انتشار (publish/draft) با آپدیت optimistic
 *   - دیالوگ تأیید حذف
 *   - Toast اعلان
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Courses.module.scss';
import AdminSearch from '../Shared/AdminSearch';
import { AdminTableContainer, AdminTable, AdminToolbar } from '../Shared/AdminTable';
import AdminBadge from '../Shared/AdminBadge';
import AdminButton from '../Shared/AdminButton';
import { updateCourse, deleteCourse } from '@/lib/client/admin/coursesClient';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';
const PAGE_SIZE = 12;

// ── Toast ──────────────────────────────────────────────────────────────────────
function useToast() {
    const [toasts, setToasts] = useState([]);
    const addToast = useCallback((message, type = 'success') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
    }, []);
    return { toasts, addToast };
}
const TOAST_ICONS = { success: '✅', error: '❌', info: 'ℹ️' };

// ──────────────────────────────────────────────────────────────────────────────
export default function CoursesTable({ initialCourses }) {
    const router = useRouter();
    const { toasts, addToast } = useToast();

    const [courses, setCourses] = useState(initialCourses);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [loadingToggle, setLoadingToggle] = useState({});
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // ── Filtered ───────────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return courses;
        const q = searchQuery.toLowerCase();
        return courses.filter(
            (c) => c.title?.toLowerCase().includes(q) || c.slug?.toLowerCase().includes(q)
        );
    }, [courses, searchQuery]);

    useEffect(() => { setCurrentPage(1); }, [searchQuery]);

    // ── Pagination ─────────────────────────────────────────────────────────────
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    // ── Toggle publish ────────────────────────────────────────────────────────
    async function handleTogglePublish(course) {
        const docId = course.documentId;
        if (loadingToggle[docId]) return;

        const isCurrentlyPublished = !!course.publishedAt;
        const nextPublishedAt = isCurrentlyPublished ? null : new Date().toISOString();

        // Optimistic update
        setCourses((prev) =>
            prev.map((c) =>
                c.documentId === docId ? { ...c, publishedAt: nextPublishedAt } : c
            )
        );
        setLoadingToggle((prev) => ({ ...prev, [docId]: true }));

        try {
            await updateCourse(docId, { publishedAt: nextPublishedAt });

            addToast(
                nextPublishedAt
                    ? `«${course.title}» منتشر شد`
                    : `«${course.title}» به پیش‌نویس منتقل شد`,
                'success'
            );
        } catch (err) {
            // Revert
            setCourses((prev) =>
                prev.map((c) =>
                    c.documentId === docId ? { ...c, publishedAt: course.publishedAt } : c
                )
            );
            addToast(`خطا: ${err.message || 'بروزرسانی وضعیت انتشار با خطا مواجه شد'}`, 'error');
        } finally {
            setLoadingToggle((prev) => ({ ...prev, [docId]: false }));
            router.refresh();
        }
    }

    // ── Delete ────────────────────────────────────────────────────────────────
    async function handleDelete() {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await deleteCourse(deleteTarget.documentId);
            setCourses((prev) => prev.filter((c) => c.documentId !== deleteTarget.documentId));
            addToast(`دوره «${deleteTarget.title}» حذف شد`, 'success');
            setDeleteTarget(null);
            router.refresh();
        } catch {
            addToast('خطا در حذف دوره', 'error');
        } finally {
            setDeleteLoading(false);
        }
    }

    const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

    const headers = ['تصویر', 'عنوان دوره', 'قیمت (تومان)', 'رایگان', 'فصل‌بندی', 'وضعیت انتشار', 'عملیات'];

    return (
        <>
            <AdminTableContainer>
                <AdminToolbar>
                    <AdminSearch
                        placeholder="جستجو (عنوان، اسلاگ)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <span className={styles.toolbar__count}>
                        {new Intl.NumberFormat('fa-IR').format(filtered.length)} دوره
                    </span>
                </AdminToolbar>

                {paginated.length === 0 ? (
                    <div className={styles.emptyState}>
                        <span className={styles.emptyIcon}>🎓</span>
                        <p>دوره‌ای یافت نشد.</p>
                    </div>
                ) : (
                    <AdminTable headers={headers}>
                        {paginated.map((course) => {
                            const imgUrl = course.media?.[0]?.url
                                ? `${STRAPI_URL}${course.media[0].url}`
                                : null;
                            const isPublished = !!course.publishedAt;

                            return (
                                <tr key={course.documentId}>
                                    {/* تصویر */}
                                    <td>
                                        {imgUrl ? (
                                            <img
                                                src={imgUrl}
                                                alt={course.title}
                                                className={styles.thumbnail}
                                            />
                                        ) : (
                                            <div className={styles.thumbnailPlaceholder}>🎬</div>
                                        )}
                                    </td>

                                    {/* عنوان */}
                                    <td>
                                        <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-card-text)' }}>
                                            {course.title}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-xs)', opacity: 0.55, direction: 'ltr', textAlign: 'right' }}>
                                            {course.slug}
                                        </div>
                                    </td>

                                    {/* قیمت */}
                                    <td className={styles.priceCell}>
                                        {course.price != null ? (
                                            course.discountPercent > 0 && !course.isFree ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <del style={{ fontSize: '0.75rem', opacity: 0.5 }}>
                                                        {new Intl.NumberFormat('fa-IR').format(course.price)}
                                                    </del>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <strong style={{ color: '#ffd166' }}>
                                                            {new Intl.NumberFormat('fa-IR').format(Math.round(course.price * (1 - course.discountPercent / 100)))}
                                                        </strong>
                                                        <span style={{ fontSize: '0.7rem', background: '#ef4444', color: '#fff', padding: '1px 4px', borderRadius: '4px' }}>
                                                            ٪{course.discountPercent}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                new Intl.NumberFormat('fa-IR').format(course.price)
                                            )
                                        ) : '—'}
                                    </td>

                                    {/* رایگان */}
                                    <td>
                                        <AdminBadge
                                            status={course.isFree ? 'رایگان' : 'پولی'}
                                            variant={course.isFree ? 'success' : 'default'}
                                        />
                                    </td>

                                    {/* فصل‌بندی */}
                                    <td>
                                        <AdminBadge
                                            status={course.isChaptered ? 'فصل‌بندی' : 'ساده'}
                                            variant={course.isChaptered ? 'info' : 'default'}
                                        />
                                    </td>

                                    {/* وضعیت انتشار (ترکیب نشانگر و تاگل) */}
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
                                                    disabled={!!loadingToggle[course.documentId]}
                                                    onChange={() => handleTogglePublish(course)}
                                                    aria-label={`تغییر وضعیت انتشار دوره‌ی ${course.title}`}
                                                />
                                                <span className={styles.toggleTrack} />
                                            </label>
                                        </div>
                                    </td>

                                    {/* عملیات */}
                                    <td>
                                        <div className={styles.actions}>
                                            <AdminButton
                                                href={`/admin/courses/${course.documentId}`}
                                                variant="edit"
                                                title="ویرایش دوره"
                                            >
                                                ✏️ ویرایش
                                            </AdminButton>
                                            <AdminButton
                                                variant="delete"
                                                onClick={() => setDeleteTarget(course)}
                                                title="حذف دوره"
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

                {/* Pagination */}
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

            {/* Delete Confirm Dialog */}
            {deleteTarget && (
                <div className={styles.confirmOverlay} onClick={() => !deleteLoading && setDeleteTarget(null)}>
                    <div className={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
                        <h3>حذف دوره</h3>
                        <p>
                            آیا از حذف <strong>«{deleteTarget.title}»</strong> اطمینان دارید؟
                            این عمل غیرقابل بازگشت است.
                        </p>
                        <div className={styles.confirmBox__buttons}>
                            <AdminButton variant="default" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>
                                انصراف
                            </AdminButton>
                            <AdminButton variant="delete" onClick={handleDelete} disabled={deleteLoading}>
                                {deleteLoading ? 'در حال حذف...' : 'بله، حذف کن'}
                            </AdminButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
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
