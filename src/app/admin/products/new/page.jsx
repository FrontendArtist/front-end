/**
 * @file src/app/admin/products/new/page.jsx
 * @description صفحه ایجاد محصول جدید – Server Component
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAdminCategories, getAdminTags } from '@/lib/adminApi';
import ProductForm from '@/components/admin/Products/ProductForm';
import Link from 'next/link';
import styles from '../../orders/orders.module.scss';

export const metadata = {
    title: 'محصول جدید | پنل ادمین',
};

export default async function AdminNewProductPage() {
    const session = await getServerSession(authOptions);
    const jwt = session?.user?.jwt;

    // واکشی موازی دسته‌بندی‌ها و تگ‌ها
    const [categories, tags] = await Promise.all([
        getAdminCategories(jwt),
        getAdminTags(jwt),
    ]);

    return (
        <div className={styles.page}>
            {/* ── سرصفحه ───────────────────────────────────────────────── */}
            <header className={styles.page__header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Link
                        href="/admin/products"
                        style={{
                            color: 'var(--color-text-primary)',
                            opacity: 0.7,
                            textDecoration: 'none',
                            fontSize: 'var(--font-sm)',
                        }}
                    >
                        ← بازگشت به لیست
                    </Link>
                    <h1 className={styles.page__title} style={{ margin: 0 }}>
                        محصول جدید
                    </h1>
                </div>
            </header>

            {/* ── فرم ──────────────────────────────────────────────────── */}
            <ProductForm categories={categories} tags={tags} />
        </div>
    );
}
