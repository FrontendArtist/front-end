'use client';

/**
 * @file src/components/admin/Sidebar/AdminSidebar.jsx
 * @description Admin Dashboard Sidebar – Client Component
 *
 * 🎯 Why Client Component?
 * This component uses usePathname() from 'next/navigation', which is a React Hook
 * and therefore requires client-side rendering. Server Components cannot use hooks.
 *
 * 🧩 Features:
 *   - Active link highlighting based on the current URL pathname
 *   - Smooth hover & active state transitions
 *   - Lucide icons for a clean, modern icon set
 *   - User profile mini-card at the top of the sidebar
 *   - Responsive: collapses to icon-only on tablet/mobile
 */

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard,  // Dashboard overview icon
    ShoppingCart,     // Orders icon
    Users,            // Users management icon
    Package,          // Products icon
    FileText,         // Articles icon
    LogOut,           // Sign out icon
    UserCircle,       // Profile avatar fallback icon
} from 'lucide-react';
import { signOut } from 'next-auth/react';

import styles from './AdminSidebar.module.scss';

/**
 * Navigation link definitions.
 * Each entry maps to an admin route and carries a display label + Lucide icon.
 * Adding a new section only requires adding an item here – no JSX changes needed.
 *
 * @type {{ href: string, label: string, icon: React.ComponentType }[]}
 */
const NAV_LINKS = [
    { href: '/admin', label: 'داشبورد', icon: LayoutDashboard },
    { href: '/admin/orders', label: 'سفارش‌ها', icon: ShoppingCart },
    { href: '/admin/users', label: 'کاربران', icon: Users },
    { href: '/admin/products', label: 'محصولات', icon: Package },
    { href: '/admin/articles', label: 'مقالات', icon: FileText },
];

/**
 * AdminSidebar Component
 *
 * @param {{ user: { name?: string, email?: string, image?: string } }} props
 *   - `user` is forwarded from the server-side session in layout.jsx.
 *     It is safe to use here because layout.jsx already verified admin access
 *     before rendering this component.
 */
export default function AdminSidebar({ user }) {
    /*
     * usePathname() returns the current URL's path (e.g. '/admin/orders').
     * We use this to determine which nav link should be styled as "active".
     *
     * Note: usePathname() re-renders this component on every client-side
     * navigation, so active states update instantly without a page reload.
     */
    const pathname = usePathname();

    /**
     * Determines whether a given href matches the current pathname.
     *
     * Special case for '/admin' (the dashboard root):
     *   - We use an exact match (`pathname === href`) to prevent it from
     *     being active on ALL /admin/* sub-routes.
     *   - For all other links, we use startsWith() so that nested routes
     *     (e.g. '/admin/orders/123') still highlight the parent nav item.
     *
     * @param {string} href – the nav link's target path
     * @returns {boolean}
     */
    const isActive = (href) => {
        if (href === '/admin') return pathname === '/admin';
        return pathname.startsWith(href);
    };

    return (
        <aside className={styles.sidebar}>

            {/* ── Brand / Logo Area ──────────────────────────────────────────── */}
            <div className={styles.sidebar__brand}>
                <span className={styles.sidebar__brand_icon}>⚙</span>
                <span className={styles.sidebar__brand_title}>پنل ادمین</span>
            </div>

            {/* ── User Profile Mini-Card ─────────────────────────────────────── */}
            <div className={styles.sidebar__profile}>
                {/*
         * Show the user's avatar from Google OAuth if available,
         * otherwise fall back to the generic UserCircle icon from Lucide.
         */}
                {user?.image ? (
                    <img
                        src={user.image}
                        alt={user.name || 'Admin'}
                        className={styles.sidebar__avatar}
                    />
                ) : (
                    <UserCircle className={styles.sidebar__avatar_icon} size={40} />
                )}
                <div className={styles.sidebar__profile_info}>
                    <span className={styles.sidebar__profile_name}>
                        {user?.name || 'مدیر سیستم'}
                    </span>
                    <span className={styles.sidebar__profile_role}>Administrator</span>
                </div>
            </div>

            {/* ── Navigation Links ───────────────────────────────────────────── */}
            <nav className={styles.sidebar__nav} aria-label="Admin Navigation">
                <ul className={styles.sidebar__nav_list}>
                    {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                        <li key={href} className={styles.sidebar__nav_item}>
                            <Link
                                href={href}
                                className={`${styles.sidebar__nav_link} ${isActive(href) ? styles['sidebar__nav_link--active'] : ''
                                    }`}
                                aria-current={isActive(href) ? 'page' : undefined}
                            >
                                {/* Lucide icon – sized consistently via SCSS */}
                                <Icon className={styles.sidebar__nav_icon} size={20} />
                                <span className={styles.sidebar__nav_label}>{label}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* ── Sign Out Button ────────────────────────────────────────────── */}
            <div className={styles.sidebar__footer}>
                <button
                    className={styles.sidebar__signout}
                    onClick={() => signOut({ callbackUrl: '/' })}
                    aria-label="خروج از حساب"
                >
                    <LogOut size={18} />
                    <span>خروج</span>
                </button>
            </div>

        </aside>
    );
}
