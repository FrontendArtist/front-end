/**
 * @file src/app/admin/courses/new/page.jsx
 * @description صفحه ایجاد دوره جدید – Server Component
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import CourseForm from '@/components/admin/Courses/CourseForm';
import Link from 'next/link';
import styles from '../../orders/orders.module.scss';

export const metadata = {
    title: 'دوره جدید',
    robots: { index: false, follow: false },
};

export default async function NewCoursePage() {
    await getServerSession(authOptions); // اطمینان از auth (layout.jsx مدیریت می‌کند)

    return (
        <div className={styles.page}>
            <header className={styles.page__header}>
                <div>
                    <h1 className={styles.page__title}>ایجاد دوره جدید</h1>
                    <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-primary)' }}>
                        اطلاعات دوره را وارد کنید، سرفصل‌ها و جلسات را تعریف کنید.
                    </p>
                </div>
                <Link
                    href="/admin/courses"
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid color-mix(in srgb, var(--color-black) var(--op-20), transparent)',
                        color: 'var(--color-text-primary)',
                        textDecoration: 'none',
                        fontSize: 'var(--font-sm)',
                        transition: 'all 0.2s',
                    }}
                >
                    بازگشت به لیست
                </Link>
            </header>

            <CourseForm />
        </div>
    );
}
