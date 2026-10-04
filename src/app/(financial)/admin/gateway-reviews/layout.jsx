import Link from 'next/link';
import { getGatewayReviewAccess } from '@/lib/admin/gatewayReviewAccess';
import { isUserAdmin } from '@/lib/auth';
import AdminSidebar from '@/components/admin/Sidebar/AdminSidebar';
import styles from '@/app/admin/admin.module.scss';

export default async function FinancialReviewLayout({ children }) {
    const { session, status } = await getGatewayReviewAccess();
    if (status !== 200) return <main dir="rtl"><p>برای مشاهده پرونده‌ها، ورود و مجوز رسیدگی مالی بای‌مانی لازم است.</p><Link href="/">بازگشت</Link></main>;
    return <div className={styles.dashboard}>
        <AdminSidebar user={session.user} financialOnly={!isUserAdmin(session.user)} />
        <main className={styles.dashboard__main}>{children}</main>
    </div>;
}
