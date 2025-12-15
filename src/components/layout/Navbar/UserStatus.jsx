'use client';

import { useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import useAuthStore from '@/store/authStore';
import styles from './UserStatus.module.scss';

export default function UserStatus() {
    const { data: session, status } = useSession();
    const openAuthModal = useAuthStore((state) => state.openAuthModal);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const closeTimerRef = useRef(null);

    const handleMouseEnter = () => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
        }
        setIsDropdownOpen(true);
    };

    const handleMouseLeave = () => {
        closeTimerRef.current = setTimeout(() => {
            setIsDropdownOpen(false);
        }, 300); // 300ms delay before closing
    };

    // Loading state
    if (status === 'loading') {
        return (
            <div className={styles.skeleton}>
                <div className={styles.skeletonCircle}></div>
            </div>
        );
    }

    // Unauthenticated state
    if (status === 'unauthenticated') {
        return (
            <button
                className={styles.iconButton}
                onClick={openAuthModal}
                aria-label="ورود"
                title="ورود"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M6 20c0-3.333 3-6 6-6s6 2.667 6 6" />
                </svg>
            </button>
        );
    }

    // Authenticated state
    return (
        <div
            className={styles.userContainer}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className={styles.avatarWrapper}>
                {/* User Avatar Icon */}
                <svg
                    className={styles.avatar}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    fill="none"
                >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M6 20c0-3.333 3-6 6-6s6 2.667 6 6" />
                </svg>

                {/* Verification Badge */}
                <div className={styles.badge}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                        fill="none"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                </div>
            </div>

            {/* Dropdown Menu */}
            <div className={`${styles.dropdown} ${isDropdownOpen ? styles.dropdownOpen : ''}`}>
                <Link href="/profile" className={styles.dropdownItem}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                        fill="none"
                    >
                        <circle cx="12" cy="8" r="4" />
                        <path d="M6 20c0-3.333 3-6 6-6s6 2.667 6 6" />
                    </svg>
                    <span>پروفایل کاربری</span>
                </Link>

                <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className={styles.dropdownItem}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                        fill="none"
                    >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>خروج</span>
                </button>
            </div>
        </div>
    );
}
