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
import { getOrders } from '@/lib/adminApi';
import OrdersTable from '@/components/admin/Orders/OrdersTable';
import styles from './orders.module.scss';

export const metadata = {
    title: 'مدیریت سفارش‌ها | پنل ادمین',
};

export default async function AdminOrdersPage() {
    const session = await getServerSession(authOptions);
    const jwt = session?.user?.jwt;

    // ── واکشی سفارش‌ها از Strapi ────────────────────────────────────
    const { orders, meta, error } = await getOrders(jwt, { pageSize: 50 });

    return (
        <div className={styles.page}>
            {/* ── سرصفحه ──────────────────────────────────────────────── */}
            <header className={styles.page__header}>
                <h1 className={styles.page__title}>مدیریت سفارش‌ها</h1>
                {meta?.pagination && (
                    <span className={styles.page__count}>
                        {new Intl.NumberFormat('fa-IR').format(meta.pagination.total)} سفارش
                    </span>
                )}
            </header>

            {/* ── خطای عدم اتصال ──────────────────────────────────────── */}
            {error && (
                <div className={styles.page__error}>
                    <span>⚠️</span>
                    <p>اتصال به سرور ناموفق بود. لطفاً مطمئن شوید Strapi در حال اجراست.</p>
                </div>
            )}

            {/* ── جدول سفارش‌ها ────────────────────────────────────────── */}
            {!error && (
                <OrdersTable initialOrders={orders} />
            )}
        </div>
    );
}
