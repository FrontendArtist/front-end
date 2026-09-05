/**
 * @file src/app/admin/articles/new/page.jsx
 * @description صفحه ایجاد مقاله جدید
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAdminArticlesCategories } from '@/lib/admin/adminArticlesApi';
import { getAdminTags, getAdminProductOptions } from '@/lib/admin/adminProductsApi';
import { getAdminCourses } from '@/lib/admin/adminCoursesApi';
import ArticleForm from '@/components/admin/Articles/ArticleForm';
import Link from 'next/link';
import styles from '../../orders/orders.module.scss'; // using shared layout styles usually

export const metadata = {
    title: 'مقاله جدید',
    robots: { index: false, follow: false },
};

export default async function NewArticlePage() {
    const session = await getServerSession(authOptions);
    const jwt = session?.user?.jwt;

    const [categories, tags, courses, products] = await Promise.all([
        getAdminArticlesCategories(jwt),
        getAdminTags(jwt),
        getAdminCourses(jwt),
        getAdminProductOptions(jwt),
    ]);

    return (
        <div className={styles.page}>
            <header className={styles.page__header}>
                <div>
                    <h1 className={styles.page__title}>ایجاد مقاله جدید</h1>
                    <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-primary)' }}>
                        اطلاعات مقاله را با دقت وارد کنید و محتوای آن ویرایشگر قالب‌بندی کنید.
                    </p>
                </div>
                <Link
                    href="/admin/articles"
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

            <ArticleForm
                availableCategories={categories}
                availableTags={tags}
                availableCourses={courses}
                availableProducts={products}
            />
        </div>
    );
}
