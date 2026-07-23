/**
 * @file src/app/mentor/layout.jsx
 * @description Mentor Dashboard Layout — Server Component (Auth Guard)
 *
 * 🔐 Authorization Strategy:
 * این یک Server Component است، یعنی بررسی سشن قبل از ارسال هر HTML
 * به مرورگر، روی سرور انجام می‌شود. این امن‌ترین رویکرد است زیرا:
 *   1. بررسی نقش با غیرفعال کردن JavaScript از سمت کلاینت دور زده نمی‌شود.
 *   2. محتوای مسیر هرگز برای کاربران غیرمجاز بسته‌بندی و ارسال نمی‌شود.
 *   3. `redirect()` از next/navigation یک redirect HTTP سمت سرور (307) ایجاد می‌کند.
 *
 * 🧩 Role Check:
 * بررسی `session?.user?.role?.type === 'administrator'` — همان الگوی admin/layout.jsx
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import styles from './mentor.module.scss';

/**
 * MentorLayout — Root layout برای تمام مسیرهای زیر /mentor/*
 *
 * Next.js این layout را برای تمام صفحات زیر /app/mentor/ به صورت خودکار اعمال می‌کند.
 * @param {{ children: React.ReactNode }} props
 */
export default async function MentorLayout({ children }) {
    // ─── STEP 1: دریافت سشن از سرور ─────────────────────────────────────────
    const session = await getServerSession(authOptions);

    // ─── STEP 2: Auth Gate ───────────────────────────────────────────────────
    // شرایط رد شدن:
    //   • !session          → کاربر اصلاً لاگین نکرده
    //   • !session.user     → سشن موجود است اما آبجکت user ندارد (edge case)
    //   • role?.type !== 'administrator' → کاربر لاگین کرده اما ادمین نیست
    if (!session || !session.user || session.user.role?.type !== 'administrator') {
        /**
         * `redirect('/')` یک خطای خاص Next.js پرتاب می‌کند که rendering را متوقف
         * و یک 307 Redirect صادر می‌کند. نباید در try/catch پیچیده شود.
         */
        redirect('/');
    }

    // ─── STEP 3: Authorized — رندر داشبورد استاد ────────────────────────────
    return (
        <div className={styles.mentorDashboard}>
            {children}
        </div>
    );
}
