'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import useAuthStore from '@/store/authStore';
import styles from './UserStatus.module.scss';
import LightTopUpModal from '@/components/ui/LightTopUpModal/LightTopUpModal';
import Link from 'next/link';

export default function UserStatus() {
    const { data: session, status } = useSession();
    const openAuthModal = useAuthStore((state) => state.openAuthModal);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLightModalOpen, setIsLightModalOpen] = useState(false);
    const [lightBalance, setLightBalance] = useState(null); // null = هنوز fetch نشده
    const closeTimerRef = useRef(null);

    // ── fetch موجودی نور هنگام hover ──────────────────────────────────────
    const fetchLightBalance = useCallback(async () => {
        if (lightBalance !== null) return; // یک بار fetch می‌کنیم
        try {
            const res = await fetch('/api/payment-light', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setLightBalance(data.light ?? 0);
            }
        } catch {
            // بی‌صدا fail می‌شه
        }
    }, [lightBalance]);

    const handleMouseEnter = () => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        setIsDropdownOpen(true);
        fetchLightBalance();
    };

    const handleMouseLeave = () => {
        closeTimerRef.current = setTimeout(() => {
            setIsDropdownOpen(false);
        }, 300);
    };

    const [profileData, setProfileData] = useState(null);

    // ── fetch اطلاعات پروفایل (نام و شماره) برای همگام‌سازی همیشه دقیق ──────
    useEffect(() => {
        if (status !== 'authenticated') return;

        const loadProfile = async () => {
            try {
                const res = await fetch('/api/profile', { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();
                    setProfileData(data);
                }
            } catch {
                // بی‌صدا رد می‌شویم
            }
        };

        loadProfile();

        window.addEventListener('profile-updated', loadProfile);
        return () => window.removeEventListener('profile-updated', loadProfile);
    }, [status]);

    // آپدیت موجودی نور بعد از بستن مدال (در صورت پرداخت موفق)
    const handleLightModalClose = useCallback(() => {
        setIsLightModalOpen(false);
        // ریست می‌کنیم تا دفعه بعد دوباره fetch بشه
        setLightBalance(null);
    }, []);

    const formatNumber = (n) => new Intl.NumberFormat('fa-IR').format(n);

    // نام نمایشی: اولویت با نام و نام خانوادگی، در غیر این صورت شماره موبایل
    const firstName = profileData?.firstName ?? session?.user?.firstName ?? '';
    const lastName = profileData?.lastName ?? session?.user?.lastName ?? '';
    const fullName = [firstName, lastName]
        .filter(Boolean)
        .join(' ')
        .trim();

    const phone = profileData?.phoneNumber || session?.user?.phoneNumber || '';
    const displayName = fullName || session?.user?.name || phone || 'کاربر';
    const isPhone = !fullName && !session?.user?.name && !!phone;

    // ── Loading state ──────────────────────────────────────────────────────
    if (status === 'loading') {
        return (
            <div className={styles.skeleton}>
                <div className={styles.skeletonCircle}></div>
            </div>
        );
    }

    // ── Unauthenticated state ──────────────────────────────────────────────
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

    // ── Authenticated state ────────────────────────────────────────────────
    return (
        <>
            <div
                className={styles.userContainer}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {/* ── آواتار کاربر ─────────────────────────────────────── */}
                <Link href="/profile" className={styles.avatarWrapper}>
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
                    <div className={styles.badge}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                    </div>
                </Link>

                {/* ── Dropdown ──────────────────────────────────────────── */}
                <div className={`${styles.dropdown} ${isDropdownOpen ? styles.dropdownOpen : ''}`}>

                    {/* ── کارت اطلاعات کاربر ──────────────────────────── */}
                    <div className={styles.userCard}>
                        <div className={styles.userCardAvatar}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none">
                                <circle cx="12" cy="8" r="4" />
                                <path d="M6 20c0-3.333 3-6 6-6s6 2.667 6 6" />
                            </svg>
                        </div>
                        <div className={styles.userCardInfo}>
                            <span className={styles.userCardName} dir={isPhone ? 'ltr' : 'auto'}>
                                {displayName}
                            </span>
                            <span className={styles.userCardLight}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" strokeWidth="0">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                                {lightBalance !== null
                                    ? `${formatNumber(lightBalance)} نور`
                                    : '— نور'}
                            </span>
                        </div>
                    </div>

                    <div className={styles.dropdownDivider} />

                    {/* ── آیتم پروفایل ─────────────────────────────────── */}
                    <Link href="/profile" className={styles.dropdownItem}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none">
                            <circle cx="12" cy="8" r="4" />
                            <path d="M6 20c0-3.333 3-6 6-6s6 2.667 6 6" />
                        </svg>
                        <span>پروفایل کاربری</span>
                    </Link>

                    {/* ── آیتم افزایش نور ──────────────────────────────── */}
                    <button
                        className={`${styles.dropdownItem} ${styles.dropdownItemLight}`}
                        onClick={() => {
                            setIsDropdownOpen(false);
                            setIsLightModalOpen(true);
                        }}
                        id="open-light-topup"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        <span>افزایش نور</span>
                    </button>

                    {/* ── آیتم خروج ────────────────────────────────────── */}
                    <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className={styles.dropdownItem}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span>خروج</span>
                    </button>
                </div>
            </div>

            {/* ── مدال شارژ نور ─────────────────────────────────────────── */}
            <LightTopUpModal
                isOpen={isLightModalOpen}
                onClose={handleLightModalClose}
                currentLight={lightBalance ?? 0}
            />
        </>
    );
}
