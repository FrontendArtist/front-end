/**
 * @file src/app/admin/orders/settlements/page.jsx
 * @description تسویه و آرشیو سفارش‌های بای‌مانی (I11-S)
 *
 * گارد ورود: Purchases.View در ROUTE_PERMISSIONS؛ دکمهٔ بستن فقط با Purchases.Settle.
 * تسویهٔ سفارش‌های قدیمی استرپی جداست و در این صفحه نمی‌آید.
 */

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import CourseOrderSettlements from '@/components/admin/Orders/Settlements/CourseOrderSettlements';
import styles from '../orders.module.scss';

export const metadata = {
    title: 'تسویهٔ سفارش‌های بای‌مانی',
    robots: { index: false, follow: false },
};

export default function AdminCourseOrderSettlementsPage() {
    return (
        <div className={styles.page}>
            <header className={styles.page__header}>
                <h1 className={styles.page__title}>تسویه و آرشیو سفارش‌های بای‌مانی</h1>
                <Link href="/admin/orders" className={styles.backLink}>
                    <ArrowRight size={16} aria-hidden="true" />
                    بازگشت به سفارش‌ها
                </Link>
            </header>
            <CourseOrderSettlements />
        </div>
    );
}
