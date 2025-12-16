'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './ProfileSidebar.module.scss';

export default function ProfileSidebar() {
    const { data: session } = useSession();
    const pathname = usePathname();

    const handleLogout = async () => {
        await signOut({ callbackUrl: '/' });
    };

    const navItems = [
        {
            href: '/profile',
            label: 'اطلاعات حساب',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )
        },
        {
            href: '/profile/orders',
            label: 'سفارش‌های من',
            icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )
        }
    ];

    return (
        <aside className={styles.sidebar}>
            {/* User Summary */}
            <div className={styles.userSummary}>
                <div className={styles.avatar}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <div className={styles.userInfo}>
                    <span className={styles.phoneNumber} dir="ltr">
                        {session?.user?.phoneNumber || '---'}
                    </span>
                    <span className={styles.welcomeText}>خوش آمدید</span>
                </div>
            </div>

            {/* Navigation Links */}
            <nav className={styles.nav}>
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navLink} ${isActive ? styles.active : ''}`}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Logout Button */}
            <button onClick={handleLogout} className={styles.logoutButton}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>خروج از حساب</span>
            </button>
        </aside>
    );
}
