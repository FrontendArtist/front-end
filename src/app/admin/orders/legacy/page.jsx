/**
 * @file src/app/admin/orders/legacy/page.jsx
 * @description سفارش‌های قدیمی استرپی (تومانی) – Server Component (ADMIN-ORDERS-REDESIGN)
 *
 * همان رفتار قبلی سفارش‌های استرپی: تأیید فیش، تغییر وضعیت، حذف گروهی، بستن دوره و آرشیو؛ بدون منطق بای‌مانی.
 * پس از بسته‌شدن همهٔ سفارش‌های باز، فقط‌خواندنی یا حذف از منو (تصمیم بعدی).
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getOrders, getStrapiOrdersStats } from '@/lib/admin/adminOrdersApi';
import LegacyOrdersTable from '@/components/admin/Orders/LegacyOrdersTable';
import styles from '../orders.module.scss';

export const metadata = {
    title: 'سفارش‌های قدیمی',
    robots: { index: false, follow: false },
};

export default async function AdminLegacyOrdersPage() {
    const session = await getServerSession(authOptions);
    const jwt = session?.user?.jwt;

    const [{ orders, meta, error }, stats] = await Promise.all([
        getOrders(jwt, { start: 0, limit: 20, source: 'strapi' }),
        getStrapiOrdersStats(jwt),
    ]);
    const totalCount = meta?.pagination?.total ?? stats?.totalOrders ?? (orders?.length || 0);

    return (
        <div className={styles.page}>
            <header className={styles.page__header}>
                <div>
                    <div className={styles.page__titleRow}>
                        <h1 className={styles.page__title}>سفارش‌های قدیمی</h1>
                        {totalCount > 0 && (
                            <span className={styles.page__count}>
                                {new Intl.NumberFormat('fa-IR').format(totalCount)} سفارش
                            </span>
                        )}
                    </div>
                    <p className={styles.page__subtitle}>سفارش‌های تومانی پیش از بای‌مانی (کارت‌به‌کارت، آنلاین، رایگان)</p>
                </div>
            </header>

            {error && (
                <div className={styles.page__error}>
                    <span>⚠️</span>
                    <p>اتصال به سرور ناموفق بود. لطفاً مطمئن شوید Strapi در حال اجراست.</p>
                </div>
            )}

            {!error && (
                <LegacyOrdersTable
                    initialOrders={orders}
                    initialMeta={meta}
                    initialStats={stats?.statusCounts || null}
                    settlementStats={stats}
                />
            )}
        </div>
    );
}
