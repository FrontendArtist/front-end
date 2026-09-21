'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useCartStore, selectItemsCount } from '@/store/useCartStore';
import AuthForm from '@/components/auth/AuthForm';
import Breadcrumb from '@/components/ui/BreadCrumb/Breadcrumb';
import EmptyCartState from '@/components/cart/EmptyCartState/EmptyCartState';
import styles from './page.module.scss';

const ShippingStep = dynamic(() => import('@/components/checkout/ShippingStep'), {
    loading: () => (
        <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            در حال بارگذاری اطلاعات ارسال...
        </div>
    )
});

/**
 * صفحه ثبت اطلاعات و آدرس تحویل سفارش
 * 
 * ویژگی‌ها:
 * - حذف کامل استپر و المان‌های اضافی فرآیند چندمرحله‌ای
 * - اگر سبد فقط دوره باشد، کاربر مستقیماً به سبد خرید جهت پرداخت هدایت می‌شود
 * - برای محصولات فیزیکی: تأیید یا ورود آدرس و اتصال مستقیم به درگاه پرداخت شاپرک
 */
export default function CheckoutPage() {
    const router = useRouter();
    const { status } = useSession();
    const items = useCartStore((state) => state.items);
    const itemsCount = useCartStore(selectItemsCount);

    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    // تشخیص سبد فقط دوره‌ای (بدون محصول فیزیکی)
    const isCoursesOnly = items.length > 0 && items.every(
        (item) => item.type === 'course' || item.type === 'chapter'
    );

    // اگر سبد خرید فقط شامل دوره باشد، کاربر نیازی به آدرس ندارد و به /cart هدایت می‌شود
    useEffect(() => {
        if (isHydrated && isCoursesOnly) {
            router.replace('/cart');
        }
    }, [isHydrated, isCoursesOnly, router]);

    const breadcrumbItems = [
        { label: 'خانه', href: '/' },
        { label: 'سبد خرید', href: '/cart' },
        { label: 'آدرس و تحویل سفارش' }
    ];

    // اسکلتون لودینگ قبل از Hydration یا لود سشن
    if (!isHydrated || status === 'loading') {
        return (
            <div className={styles.checkoutPage}>
                <div className={styles.container}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', padding: '60px 0' }}>
                        <div style={{ width: '180px', height: '24px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
                        <div style={{ width: '100%', maxWidth: '680px', height: '360px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px' }} />
                    </div>
                </div>
            </div>
        );
    }

    // سبد خرید خالی
    if (itemsCount === 0) {
        return (
            <div className={styles.checkoutPage}>
                <div className={styles.container}>
                    <Breadcrumb items={breadcrumbItems} />
                    <EmptyCartState
                        title="سبد خرید شما خالی است"
                        description="برای ثبت سفارش، ابتدا باید محصولی به سبد خرید اضافه کنید."
                        buttonText="مشاهده محصولات"
                        buttonHref="/products"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={styles.checkoutPage}>
            <div className={styles.container}>
                <Breadcrumb items={breadcrumbItems} />

                <div className={styles.stepContainer}>
                    {status !== 'authenticated' ? (
                        <div style={{
                            background: 'var(--gradient-card-vertical)',
                            borderRadius: 'var(--radius-card)',
                            border: '1px solid fade(var(--color-primary), 20%)',
                            padding: '24px 28px',
                            boxShadow: 'var(--shadow-card-strong)'
                        }}>
                            <AuthForm
                                title="ورود به حساب کاربری"
                                subtitle="برای ثبت آدرس ارسال و پرداخت سفارش، لطفاً وارد شوید"
                            />
                        </div>
                    ) : (
                        <ShippingStep onPrevious={() => router.push('/cart')} />
                    )}
                </div>
            </div>
        </div>
    );
}
