'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import styles from './page.module.scss';

/**
 * کامپوننت داخلی — دسترسی به SearchParams بعد از mount
 */
function LightCallbackContent() {
    const [mounted, setMounted] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateDone, setUpdateDone] = useState(false);
    const [updateError, setUpdateError] = useState(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // پس از mount، اگر پرداخت آنلاین باشد نور را به Strapi اضافه می‌کنیم
    useEffect(() => {
        if (!mounted) return;

        const sp = new URLSearchParams(window.location.search);
        const status = sp.get('status');
        const source = sp.get('source');
        const amount = Number(sp.get('amount'));

        // اگر کارت به کارت باشد یا پرداخت موفق نباشد، آپدیت خودکار انجام نمی‌شود
        if (status !== 'success' || source === 'card_to_card' || !amount || amount <= 0) {
            setUpdateDone(true);
            return;
        }

        setIsUpdating(true);

        fetch('/api/payment-light', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lightAmount: amount }),
        })
            .then((res) => {
                if (!res.ok) return res.json().then((d) => { throw new Error(d.message); });
                return res.json();
            })
            .then(() => {
                setUpdateDone(true);
                setIsUpdating(false);
            })
            .catch((err) => {
                console.error('[LightCallback] update error:', err);
                setUpdateError(err.message);
                setIsUpdating(false);
                setUpdateDone(true);
            });
    }, [mounted]);

    // ── لودینگ اولیه ────────────────────────────────────────────────────────
    if (!mounted || isUpdating) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loader}>در حال پردازش...</div>
            </div>
        );
    }

    const sp = new URLSearchParams(window.location.search);
    const status = sp.get('status');
    const source = sp.get('source');
    const amount = Number(sp.get('amount'));
    const isCardToCard = source === 'card_to_card';

    const formatNumber = (n) => new Intl.NumberFormat('fa-IR').format(n);

    // ─── حالت موفقیت / در انتظار پرداخت ────────────────────────────────────
    if (status === 'success') {
        return (
            <div className={`${styles.callbackPage} ${isCardToCard ? styles.pending : styles.success} container`}>
                <div className={styles.card}>

                    {/* آیکون وضعیت */}
                    <div className={styles.icon}>
                        {isCardToCard ? (
                            /* ساعت — در انتظار پرداخت */
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        ) : (
                            /* تیک سبز — پرداخت آنلاین موفق */
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                        )}
                    </div>

                    <h1 className={styles.title}>
                        {isCardToCard ? 'در انتظار پرداخت کارت به کارت' : 'شارژ نور موفق!'}
                    </h1>

                    {/* نمایش مقدار نور */}
                    {amount > 0 && (
                        <div className={styles.lightAdded}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                fill="currentColor" strokeWidth="0">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            <span>{formatNumber(amount)} نور</span>
                            <span className={styles.lightAddedLabel}>
                                {isCardToCard ? 'درخواست شارژ' : 'به حساب شما اضافه شد'}
                            </span>
                        </div>
                    )}

                    <p className={styles.message}>
                        {isCardToCard
                            ? 'درخواست شارژ نور ثبت شد. برای تکمیل، مبلغ را به کارت فروشگاه واریز کرده و فیش را جهت تایید ارسال کنید.'
                            : 'نور با موفقیت به کیف پول شما افزوده شد.'}
                    </p>

                    <div className={styles.infoBox}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        <p>
                            {isCardToCard
                                ? `مبلغ قابل واریز: ${formatNumber(amount * 1000)} تومان. پس از واریز و بررسی فیش، نورها به حساب شما واریز خواهد شد.`
                                : 'می‌توانید موجودی نور خود را در پروفایل مشاهده کنید. نور قابل استفاده در خریدهای آینده است.'}
                        </p>
                    </div>

                    {updateError && (
                        <div className={styles.warnBox}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            <p>پرداخت ثبت شد اما به‌روزرسانی موجودی با تأخیر انجام می‌شود. لطفاً پروفایل را بعداً بررسی کنید.</p>
                        </div>
                    )}

                    <div className={styles.actions}>
                        <Link href="/profile" className={styles.primaryButton}>
                            مشاهده پروفایل
                        </Link>
                        <Link href="/products" className={styles.secondaryButton}>
                            بازگشت به فروشگاه
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ─── حالت خطا ───────────────────────────────────────────────────────────
    if (status === 'failed') {
        return (
            <div className={`${styles.callbackPage} ${styles.failure} container`}>
                <div className={styles.card}>
                    <div className={styles.icon}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                    </div>

                    <h1 className={styles.title}>پرداخت ناموفق</h1>
                    <p className={styles.message}>
                        متأسفانه پرداخت شما با موفقیت انجام نشد. موجودی نور تغییری نکرده است.
                    </p>

                    <div className={styles.infoBox}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="16" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        <p>
                            دلایل احتمالی: موجودی کافی نبودن، لغو تراکنش توسط کاربر، یا خطای موقت بانک.
                        </p>
                    </div>

                    <div className={styles.actions}>
                        <Link href="/" className={styles.primaryButton}>
                            تلاش مجدد
                        </Link>
                        <Link href="/profile" className={styles.secondaryButton}>
                            بازگشت به پروفایل
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ─── وضعیت نامشخص ───────────────────────────────────────────────────────
    return (
        <div className={`${styles.callbackPage} container`}>
            <div className={styles.card}>
                <div className={styles.icon}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                </div>
                <h1 className={styles.title}>خطا در دریافت اطلاعات</h1>
                <p className={styles.message}>اطلاعات پرداخت نامعتبر است.</p>
                <div className={styles.actions}>
                    <Link href="/" className={styles.primaryButton}>بازگشت به صفحه اصلی</Link>
                </div>
            </div>
        </div>
    );
}

/**
 * صفحه نتیجه پرداخت نور
 */
export default function LightCallbackPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--color-text-primary)', fontSize: 'var(--font-lg)' }}>
                    در حال بارگذاری...
                </p>
            </div>
        }>
            <LightCallbackContent />
        </Suspense>
    );
}
