/**
 * @file src/app/admin/page.jsx
 * @description صفحه اصلی داشبورد ادمین – Server Component
 *
 * 📌 نکته مهم معماری:
 *   Authorization قبلاً در layout.jsx انجام شده است.
 *   این صفحه با اطمینان کامل می‌داند که بیننده یک administrator معتبر است.
 *
 * 🔄 جریان داده (Data Flow):
 *   1. session از NextAuth روی سرور واکشی می‌شود.
 *   2. JWT توکن ادمین از session.user.jwt استخراج می‌شود.
 *   3. توابع adminApi با این JWT به Strapi درخواست می‌فرستند.
 *   4. داده‌های فرمت‌شده به کامپوننت‌های StatsCard پاس داده می‌شوند.
 *
 * 🛡️ Graceful Degradation:
 *   اگر Strapi غیرفعال باشد یا پرمیشن‌ها درست نباشند، adminApi مقدار null
 *   برمی‌گرداند. در این حالت StatsCard با isError=true رندر می‌شود و اپ
 *   کرش نمی‌کند.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
    getTotalProductsCount,
    getTotalUsersCount,
    getOrdersStats,
} from '@/lib/adminApi';
import StatsCard from '@/components/admin/StatsCard/StatsCard';
import styles from './page.module.scss';

export const metadata = {
    title: 'داشبورد | پنل ادمین',
    description: 'پنل مدیریت سایت – آمار کلی',
};

/**
 * فرمت‌کردن عدد به صورت فارسی با جداکننده هزارگان و پسوند تومان
 * مثال: 1200000 → '۱٬۲۰۰٬۰۰۰ تومان'
 *
 * @param {number|null} amount
 * @returns {string}
 */
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
}

/**
 * فرمت‌کردن عدد ساده با جداکننده هزارگان فارسی
 *
 * @param {number|null} count
 * @returns {string}
 */
function formatCount(count) {
    if (count === null || count === undefined) return '—';
    return new Intl.NumberFormat('fa-IR').format(count);
}

export default async function AdminDashboardPage() {
    // ─────────────────────────────────────────────────────────────────
    // STEP 1: دریافت session – JWT ادمین برای فراخوانی‌های Strapi
    // layout.jsx از قبل بررسی کرده که این session معتبر است،
    // پس نیازی به guard مجدد نیست.
    // ─────────────────────────────────────────────────────────────────
    const session = await getServerSession(authOptions);
    const jwt = session?.user?.jwt;

    // ─────────────────────────────────────────────────────────────────
    // STEP 2: واکشی موازی همه آمارها از Strapi
    //
    // از Promise.allSettled به جای Promise.all استفاده می‌کنیم:
    //   • Promise.all: اگر یکی fail شود → کل صفحه خطا
    //   • Promise.allSettled: هر درخواست مستقل است → Graceful Degradation
    //
    // ترتیب اجرا موازی است، سریع‌تر از await های متوالی.
    // ─────────────────────────────────────────────────────────────────
    const [productsResult, usersResult, ordersResult] = await Promise.allSettled([
        getTotalProductsCount(jwt),
        getTotalUsersCount(jwt),
        getOrdersStats(jwt),
    ]);

    // استخراج مقادیر – اگر Promise رد شد یا null برگشت، null نگه می‌داریم
    const totalProducts =
        productsResult.status === 'fulfilled' ? productsResult.value : null;

    const totalUsers =
        usersResult.status === 'fulfilled' ? usersResult.value : null;

    const ordersStats =
        ordersResult.status === 'fulfilled' ? ordersResult.value : null;

    const totalOrders = ordersStats?.totalOrders ?? null;
    const totalRevenue = ordersStats?.totalRevenue ?? null;

    // ─────────────────────────────────────────────────────────────────
    // STEP 3: تعریف کارت‌ها با داده‌های واقعی یا null
    // ─────────────────────────────────────────────────────────────────
    const statsCards = [
        {
            id: 'orders',
            title: 'کل سفارش‌ها',
            value: formatCount(totalOrders),
            icon: '🛒',
            accentColor: 'var(--color-text-primary)', // gold – رنگ اصلی پروژه
            subtitle: 'از ابتدای سیستم',
            isError: totalOrders === null,
        },
        {
            id: 'revenue',
            title: 'درآمد کل',
            value: formatCurrency(totalRevenue),
            icon: '💰',
            accentColor: 'var(--color-success)', // سبز برای درآمد
            subtitle: 'مجموع سفارش‌های ثبت‌شده',
            isError: totalRevenue === null,
        },
        {
            id: 'users',
            title: 'کاربران ثبت‌نام‌شده',
            value: formatCount(totalUsers),
            icon: '👥',
            accentColor: 'var(--color-blue-light)', // آبی برای کاربران
            subtitle: 'کل حساب‌های فعال',
            isError: totalUsers === null,
        },
        {
            id: 'products',
            title: 'محصولات',
            value: formatCount(totalProducts),
            icon: '📦',
            accentColor: 'var(--color-error)', // بنفش برای محصولات (تغییر به ارور/قرمز برای تم)
            subtitle: 'موجود در فروشگاه',
            isError: totalProducts === null,
        },
    ];

    return (
        <div className={styles.page}>

            {/* ── سرصفحه خوش‌آمدگویی ────────────────────────────────── */}
            <header className={styles.page__header}>
                <h1 className={styles.page__title}>
                    خوش آمدید،{' '}
                    <span className={styles.page__title_name}>
                        {session?.user?.name || 'مدیر'}
                    </span>{' '}
                    👋
                </h1>
                <p className={styles.page__subtitle}>
                    در اینجا خلاصه‌ای از وضعیت فروشگاه را مشاهده می‌کنید.
                </p>
            </header>

            {/* ── بخش عنوان آمار ─────────────────────────────────────── */}
            <section aria-labelledby="stats-heading">
                <h2 id="stats-heading" className={styles.section__title}>
                    آمار کلی سیستم
                </h2>

                {/*
         * گرید ۳ ستونه روی دسکتاپ، ۲ ستونه روی تبلت، ۱ ستونه روی موبایل.
         * تعریف شده در page.module.scss.
         */}
                <div className={styles.stats_grid}>
                    {statsCards.map((card) => (
                        <StatsCard
                            key={card.id}
                            title={card.title}
                            value={card.value}
                            icon={card.icon}
                            accentColor={card.accentColor}
                            subtitle={card.subtitle}
                            isError={card.isError}
                        />
                    ))}
                </div>
            </section>

        </div>
    );
}
