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
    UserPlus,         // Manual order & course enrollment icon
    Users,            // Users management icon
    Package,          // Products icon
    FileText,         // Articles icon
    BookOpen,         // Courses icon
    LogOut,           // Sign out icon
    UserCircle,       // Profile avatar fallback icon
    Mail,             // Contact messages icon
    MessageSquare,    // Comments icon
    Ticket,           // Discount coupons icon
    Megaphone,        // Announcement top banner icon
    ShieldAlert,      // Gateway reviews icon
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useCartStore } from '@/store/useCartStore';
import { usePermissions } from '@/context/PermissionsContext';
import { ROUTE_PERMISSIONS } from '@/config/adminPermissions';

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
    { href: '/admin/orders/new', label: 'ثبت دستی', icon: UserPlus },
    { href: '/admin/gateway-reviews', label: 'رسیدگی پرداخت‌ها', icon: ShieldAlert },
    { href: '/admin/users', label: 'کاربران', icon: Users },
    { href: '/admin/products', label: 'محصولات', icon: Package },
    { href: '/admin/articles', label: 'مقالات', icon: FileText },
    { href: '/admin/courses', label: 'دوره‌ها', icon: BookOpen },
    { href: '/admin/contact-messages', label: 'پیام ها', icon: Mail },
    { href: '/admin/comments', label: 'نظرات', icon: MessageSquare },
    { href: '/admin/coupons', label: 'کد تخفیف', icon: Ticket },
    { href: '/admin/top-banner', label: 'نوار اعلان', icon: Megaphone },
];

/**
 * AdminSidebar Component
 *
 * @param {{ user: { name?: string, email?: string, image?: string, role?: any } }} props
 *   - `user` is forwarded from the server-side session in layout.jsx.
 */
export default function AdminSidebar({ user, financialOnly = false }) {
    /*
     * usePathname() returns the current URL's path (e.g. '/admin/orders').
     * We use this to determine which nav link should be styled as "active".
     *
     * Note: usePathname() re-renders this component on every client-side
     * navigation, so active states update instantly without a page reload.
     */
    const pathname = usePathname();
    const { hasAllPermissions, roles } = usePermissions();

    /**
     * Determines whether a given href matches the current pathname.
     */
    const isActive = (href) => {
        if (href === '/admin') return pathname === '/admin';
        if (href === '/admin/orders') return pathname === '/admin/orders';
        return pathname.startsWith(href);
    };

    // فیلتر کردن هوشمند آیتم‌های منو بر اساس دسترسی‌های کاربر و حالت مالی
    const visibleNavLinks = NAV_LINKS.filter(({ href }) => {
        if (financialOnly) {
            return href === '/admin/gateway-reviews';
        }
        const required = ROUTE_PERMISSIONS[href];
        if (!required || required.length === 0) return true;
        return hasAllPermissions(required);
    });

    const displayRole = roles && roles.length > 0
        ? roles.join(', ')
        : (typeof user?.role === 'string' ? user.role : user?.role?.name || user?.role?.type || 'مدیر سیستم');

    return (
        <aside className={styles.sidebar}>

            {/* ── Brand / Logo Area ──────────────────────────────────────────── */}
            <div className={styles.sidebar__brand}>
                <span className={styles.sidebar__brand_icon}>⚙</span>
                <span className={styles.sidebar__brand_title}>پنل ادمین</span>
            </div>

            {/* ── User Profile Mini-Card ─────────────────────────────────────── */}
            <div className={styles.sidebar__profile}>
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
                    <span className={styles.sidebar__profile_role}>{displayRole}</span>
                </div>
            </div>

            {/* ── Navigation Links ───────────────────────────────────────────── */}
            <nav className={styles.sidebar__nav} aria-label="Admin Navigation">
                <ul className={styles.sidebar__nav_list}>
                    {visibleNavLinks.map(({ href, label, icon: Icon }) => (
                        <li key={href} className={styles.sidebar__nav_item}>
                            <Link
                                href={href}
                                className={`${styles.sidebar__nav_link} ${isActive(href) ? styles['sidebar__nav_link--active'] : ''
                                    }`}
                                aria-current={isActive(href) ? 'page' : undefined}
                            >
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
                    onClick={() => {
                        useCartStore.getState().clearCart();
                        signOut({ callbackUrl: '/' });
                    }}
                    aria-label="خروج از حساب"
                >
                    <LogOut size={18} />
                    <span>خروج</span>
                </button>
            </div>

        </aside>
    );
}
