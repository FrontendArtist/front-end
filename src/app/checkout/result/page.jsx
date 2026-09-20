'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import { useOrdersStore } from '@/store/useOrdersStore';
import { 
    CheckCircle2, 
    XCircle, 
    AlertTriangle, 
    Receipt, 
    GraduationCap, 
    ArrowRight, 
    RotateCcw, 
    Home,
    Copy,
    Check
} from 'lucide-react';
import styles from './page.module.scss';

function CheckoutResultContent() {
    const searchParams = useSearchParams();
    const [mounted, setMounted] = useState(false);
    const [copiedRef, setCopiedRef] = useState(false);

    const status = searchParams.get('status') || 'failed';
    const orderId = searchParams.get('orderId') || '';
    const refNum = searchParams.get('refNum') || '';
    const traceNo = searchParams.get('traceNo') || '';
    const message = searchParams.get('message') || '';

    const isSuccess = status === 'success';
    const isCancel = status === 'cancel';
    const isFailed = !isSuccess && !isCancel;

    useEffect(() => {
        setMounted(true);

        // در صورت پرداخت موفقیت‌آمیز، سبد خرید خالی می‌شود و کش سفارشات ریست می‌گردد
        if (status === 'success') {
            try {
                useCartStore.getState().clearCart();
                useOrdersStore.setState({ hasFetched: false, orders: [] });
            } catch (err) {
                console.warn('[CheckoutResult] Cart clear warning:', err);
            }
        }
    }, [status]);

    const handleCopy = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedRef(true);
        setTimeout(() => setCopiedRef(false), 2000);
    };

    if (!mounted) {
        return (
            <div className={styles.loadingWrapper}>
                <div className={styles.spinner} />
                <p>در حال پردازش و استعلام نتیجه تراکنش...</p>
            </div>
        );
    }

    return (
        <div className={styles.resultPage}>
            <div className={styles.container}>
                <div className={`${styles.card} ${isSuccess ? styles.success : isCancel ? styles.cancel : styles.failed}`}>
                    
                    {/* آیکون وضعیت تراکنش */}
                    <div className={`${styles.iconWrapper} ${isSuccess ? styles.success : isCancel ? styles.cancel : styles.failed}`}>
                        {isSuccess ? (
                            <CheckCircle2 />
                        ) : isCancel ? (
                            <AlertTriangle />
                        ) : (
                            <XCircle />
                        )}
                    </div>

                    {/* عنوان نتیجه */}
                    <h1 className={styles.title}>
                        {isSuccess
                            ? 'پرداخت با موفقیت انجام شد'
                            : isCancel
                            ? 'پرداخت توسط شما لغو گردید'
                            : 'تراکنش پرداخت ناموفق بود'}
                    </h1>

                    {/* پیام توضیحی */}
                    <p className={styles.description}>
                        {isSuccess
                            ? 'سفارش شما با موفقیت در سیستم ثبت شد و دسترسی به دوره‌ها و خدمات خریداری‌شده فوراً برای حساب کاربری شما فعال گردید.'
                            : isCancel
                            ? 'فرایند پرداخت در درگاه بانکی سامان لغو شد. در صورت تمایل می‌توانید سفارش خود را مجدداً تکمیل فرمایید.'
                            : message || 'مشکلی در تایید تراکنش یا اتصال به درگاه رخ داد. چنانچه مبلغی از حساب شما کسر شده باشد، حداکثر ظرف ۷۲ ساعت توسط شاپرک عودت داده می‌شود.'}
                    </p>

                    {/* جدول مشخصات تراکنش */}
                    <div className={styles.detailsList}>
                        {orderId && (
                            <div className={styles.detailRow}>
                                <span className={styles.label}>
                                    <Receipt size={16} />
                                    شناسه سفارش:
                                </span>
                                <span className={styles.value}>{orderId}</span>
                            </div>
                        )}

                        {refNum && (
                            <div className={styles.detailRow}>
                                <span className={styles.label}>
                                    رسید دیجیتال (RefNum):
                                </span>
                                <span 
                                    className={styles.value} 
                                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    onClick={() => handleCopy(refNum)}
                                    title="برای کپی کلیک کنید"
                                >
                                    {refNum}
                                    {copiedRef ? <Check size={14} color="#34d399" /> : <Copy size={14} opacity={0.6} />}
                                </span>
                            </div>
                        )}

                        {traceNo && traceNo !== refNum && (
                            <div className={styles.detailRow}>
                                <span className={styles.label}>
                                    کد رهگیری بانک (TraceNo):
                                </span>
                                <span className={styles.value}>{traceNo}</span>
                            </div>
                        )}

                        <div className={styles.detailRow}>
                            <span className={styles.label}>درگاه پرداخت:</span>
                            <span className={styles.value} style={{ direction: 'rtl', fontFamily: 'inherit' }}>
                                پرداخت الکترونیک سامان (سپ)
                            </span>
                        </div>

                        <div className={styles.detailRow}>
                            <span className={styles.label}>وضعیت پرداخت:</span>
                            <span className={`${styles.badge} ${isSuccess ? styles.successBadge : styles.failedBadge}`}>
                                {isSuccess ? 'تایید شده و موفق' : isCancel ? 'لغو شده توسط کاربر' : 'ناموفق'}
                            </span>
                        </div>
                    </div>

                    {/* راهنمای کاربر */}
                    {isSuccess ? (
                        <div className={styles.notice}>
                            رسید پرداخت برای شما صادر شد. می‌توانید در پنل کاربری، سوابق سفارشات و محتوای دوره‌های خود را مشاهده و دریافت نمایید.
                        </div>
                    ) : (
                        <div className={styles.notice}>
                            اقلام سبد خرید شما جهت سهولت در تلاش مجدد حفظ شده‌اند و می‌توانید مجدداً اقدام به پرداخت نمایید.
                        </div>
                    )}

                    {/* دکمه‌های عملیاتی */}
                    <div className={styles.actions}>
                        {isSuccess ? (
                            <>
                                {orderId ? (
                                    <Link href={`/profile/orders/${orderId}`} className={styles.primaryButton}>
                                        مشاهده فاکتور سفارش
                                        <ArrowRight size={18} />
                                    </Link>
                                ) : null}
                                <Link href="/profile/purchases" className={styles.secondaryButton}>
                                    <GraduationCap size={18} />
                                    دوره‌های من
                                </Link>
                                <Link href="/" className={styles.secondaryButton}>
                                    <Home size={18} />
                                    صفحه اصلی
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link href="/checkout" className={styles.primaryButton}>
                                    <RotateCcw size={18} />
                                    تلاش مجدد پرداخت
                                </Link>
                                <Link href="/cart" className={styles.secondaryButton}>
                                    <Receipt size={18} />
                                    مشاهده سبد خرید
                                </Link>
                                <Link href="/contact" className={styles.secondaryButton}>
                                    پشتیبانی و تماس
                                </Link>
                            </>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}

export default function CheckoutResultPage() {
    return (
        <Suspense fallback={
            <div className={styles.loadingWrapper}>
                <div className={styles.spinner} />
                <p>در حال بارگذاری اطلاعات پرداخت...</p>
            </div>
        }>
            <CheckoutResultContent />
        </Suspense>
    );
}
