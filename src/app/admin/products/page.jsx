/**
 * @file src/app/admin/products/page.jsx
 * @description صفحه لیست محصولات در پنل ادمین – Server Component
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAdminProducts } from '@/lib/admin/adminProductsApi';
import ProductsTable from '@/components/admin/Products/ProductsTable';
import AdminButton from '@/components/admin/Shared/AdminButton';
import { Plus } from 'lucide-react';
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
                    <AdminButton href="/admin/products/new" variant="primary">
                        <Plus size={16} />
                        محصول جدید
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
            {!error && <ProductsTable initialProducts={products} initialMeta={meta} />}
        </div>
    );
}
