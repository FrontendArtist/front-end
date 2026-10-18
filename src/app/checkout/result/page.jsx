'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import useCompletedOrderCart from '@/hooks/useCompletedOrderCart';
import useCourseCheckoutResult from '@/hooks/useCourseCheckoutResult';


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
    Check,
    Wallet
} from 'lucide-react';
import styles from './page.module.scss';

function CheckoutResultContent() {
    const searchParams = useSearchParams();
    useCompletedOrderCart(searchParams.get('status'), searchParams.get('orderType') === 'light_topup' ? null : searchParams.get('orderId'));
    const [mounted, setMounted] = useState(false);
    const [copiedRef, setCopiedRef] = useState(false);

    const status = searchParams.get('status') || 'failed';
    const orderId = searchParams.get('orderId') || '';
    const refNum = searchParams.get('refNum') || '';
    const traceNo = searchParams.get('traceNo') || '';
    const message = searchParams.get('message') || '';
    const isTopUp = searchParams.get('orderType') === 'light_topup';
    const topUpId = searchParams.get('topUpId') || '';
    const isWalletPurchase = searchParams.get('source') === 'noor';
    const courseId = isWalletPurchase ? searchParams.get('courseId') || '' : '';
    const cartId = searchParams.get('cartId') || '';
    const checkout = useCourseCheckoutResult(courseId, isTopUp ? topUpId : '', cartId);
    const isCoursePurchase = Boolean(cartId) || isWalletPurchase || checkout.courses.length > 0;
    const isCheckingPurchase = isCoursePurchase && ['checking', 'activating'].includes(checkout.phase);
    const isVerifiedCourse = isCoursePurchase && checkout.phase === 'completed';
    const courseMessage = checkout.phase === 'checking' ? 'در حال بررسی نتیجه خرید و فعال‌سازی دوره‌ها…'
        : checkout.phase === 'completed' ? 'خرید با موفقیت انجام شد و دسترسی همه دوره‌ها برای شما فعال است.'
        : checkout.phase === 'incomplete' ? 'کیف پول شارژ شد، اما خرید دوره تکمیل نشد. نور شارژشده در کیف پول شما محفوظ است.'
        : checkout.phase === 'activating' ? 'پرداخت ثبت شد؛ در حال فعال‌سازی دوره هستیم. نیازی به پرداخت دوباره نیست.'
        : checkout.phase === 'paymentPending' ? 'خرید هنوز تأیید نشده است. وضعیت پرداخت را از کیف پول و حساب کاربری پیگیری کنید.'
        : checkout.phase === 'paymentFailed' ? (status === 'cancel' ? 'پرداخت لغو شد؛ دوره خریداری نشده و سبد شما حفظ شده است.' : 'پرداخت تأیید نشد؛ دوره خریداری نشده و سبد شما حفظ شده است.')
        : 'در حال حاضر تأیید وضعیت خرید ممکن نیست. برای پیگیری به حساب کاربری مراجعه کنید و دوباره پرداخت نکنید.';

    const isSuccess = isCoursePurchase ? (isVerifiedCourse || checkout.paid === true)
        : isTopUp && topUpId ? checkout.paid === true : status === 'success';
    const isCancel = status === 'cancel';
    const isFailed = !isSuccess && !isCancel;

    useEffect(() => {
        setMounted(true);
    }, []);

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
                        {isCoursePurchase
                            ? isVerifiedCourse ? 'خرید موفق؛ دوره‌ها فعال شدند' : isCheckingPurchase ? 'در حال بررسی و فعال‌سازی دوره‌ها…' : 'وضعیت خرید دوره'
                            : isTopUp && topUpId && !['standalone', 'paymentFailed'].includes(checkout.phase) ? 'وضعیت پرداخت در حال بررسی است'
                            : isSuccess
                            ? 'پرداخت با موفقیت انجام شد'
                            : isCancel
                            ? 'پرداخت توسط شما لغو گردید'
                            : 'تراکنش پرداخت ناموفق بود'}
                    </h1>

                    {/* پیام توضیحی */}
                    <p className={styles.description}>
                        {isCoursePurchase
                            ? courseMessage
                            : isTopUp && topUpId && !['standalone', 'paymentFailed'].includes(checkout.phase)
                            ? 'در حال بررسی نتیجه پرداخت و خرید هستیم. تا مشخص‌شدن نتیجه، دوباره پرداخت نکنید و وضعیت را از حساب کاربری پیگیری کنید.'
                            : isSuccess
                            ? isTopUp
                                ? 'نور شارژشده به کیف پول شما اضافه شد.'
                                : 'سفارش شما با موفقیت در سیستم ثبت شد و دسترسی به دوره‌ها و خدمات خریداری‌شده فوراً برای حساب کاربری شما فعال گردید.'
                            : isCancel
                            ? 'فرایند پرداخت در درگاه بانکی سامان لغو شد. در صورت تمایل می‌توانید سفارش خود را مجدداً تکمیل فرمایید.'
                            : message || 'مشکلی در تایید تراکنش یا اتصال به درگاه رخ داد. چنانچه مبلغی از حساب شما کسر شده باشد، حداکثر ظرف ۷۲ ساعت توسط شاپرک عودت داده می‌شود.'}
                    </p>

                    {isCoursePurchase && checkout.courses.length > 0 && (
                        <div className={styles.detailsList} aria-label="وضعیت دوره‌های سبد">
                            {checkout.courses.map(course => (
                                <div className={styles.detailRow} key={course.externalCourseId}>
                                    <span className={styles.label}>{course.title || course.externalCourseId}</span>
                                    <span className={styles.value}>{({ Completed: 'فعال شد', Activating: 'در حال فعال‌سازی', DeliveryPending: 'پرداخت ثبت شد؛ در انتظار تحویل', PurchaseIncomplete: 'خرید تکمیل نشده', NotPurchased: 'خریداری نشده' })[course.purchaseStatus] || 'در حال بررسی'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {/* جدول مشخصات تراکنش */}
                    <div className={styles.detailsList}>
                        {isTopUp && topUpId && (
                            <div className={styles.detailRow}>
                                <span className={styles.label}>شناسه شارژ:</span>
                                <span className={styles.value}>{topUpId}</span>
                            </div>
                        )}
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
                                {isWalletPurchase ? 'کیف پول نور' : 'پرداخت الکترونیک سامان (سپ)'}
                            </span>
                        </div>

                        <div className={styles.detailRow}>
                            <span className={styles.label}>وضعیت پرداخت:</span>
                            <span className={`${styles.badge} ${isSuccess ? styles.successBadge : styles.failedBadge}`}>
                                {isCoursePurchase ? (isVerifiedCourse ? 'خرید و فعال‌سازی تأیید شد' : checkout.paid ? 'پرداخت ثبت شد؛ خرید در حال پیگیری' : 'در حال پیگیری') : isSuccess ? 'تایید شده و موفق' : isCancel ? 'لغو شده توسط کاربر' : 'ناموفق'}
                            </span>
                        </div>
                    </div>

                    {/* راهنمای کاربر */}
                    {isCoursePurchase ? (
                        <div className={styles.notice}>
                            {isVerifiedCourse ? 'دوره را از بخش «دوره‌های من» مشاهده کنید.' : 'برای پیگیری نتیجه، کیف پول و دوره‌های من را بررسی کنید. تا مشخص‌شدن نتیجه دوباره پرداخت نکنید.'}
                        </div>
                    ) : isSuccess ? (
                        <div className={styles.notice}>
                            {isTopUp
                                ? 'نتیجهٔ شارژ در کیف پول شما ثبت شد.'
                                : 'رسید پرداخت برای شما صادر شد. می‌توانید در پنل کاربری، سوابق سفارشات و محتوای دوره‌های خود را مشاهده و دریافت نمایید.'}
                        </div>
                    ) : (
                        <div className={styles.deductionAlertBox}>
                            <div className={styles.deductionAlertHeader}>
                                <AlertTriangle size={18} />
                                <strong>اگر مبلغ از حسابتان کسر شده ولی دسترسی فعال نشده است:</strong>
                            </div>
                            <p className={styles.deductionAlertText}>
                                طبق قوانین بانکی شاپرک، در صورت کسر وجه و عدم تایید تراکنش، مبلغ حداکثر ظرف ۷۲ ساعت به صورت خودکار توسط بانک به حسابتان بازمی‌گردد.
                                در صورت عدم بازگشت وجه یا نیاز به بررسی سریع‌تر، لطفاً با پشتیبانی تماس بگیرید یا کد پیگیری تراکنش را ارسال کنید.
                            </p>
                        </div>
                    )}

                    {/* دکمه‌های عملیاتی */}
                    <div className={styles.actions}>
                        {isCoursePurchase ? (
                            <>
                                {checkout.phase === 'paymentFailed' && <Link href="/cart" className={styles.primaryButton}>بازگشت به سبد خرید و پرداخت مجدد</Link>}
                                <Link href="/profile/purchases" className={styles.primaryButton}>دوره‌های من</Link>
                                <Link href="/profile" className={styles.secondaryButton}>کیف پول و حساب کاربری</Link>
                                <Link href="/contact" className={styles.secondaryButton}>پشتیبانی و تماس</Link>
                            </>
                        ) : isSuccess ? (
                            isTopUp ? (
                                <>
                                    <Link href="/profile" className={styles.primaryButton}>
                                        <Wallet size={18} />
                                        کیف پول و حساب کاربری
                                    </Link>
                                    <Link href="/" className={styles.secondaryButton}>
                                        <Home size={18} />
                                        صفحه اصلی
                                    </Link>
                                </>
                            ) : (
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
                            )
                        ) : (
                            isTopUp ? (
                                <>
                                    <Link href="/" className={styles.secondaryButton}>
                                        <Home size={18} />
                                        صفحه اصلی
                                    </Link>
                                    <Link href="/contact" className={styles.secondaryButton}>
                                        پشتیبانی و تماس
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link href="/cart" className={styles.primaryButton}>
                                        <RotateCcw size={18} />
                                        بازگشت به سبد خرید و پرداخت مجدد
                                    </Link>
                                    <Link href="/" className={styles.secondaryButton}>
                                        <Home size={18} />
                                        صفحه اصلی
                                    </Link>
                                    <Link href="/contact" className={styles.secondaryButton}>
                                        پشتیبانی و تماس
                                    </Link>
                                </>
                            )
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
