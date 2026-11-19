/**
 * @file src/app/admin/coupons/page.jsx
 * @description صفحه مدیریت کدهای تخفیف در پنل ادمین – Server Component
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAdminCoupons } from '@/lib/admin/adminCouponsApi';
import CouponsTable from '@/components/admin/Coupons/CouponsTable';
import Link from 'next/link';
import { Plus, Ticket } from 'lucide-react';
import styles from '../orders/orders.module.scss';

export const metadata = {
    title: 'مدیریت کدهای تخفیف | پنل ادمین',
    description: 'مدیریت، ایجاد و بررسی کدهای تخفیف فروشگاه',
    robots: { index: false, follow: false },
};

export default async function AdminCouponsPage() {
    const session = await getServerSession(authOptions);
    const jwt = session?.user?.jwt;

    const { coupons, meta, error } = await getAdminCoupons(jwt, { page: 1, pageSize: 50 });

    return (
        <div className={styles.page}>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <header className={styles.page__header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                        style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            background: 'rgba(255, 209, 102, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffd166',
                        }}
                    >
                        <Ticket size={20} />
                    </div>
                    <div>
                        <h1 className={styles.page__title}>مدیریت کدهای تخفیف</h1>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                            ایجاد، فعال‌سازی و کنترل سقف مصرف کدهای تخفیف
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {meta?.pagination && (
                        <span className={styles.page__count}>
                            {new Intl.NumberFormat('fa-IR').format(meta.pagination.total)} کد تخفیف
                        </span>
                    )}
                    <Link
                        href="/admin/coupons/new"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.6rem 1.25rem',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #ffd166, #f59e0b)',
                            color: '#0f172a',
                            fontWeight: 'bold',
                            fontSize: '0.875rem',
                            textDecoration: 'none',
                            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
                            transition: 'opacity 0.2s',
                        }}
                    >
                        <Plus size={16} />
                        کد تخفیف جدید
                    </Link>
                </div>
            </header>

            {/* ── Error State ────────────────────────────────────────────── */}
            {error && (
                <div className={styles.page__error}>
                    <span>⚠️</span>
                    <p>اتصال به سرور جهت دریافت کدهای تخفیف ناموفق بود. لطفاً مطمئن شوید Strapi در حال اجراست.</p>
                </div>
            )}

            {/* ── Table with Lazy Loading ─────────────────────────────────── */}
            {!error && <CouponsTable initialCoupons={coupons} initialMeta={meta} />}
        </div>
    );
}
