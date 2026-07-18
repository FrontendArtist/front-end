/**
 * @file src/app/admin/articles/[id]/page.jsx
 * @description صفحه ویرایش مقاله
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAdminArticleById, getAdminArticlesCategories, getAdminTags } from '@/lib/adminApi';
import ArticleForm from '@/components/admin/Articles/ArticleForm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from '../../orders/orders.module.scss'; // Using shared layout styles

export const metadata = {
    title: 'ویرایش مقاله | پنل ادمین',
};

export default async function EditArticlePage({ params }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const jwt = session?.user?.jwt;

    // Fetch the article + all options concurrently
    const [articleData, categories, tags] = await Promise.all([
        getAdminArticleById(id, jwt),
        getAdminArticlesCategories(jwt),
        getAdminTags(jwt),
    ]);

    if (articleData.error || !articleData.article) {
        if (process.env.NODE_ENV === 'development') {
            console.error('[EditArticlePage] failed to fetch article:', id);
        }
        return notFound();
    }

    return (
        <div className={styles.page}>
            <header className={styles.page__header}>
                <div>
                    <h1 className={styles.page__title}>
                        ویرایش «{articleData.article.title}»
                    </h1>
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
                initialData={articleData.article}
                availableCategories={categories}
                availableTags={tags}
            />
        </div>
    );
}
