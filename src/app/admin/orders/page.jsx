/**
 * @file src/app/admin/orders/page.jsx
 * @description صفحه مدیریت سفارش‌ها – Server Component
 *
 * 📌 این صفحه فقط داده را فچ می‌کند و به OrdersTable (Client Component) پاس می‌دهد.
 * Authorization توسط layout.jsx والد انجام شده است.
 *
 * 🔄 جریان:
 *   getServerSession → jwt → getOrders(jwt) → نرمال‌سازی → OrdersTable
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getOrders, getOrdersStats } from '@/lib/admin/adminOrdersApi';
import OrdersTable from '@/components/admin/Orders/OrdersTable';
import Link from 'next/link';
import styles from './orders.module.scss';

export const metadata = {
    title: 'مدیریت سفارش‌ها',
    robots: { index: false, follow: false },
};

export default async function AdminOrdersPage() {
    const session = await getServerSession(authOptions);
    const jwt = session?.user?.jwt;

    // ── واکشی اولیه سفارش‌ها از Strapi (صفحه اول) و آمار وضعیت‌ها ────────
    const [{ orders, meta, error }, statsData] = await Promise.all([
        getOrders(jwt, { start: 0, limit: 20 }),
        getOrdersStats(jwt),
    ]);

    const totalCount = meta?.pagination?.total ?? statsData?.totalOrders ?? (orders?.length || 0);

    return (
        <div className={styles.page}>
            {/* ── سرصفحه ──────────────────────────────────────────────── */}
            <header className={styles.page__header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h1 className={styles.page__title}>مدیریت سفارش‌ها</h1>
                    {totalCount > 0 && (
                        <span className={styles.page__count}>
                            {new Intl.NumberFormat('fa-IR').format(totalCount)} سفارش
                        </span>
                    )}
                </div>
                <Link
                    href="/admin/orders/new"
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
                    ➕ ثبت دستی سفارش و دوره
                </Link>
            </header>

            {/* ── خطای عدم اتصال ──────────────────────────────────────── */}
            {error && (
                <div className={styles.page__error}>
                    <span>⚠️</span>
                    <p>اتصال به سرور ناموفق بود. لطفاً مطمئن شوید Strapi در حال اجراست.</p>
                </div>
            )}

            {/* ── جدول سفارش‌ها همراه با Lazy Load و مرتب‌سازی سروری ─────── */}
            {!error && (
                <OrdersTable
                    initialOrders={orders}
                    initialMeta={meta}
                    initialStats={statsData?.statusCounts || null}
                    settlementStats={statsData}
                />
            )}
        </div>
    );
}
