/**
 * @file src/app/admin/noor-withdrawals/page.jsx
 * @description خروج نور کاربران توسط ادمین (I11-W، D09)
 *
 * گارد ورود: Noor.Withdraw در ROUTE_PERMISSIONS؛ اقدام‌ها هم با <Can> محافظت می‌شوند.
 */

import NoorWithdrawalsList from '@/components/admin/NoorWithdrawals/NoorWithdrawalsList';
import styles from '../orders/orders.module.scss';

export const metadata = {
    title: 'خروج نور',
    robots: { index: false, follow: false },
};

export default function AdminNoorWithdrawalsPage() {
    return (
        <div className={styles.page}>
            <header className={styles.page__header}>
                <h1 className={styles.page__title}>خروج نور کاربران</h1>
            </header>
            <NoorWithdrawalsList />
        </div>
    );
}
