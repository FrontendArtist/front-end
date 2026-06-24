/**
 * @file src/app/admin/articles/new/page.jsx
 * @description صفحه ایجاد مقاله جدید
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAdminArticlesCategories, getAdminTags } from '@/lib/adminApi';
import ArticleForm from '@/components/admin/Articles/ArticleForm';
import Link from 'next/link';
import styles from '../../orders/orders.module.scss'; // using shared layout styles usually

export const metadata = {
    title: 'مقاله جدید | پنل ادمین',
};

export default async function NewArticlePage() {
    const session = await getServerSession(authOptions);
    const jwt = session?.user?.jwt;

    const [categories, tags] = await Promise.all([
        getAdminArticlesCategories(jwt),
        getAdminTags(jwt),
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
                        border: '1px solid var(--color-black-op-20)',
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
            />
        </div>
    );
}
