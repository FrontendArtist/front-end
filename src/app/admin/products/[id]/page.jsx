/**
 * @file src/app/admin/products/[id]/page.jsx
 * @description صفحه ویرایش محصول – Server Component
 *
 * پارامتر `id` در اینجا همان documentId محصول در Strapi v5 است.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAdminProductById, getAdminCategories, getAdminTags } from '@/lib/adminApi';
import ProductForm from '@/components/admin/Products/ProductForm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import styles from '../../orders/orders.module.scss';

export async function generateMetadata({ params }) {
    const { id } = await params;
    return {
        title: `ویرایش محصول (${id}) | پنل ادمین`,
    };
}

export default async function AdminEditProductPage({ params }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const jwt = session?.user?.jwt;

    // واکشی موازی: محصول + دسته‌ها + تگ‌ها
    const [productResult, categories, tags] = await Promise.all([
        getAdminProductById(id, jwt),
        getAdminCategories(jwt),
        getAdminTags(jwt),
    ]);

    if (productResult.error || !productResult.product) {
        notFound();
    }

    const { product } = productResult;

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
                        ویرایش: {product.title}
                    </h1>
                </div>

                <span className={styles.page__count}>
                    {product.publishedAt ? '✅ منتشر شده' : '📝 پیش‌نویس'}
                </span>
            </header>

            {/* ── فرم ──────────────────────────────────────────────────── */}
            <ProductForm product={product} categories={categories} tags={tags} />
        </div>
    );
}
