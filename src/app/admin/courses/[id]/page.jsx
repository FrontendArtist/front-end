/**
 * @file src/app/admin/courses/[id]/page.jsx
 * @description صفحه ویرایش دوره – Server Component
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAdminCourseById } from '@/lib/adminApi';
import CourseForm from '@/components/admin/Courses/CourseForm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from '../../orders/orders.module.scss';

export const metadata = {
    title: 'ویرایش دوره | پنل ادمین',
};

export default async function EditCoursePage({ params }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const jwt = session?.user?.jwt;

    const { course, error } = await getAdminCourseById(id, jwt);

    if (error || !course) {
        return notFound();
    }

    return (
        <div className={styles.page}>
            <header className={styles.page__header}>
                <div>
                    <h1 className={styles.page__title}>
                        ویرایش «{course.title}»
                    </h1>
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

            <CourseForm course={course} />
        </div>
    );
}
