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
        : checkout.phase === 'accessMissing' ? 'سابقه خرید در بای‌مانی وجود دارد، اما دسترسی دوره در حساب شما فعال نیست. برای بررسی و بازیابی دسترسی با پشتیبانی تماس بگیرید و دوباره پرداخت نکنید.'
        : checkout.phase === 'incomplete' ? (checkout.paid ? 'پرداخت یا شارژ ثبت شده است، اما خرید دوره تکمیل نشده است. وضعیت را از کیف پول و پشتیبانی پیگیری کنید.' : 'خرید دوره تکمیل نشده است. وضعیت را از حساب کاربری پیگیری کنید.')
        : checkout.phase === 'activating' ? 'پرداخت ثبت شد؛ در حال فعال‌سازی دوره هستیم. نیازی به پرداخت دوباره نیست.'
        : checkout.phase === 'paymentPending' ? 'خرید هنوز تأیید نشده است. وضعیت پرداخت را از کیف پول و حساب کاربری پیگیری کنید.'
        : checkout.phase === 'paymentFailed' ? (status === 'cancel' ? 'پرداخت لغو شد؛ دوره خریداری نشده و سبد شما حفظ شده است.' : 'پرداخت تأیید نشد؛ دوره خریداری نشده و سبد شما حفظ شده است.')
        : 'در حال حاضر تأیید وضعیت خرید ممکن نیست. برای پیگیری به حساب کاربری مراجعه کنید و دوباره پرداخت نکنید.';

    const isSuccess = isCoursePurchase ? isVerifiedCourse
        : isTopUp && topUpId ? checkout.paid === true : status === 'success';
    const isCancel = status === 'cancel';
    const isPendingTopUp = isTopUp && topUpId && !isCoursePurchase &&
        !['standalone', 'paymentFailed'].includes(checkout.phase);
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
                            ? 'در حال بررسی نتیجه پرداخت هستیم. تا مشخص‌شدن نتیجه، دوباره پرداخت نکنید و وضعیت را از حساب کاربری پیگیری کنید.'
                            : isSuccess
                            ? isTopUp
                                ? 'نور شارژشده به کیف پول شما اضافه شد.'
                                : 'سفارش شما با موفقیت در سیستم ثبت شد و دسترسی به دوره‌ها و خدمات خریداری‌شده فوراً برای حساب کاربری شما فعال گردید.'
                            : isCancel
                            ? 'فرایند پرداخت در درگاه بانکی سامان لغو شد. در صورت تمایل می‌توانید سفارش خود را مجدداً تکمیل فرمایید.'
                            : message || 'پرداخت تأیید نشده است. اگر مبلغی کسر شده، وضعیت آن را از بانک یا پشتیبانی پیگیری کنید.'}
                    </p>

                    {isCoursePurchase && checkout.courses.length > 0 && (
                        <div className={styles.detailsList} aria-label="وضعیت دوره‌های سبد">
                            {checkout.courses.map(course => (
                                <div className={styles.detailRow} key={course.externalCourseId}>
                                    <span className={styles.label}>{course.title || course.externalCourseId}</span>
                                    <span className={styles.value}>{({ Completed: 'فعال شد', AccessMissing: 'دسترسی فعال نیست؛ نیازمند پیگیری', Activating: 'در حال فعال‌سازی', DeliveryPending: 'پرداخت ثبت شد؛ در انتظار تحویل', PurchaseIncomplete: 'خرید تکمیل نشده', NotPurchased: 'خریداری نشده' })[course.purchaseStatus] || 'در حال بررسی'}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* رسید مالی خریدهای بای‌مانی برای تمام دوره‌های سبد */}
                    {isCoursePurchase && Array.isArray(checkout.receipts) && checkout.receipts.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', marginBottom: '16px' }}>
                            {checkout.receipts.map((receipt) => (
                                <div className={styles.detailsList} key={receipt.purchaseId} aria-label={`رسید دوره ${receipt.courseTitle}`}>
                                    <div className={styles.detailRow} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '8px', marginBottom: '8px' }}>
                                        <span className={styles.label} style={{ fontWeight: 'bold' }}>
                                            <Receipt size={16} />
                                            {receipt.courseTitle}
                                        </span>
                                        <span className={`${styles.badge} ${styles.successBadge}`}>
                                            رسید مالی بای‌مانی ✓
                                        </span>
                                    </div>

                                    <div className={styles.detailRow}>
                                        <span className={styles.label}>شماره سفارش / شناسه خرید:</span>
                                        <span
                                            className={styles.value}
                                            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                            onClick={() => handleCopy(receipt.purchaseId)}
                                            title="برای کپی کلیک کنید"
                                            dir="ltr"
                                        >
                                            {receipt.purchaseId}
                                            {copiedRef ? <Check size={14} color="#34d399" /> : <Copy size={14} opacity={0.6} />}
                                        </span>
                                    </div>

                                    {receipt.baseAmountInNoor != null && (
                                        <div className={styles.detailRow}>
                                            <span className={styles.label}>مبلغ پایه:</span>
                                            <span className={styles.value}>{Number(receipt.baseAmountInNoor).toLocaleString('fa-IR')} نور</span>
                                        </div>
                                    )}

                                    {receipt.discountAmountInNoor != null && receipt.discountAmountInNoor > 0 && (
                                        <div className={styles.detailRow}>
                                            <span className={styles.label}>مبلغ تخفیف:</span>
                                            <span className={styles.value}>{Number(receipt.discountAmountInNoor).toLocaleString('fa-IR')} نور</span>
                                        </div>
                                    )}

                                    {receipt.couponCode && (
                                        <div className={styles.detailRow}>
                                            <span className={styles.label}>کد تخفیف:</span>
                                            <span className={styles.value} dir="ltr">{receipt.couponCode}</span>
                                        </div>
                                    )}

                                    <div className={styles.detailRow}>
                                        <span className={styles.label}>مبلغ پرداختی:</span>
                                        <span className={styles.value} style={{ fontWeight: 'bold' }}>
                                            {Number(receipt.finalAmountInNoor || 0).toLocaleString('fa-IR')} نور
                                        </span>
                                    </div>

                                    {receipt.referenceRialPerNoorAtPurchaseTime != null && (
                                        <div className={styles.detailRow}>
                                            <span className={styles.label}>نرخ مرجع هنگام خرید:</span>
                                            <span className={styles.value} dir="ltr">
                                                {Number(receipt.referenceRialPerNoorAtPurchaseTime).toLocaleString('fa-IR')}
                                            </span>
                                        </div>
                                    )}

                                    <div className={styles.detailRow}>
                                        <span className={styles.label}>زمان خرید:</span>
                                        <span className={styles.value}>
                                            {receipt.purchasedAtUtc
                                                ? new Intl.DateTimeFormat('fa-IR', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                }).format(new Date(receipt.purchasedAtUtc))
                                                : '—'}
                                        </span>
                                    </div>

                                    <div className={styles.detailRow}>
                                        <span className={styles.label}>وضعیت تحویل:</span>
                                        <span className={`${styles.badge} ${receipt.deliveryStatus === 'Delivered' ? styles.successBadge : styles.failedBadge}`}>
                                            {receipt.deliveryStatus === 'Delivered' ? 'دسترسی فعال شد' : 'در انتظار فعال‌سازی'}
                                        </span>
                                    </div>
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
                                {isWalletPurchase ? 'کیف نور' : 'پرداخت الکترونیک سامان (سپ)'}
                            </span>
                        </div>

                        <div className={styles.detailRow}>
                            <span className={styles.label}>وضعیت پرداخت:</span>
                            <span className={`${styles.badge} ${isSuccess ? styles.successBadge : styles.failedBadge}`}>
                                {isCoursePurchase ? (isVerifiedCourse ? 'خرید و فعال‌سازی تأیید شد'
                                    : checkout.phase === 'paymentFailed' ? (isCancel ? 'لغو شده توسط کاربر' : 'پرداخت تأیید نشد')
                                    : checkout.paid ? 'پرداخت ثبت شد؛ خرید در حال پیگیری' : 'در حال پیگیری')
                                    : isPendingTopUp ? 'در حال پیگیری' : isSuccess ? 'تایید شده و موفق' : isCancel ? 'لغو شده توسط کاربر' : 'ناموفق'}
                            </span>
                        </div>
                    </div>

                    {/* راهنمای کاربر */}
                    {isCoursePurchase ? (
                        <div className={styles.notice}>
                            {isVerifiedCourse ? 'دوره را از بخش «دوره‌های من» مشاهده کنید.'
                                : checkout.phase === 'paymentFailed' ? 'سبد شما حفظ شده است؛ می‌توانید از سبد خرید دوباره اقدام کنید.'
                                : 'برای پیگیری نتیجه، کیف پول و دوره‌های من را بررسی کنید. تا مشخص‌شدن نتیجه دوباره پرداخت نکنید.'}
                        </div>
                    ) : isPendingTopUp ? (
                        <div className={styles.notice}>
                            نتیجهٔ شارژ یا برگشت وجه هنوز قطعی نیست. وضعیت را از کیف پول و پشتیبانی پیگیری کنید و دوباره پرداخت نکنید.
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
                                وضعیت کسر یا برگشت وجه را از بانک یا پشتیبانی پیگیری کنید و شناسهٔ تراکنش را نگه دارید.
                            </p>
                        </div>
                    )}

                    {/* دکمه‌های عملیاتی */}
                    <div className={styles.actions}>
                        {isCoursePurchase ? (
                            <>
                                {checkout.phase === 'paymentFailed' && <Link href="/cart" className={styles.primaryButton}>بازگشت به سبد خرید و پرداخت مجدد</Link>}
                                <Link href="/profile/orders" className={styles.primaryButton}>
                                    <Receipt size={18} />
                                    سفارش‌های من
                                </Link>
                                <Link href="/profile/purchases" className={styles.secondaryButton}>
                                    <GraduationCap size={18} />
                                    دوره‌های من
                                </Link>
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
