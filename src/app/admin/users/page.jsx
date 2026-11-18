import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUsers } from '@/lib/admin/adminUsersApi';
import UsersTable from '@/components/admin/Users/UsersTable';
import styles from '../orders/orders.module.scss';

export const metadata = {
    title: 'مدیریت کاربران',
    robots: { index: false, follow: false },
};

export default async function AdminUsersPage() {
    const session = await getServerSession(authOptions);
    const jwt = session?.user?.jwt;

    // ── واکشی اولیه کاربران ──────────────────────────────────────────
    const { users, meta, error } = await getUsers(jwt, { pageSize: 50 });

    return (
        <div className={styles.page}>
            <header className={styles.page__header}>
                <h1 className={styles.page__title}>مدیریت کاربران</h1>
                {meta?.pagination && (
                    <span className={styles.page__count}>
                        {new Intl.NumberFormat('fa-IR').format(meta.pagination.total)} کاربر
                    </span>
                )}
            </header>

            {error ? (
                <div className={styles.page__error} role="alert">
                    <span>⚠️</span>
                    <p>خطا در دریافت لیست کاربران از سرویس‌دهنده داده‌ها. لطفاً دوباره تلاش کنید.</p>
                </div>
            ) : (
                <UsersTable initialUsers={users} initialMeta={meta} />
            )}
        </div>
    );
}
