/**
 * @file src/app/admin/page.jsx
 * @description Admin Dashboard – Default landing page after /admin
 *
 * This is a Server Component. Authorization is already handled by layout.jsx,
 * so this page can safely assume the viewer is an authenticated administrator.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import styles from './page.module.scss';

export const metadata = {
    title: 'داشبورد | پنل ادمین',
    description: 'پنل مدیریت سایت',
};

export default async function AdminDashboardPage() {
    const session = await getServerSession(authOptions);

    return (
        <div className={styles.page}>
            <h1 className={styles.page__title}>
                خوش آمدید، {session?.user?.name || 'مدیر'}! 👋
            </h1>
            <p className={styles.page__subtitle}>
                از این پنل می‌توانید سفارش‌ها، کاربران و محصولات سایت را مدیریت کنید.
            </p>

            {/* Quick-Stats placeholder grid */}
            <div className={styles.stats_grid}>
                {[
                    { label: 'سفارش‌های امروز', value: '—', color: '#F6D982' },
                    { label: 'کاربران فعال', value: '—', color: '#82d9f6' },
                    { label: 'محصولات', value: '—', color: '#82f6a3' },
                    { label: 'درآمد ماه جاری', value: '—', color: '#f682d6' },
                ].map((stat) => (
                    <div key={stat.label} className={styles.stat_card}>
                        <span className={styles.stat_card__value} style={{ color: stat.color }}>
                            {stat.value}
                        </span>
                        <span className={styles.stat_card__label}>{stat.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
