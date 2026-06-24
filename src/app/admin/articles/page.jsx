/**
 * @file src/app/admin/articles/page.jsx
 * @description صفحه لیست مقالات در پنل ادمین – Server Component
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAdminArticles } from '@/lib/adminApi';
import ArticlesTable from '@/components/admin/Articles/ArticlesTable';
import Link from 'next/link';
import styles from '../orders/orders.module.scss'; // using shared layout styles usually

export const metadata = {
    title: 'مدیریت مقالات | پنل ادمین',
    description: 'مدیریت مقالات و وبلاگ سایت',
};

export default async function AdminArticlesPage() {
    const session = await getServerSession(authOptions);
    const jwt = session?.user?.jwt;

    const { articles, meta, error } = await getAdminArticles(jwt, { pageSize: 100 });

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
                    <Link
                        href="/admin/articles/new"
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
                        ➕ مقاله جدید
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
            {!error && <ArticlesTable initialArticles={articles} />}
        </div>
    );
}
