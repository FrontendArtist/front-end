/**
 * @file src/app/admin/articles/page.jsx
 * @description صفحه لیست مقالات در پنل ادمین – Server Component
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAdminArticles } from '@/lib/admin/adminArticlesApi';
import ArticlesTable from '@/components/admin/Articles/ArticlesTable';
import AdminButton from '@/components/admin/Shared/AdminButton';
import { Plus } from 'lucide-react';
import styles from '../orders/orders.module.scss'; // using shared layout styles usually

export const metadata = {
    title: 'مدیریت مقالات',
    description: 'مدیریت مقالات و وبلاگ سایت',
    robots: { index: false, follow: false },
};

export default async function AdminArticlesPage() {
    const session = await getServerSession(authOptions);
    const jwt = session?.user?.jwt;

    const { articles, meta, error } = await getAdminArticles(jwt, { page: 1, pageSize: 50 });

    return (
        <div className={styles.page}>
            {/* ── سرصفحه ───────────────────────────────────────────────── */}
            <header className={styles.page__header}>
                <h1 className={styles.page__title}>مدیریت مقالات</h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {meta?.pagination && (
                        <span className={styles.page__count}>
                            {new Intl.NumberFormat('fa-IR').format(meta.pagination.total)} مقاله
                        </span>
                    )}
                    <AdminButton href="/admin/articles/new" variant="primary">
                        <Plus size={16} />
                        مقاله جدید
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

            {/* ── جدول همراه با Lazy Loading ───────────────────────────── */}
            {!error && <ArticlesTable initialArticles={articles} initialMeta={meta} />}
        </div>
    );
}
