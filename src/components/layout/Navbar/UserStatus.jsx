'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import styles from './UserStatus.module.scss';
import LightTopUpModal from '@/components/ui/LightTopUpModal/LightTopUpModal';
import Link from 'next/link';
import { isUserAdmin, isUserMentor } from '@/lib/auth';

export default function UserStatus() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const openAuthModal = useAuthStore((state) => state.openAuthModal);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLightModalOpen, setIsLightModalOpen] = useState(false);
    const [lightBalance, setLightBalance] = useState(null); // null = هنوز fetch نشده
    const containerRef = useRef(null);
    const closeTimerRef = useRef(null);

    /**
     * تشخیص اندازه صفحه و موبایل بودن
     */
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // ── بستن Dropdown هنگام کلیک خارج از کامپوننت ────────────────────────
    useEffect(() => {
        if (!isDropdownOpen) return;

        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isDropdownOpen]);

    // پاکسازی تایمر
    useEffect(() => {
        return () => {
            if (closeTimerRef.current) {
                clearTimeout(closeTimerRef.current);
            }
        };
    }, []);

    // ── fetch موجودی نور هنگام hover / باز شدن دراپ‌داون ──────────────────
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
        if (isMobile) return;
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        setIsDropdownOpen(true);
        fetchLightBalance();
    };

    const handleMouseLeave = () => {
        if (isMobile) return;
        closeTimerRef.current = setTimeout(() => {
            setIsDropdownOpen(false);
        }, 300);
    };

    const handleAvatarClick = (e) => {
        e.preventDefault();
        if (isMobile) {
            // در موبایل و لمسی: فقط toggle کردن مدال/دراپ‌داون بدون رفتن به صفحه
            setIsDropdownOpen((prev) => {
                const next = !prev;
                if (next) {
                    fetchLightBalance();
                }
                return next;
            });
        } else {
            // در دسکتاپ: کلیک روی آیکون به صفحه /profile می‌رود
            setIsDropdownOpen(false);
            router.push('/profile');
        }
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
                ref={containerRef}
                className={styles.userContainer}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {/* ── آواتار کاربر ─────────────────────────────────────── */}
                <button
                    type="button"
                    className={styles.avatarWrapper}
                    onClick={handleAvatarClick}
                    aria-label="منوی کاربری"
                    aria-expanded={isDropdownOpen}
                >
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
                </button>

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
                    <Link
                        href="/profile"
                        className={styles.dropdownItem}
                        onClick={() => setIsDropdownOpen(false)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none">
                            <circle cx="12" cy="8" r="4" />
                            <path d="M6 20c0-3.333 3-6 6-6s6 2.667 6 6" />
                        </svg>
                        <span>پروفایل کاربری</span>
                    </Link>

                    {/* ── پنل مدیریت (برای administrator) ──────────────── */}
                    {isUserAdmin(session?.user) && (
                        <Link
                            href="/admin"
                            className={styles.dropdownItem}
                            onClick={() => setIsDropdownOpen(false)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none">
                                <rect x="3" y="3" width="7" height="7" rx="1" />
                                <rect x="14" y="3" width="7" height="7" rx="1" />
                                <rect x="14" y="14" width="7" height="7" rx="1" />
                                <rect x="3" y="14" width="7" height="7" rx="1" />
                            </svg>
                            <span>پنل مدیریت</span>
                        </Link>
                    )}

                    {/* ── پنل استاد / مشاوره (برای mentor یا admin) ─────── */}
                    {isUserMentor(session?.user) && !isUserAdmin(session?.user) && (
                        <Link
                            href="/mentor"
                            className={styles.dropdownItem}
                            onClick={() => setIsDropdownOpen(false)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                            </svg>
                            <span>پنل استاد</span>
                        </Link>
                    )}

                    {/* ── آیتم افزایش نور ──────────────────────────────── */}
                    {/* <button
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
                    </button> */}

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
