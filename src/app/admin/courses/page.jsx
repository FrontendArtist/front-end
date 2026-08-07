/**
 * @file src/app/admin/courses/page.jsx
 * @description صفحه لیست دوره‌ها در پنل ادمین – Server Component
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAdminCoursesAll } from '@/lib/admin/adminCoursesApi';
import CoursesTable from '@/components/admin/Courses/CoursesTable';
import Link from 'next/link';
import styles from '../orders/orders.module.scss';

export const metadata = {
    title: 'مدیریت دوره‌ها | پنل ادمین',
    description: 'مدیریت دوره‌های آموزشی سایت',
};

export default async function AdminCoursesPage() {
    const session = await getServerSession(authOptions);
    const jwt = session?.user?.jwt;

    const { courses, meta, error } = await getAdminCoursesAll(jwt, { pageSize: 100 });

    return (
        <div className={styles.page}>
            {/* ── سرصفحه ───────────────────────────────────────────────── */}
            <header className={styles.page__header}>
                <h1 className={styles.page__title}>مدیریت دوره‌ها</h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {meta?.pagination && (
                        <span className={styles.page__count}>
                            {new Intl.NumberFormat('fa-IR').format(meta.pagination.total)} دوره
                        </span>
                    )}
                    <Link
                        href="/admin/courses/new"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.6rem 1.25rem',
                            borderRadius: '8px',
                            background: 'var(--color-title-hover)',
                            color: 'var(--color-bg-primary)',
                            fontWeight: 'var(--font-weight-bold)',
                            fontSize: 'var(--font-sm)',
                            textDecoration: 'none',
                            transition: 'opacity 0.2s',
                        }}
                    >
                        ➕ دوره جدید
                    </Link>
                </div>
            </header>

            {/* ── خطا ──────────────────────────────────────────────────── */}
            {error && (
                <div className={styles.page__error}>
                    <span>⚠️</span>
                    <p>اتصال به سرور ناموفق بود. لطفاً مطمئن شوید Strapi در حال اجراست.</p>
                </div>
            )}

            {/* ── جدول ─────────────────────────────────────────────────── */}
            {!error && <CoursesTable initialCourses={courses} />}
        </div>
    );
}
