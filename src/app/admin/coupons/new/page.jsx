/**
 * @file src/app/admin/coupons/new/page.jsx
 * @description صفحه ایجاد کد تخفیف جدید – Server Component
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAdminProducts } from '@/lib/admin/adminProductsApi';
import { getAdminCoursesAll } from '@/lib/admin/adminCoursesApi';
import CouponForm from '@/components/admin/Coupons/CouponForm';
import Link from 'next/link';
import { ArrowRight, TicketPlus } from 'lucide-react';
import styles from '../../orders/orders.module.scss';

export const metadata = {
    title: 'ایجاد کد تخفیف جدید | پنل ادمین',
    robots: { index: false, follow: false },
};

export default async function AdminNewCouponPage() {
    const session = await getServerSession(authOptions);
    const jwt = session?.user?.jwt;

    // واکشی موازی لیست محصولات و دوره‌ها جهت انتخاب در فرم
    const [productsRes, coursesRes] = await Promise.all([
        getAdminProducts(jwt, { pageSize: 200 }),
        getAdminCoursesAll(jwt, { pageSize: 200 }),
    ]);

    const allProducts = productsRes?.products || [];
    const allCourses = coursesRes?.courses || [];

    return (
        <div className={styles.page}>
            {/* ── سرصفحه ───────────────────────────────────────────────── */}
            <header className={styles.page__header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <Link
                        href="/admin/coupons"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'rgba(255,255,255,0.7)',
                            textDecoration: 'none',
                            fontSize: '0.85rem',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: 'rgba(255,255,255,0.05)',
                        }}
                    >
                        <ArrowRight size={14} />
                        بازگشت به لیست
                    </Link>
                    <h1 className={styles.page__title} style={{ margin: 0, fontSize: '1.25rem' }}>
                        ایجاد کد تخفیف جدید
                    </h1>
                </div>
            </header>

            {/* ── فرم ──────────────────────────────────────────────────── */}
            <CouponForm
                allProducts={allProducts}
                allCourses={allCourses}
                isEdit={false}
            />
        </div>
    );
}
