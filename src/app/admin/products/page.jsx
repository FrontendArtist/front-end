/**
 * @file src/app/admin/products/page.jsx
 * @description صفحه لیست محصولات در پنل ادمین – Server Component
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAdminProducts } from '@/lib/admin/adminProductsApi';
import ProductsTable from '@/components/admin/Products/ProductsTable';
import Link from 'next/link';
import styles from '../orders/orders.module.scss';

export const metadata = {
    title: 'مدیریت محصولات',
    description: 'مدیریت لیست محصولات فروشگاه',
    robots: { index: false, follow: false },
};

export default async function AdminProductsPage() {
    const session = await getServerSession(authOptions);
    const jwt = session?.user?.jwt;

    const { products, meta, error } = await getAdminProducts(jwt, { page: 1, pageSize: 50 });

    return (
        <div className={styles.page}>
            {/* ── سرصفحه ───────────────────────────────────────────────── */}
            <header className={styles.page__header}>
                <h1 className={styles.page__title}>مدیریت محصولات</h1>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {meta?.pagination && (
                        <span className={styles.page__count}>
                            {new Intl.NumberFormat('fa-IR').format(meta.pagination.total)} محصول
                        </span>
                    )}
                    <Link
                        href="/admin/products/new"
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
                        ➕ محصول جدید
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

            {/* ── جدول همراه با Lazy Loading ───────────────────────────── */}
            {!error && <ProductsTable initialProducts={products} initialMeta={meta} />}
        </div>
    );
}
