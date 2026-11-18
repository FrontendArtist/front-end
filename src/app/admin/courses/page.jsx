/**
 * @file src/app/admin/courses/page.jsx
 * @description صفحه لیست دوره‌ها در پنل ادمین – Server Component
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAdminCoursesAll } from '@/lib/admin/adminCoursesApi';
import CoursesTable from '@/components/admin/Courses/CoursesTable';
import AdminButton from '@/components/admin/Shared/AdminButton';
import { Plus } from 'lucide-react';
import styles from '../orders/orders.module.scss';

export const metadata = {
    title: 'مدیریت دوره‌ها',
    description: 'مدیریت دوره‌های آموزشی سایت',
    robots: { index: false, follow: false },
};

export default async function AdminCoursesPage() {
    const session = await getServerSession(authOptions);
    const jwt = session?.user?.jwt;

    const { courses, meta, error } = await getAdminCoursesAll(jwt, { page: 1, pageSize: 50 });

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
                    <AdminButton href="/admin/courses/new" variant="primary">
                        <Plus size={16} />
                        دوره جدید
                    </AdminButton>
                </div>
            </header>

            {/* ── خطا ──────────────────────────────────────────────────── */}
            {error && (
                <div className={styles.page__error}>
                    <span>⚠️</span>
                    <p>خطا در برقراری ارتباط با سرویس‌دهنده داده‌ها. لطفاً دوباره تلاش کنید.</p>
                </div>
            )}

            {/* ── جدول ─────────────────────────────────────────────────── */}
            {!error && <CoursesTable initialCourses={courses} initialMeta={meta} />}
        </div>
    );
}
