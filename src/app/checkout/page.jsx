'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCartStore, selectItemsCount, selectTotalPrice } from '@/store/useCartStore';
import CheckoutStepper from '@/components/checkout/CheckoutStepper';
import CartReviewStep from '@/components/checkout/CartReviewStep';
import AuthStep from '@/components/checkout/AuthStep';
import PaymentStep from '@/components/checkout/PaymentStep';
import Link from 'next/link';
import styles from './page.module.scss';

/**
 * صفحه Checkout چند مرحله‌ای
 * 
 * اگر سبد فقط دوره/فصل داشته باشد: 3 مرحله (CartReview > Auth > Payment)
 * اگر محصول فیزیکی هم داشته باشد: 4 مرحله (با مرحله آدرس)
 */
export default function CheckoutPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const items = useCartStore((state) => state.items);
    const itemsCount = useCartStore(selectItemsCount);
    const totalPrice = useCartStore(selectTotalPrice);
    const [currentStep, setCurrentStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState([]);
    /**
     * Hydration Fix
     * صبر می‌کنیم تا store از localStorage بارگذاری شود
     * بدون این، ممکن است itemsCount=0 قبل از لود شدن داده‌ها باشد
     */
    const [isHydrated, setIsHydrated] = useState(false);
    useEffect(() => {
        setIsHydrated(true);
    }, []);

    // ملاحظه: redirect پس از پرداخت توسط PaymentStep مدیریت می‌شود، نه اینجا.
    // حذف این useEffect جلوگیری می‌کند از بازنویسی URL ?source=card_to_card
    // که PaymentStep برای کارت‌به‌کارت ساخته است.

    // قبل از hydration، loading skeleton نمایش می‌دهیم
    if (!isHydrated) {
        return (
            <div className={`${styles.checkoutPage} container`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', padding: '60px 0' }}>
                    <div style={{ width: '200px', height: '24px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
                    <div style={{ width: '100%', maxWidth: '600px', height: '80px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} />
                    <div style={{ width: '100%', maxWidth: '600px', height: '300px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} />
                </div>
            </div>
        );
    }

    // بررسی سبد خرید خالی (فقط بعد از hydration)
    if (itemsCount === 0) {
        return (
            <div className={`${styles.checkoutPage} container`}>
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="9" cy="21" r="1" />
                            <circle cx="20" cy="21" r="1" />
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                        </svg>
                    </div>
                    <h2 className={styles.emptyTitle}>سبد خرید شما خالی است</h2>
                    <p className={styles.emptyText}>
                        برای تسویه حساب، ابتدا باید محصولی به سبد خرید اضافه کنید.
                    </p>
                    <Link href="/products" className={styles.emptyButton}>
                        مشاهده محصولات
                    </Link>
                </div>
            </div>
        );
    }

    /**
     * تشخیص سبد فقط-دوره
     * اگر تمام آیت‌م‌ها course یا chapter باشند، نیازی به آدرس نیست
     */
    const isCoursesOnly = items.length > 0 && items.every(
        (item) => item.type === 'course' || item.type === 'chapter'
    );

    /**
     * Navigation Handlers
     */
    const goToNextStep = () => {
        setCompletedSteps([...completedSteps, currentStep]);
        setCurrentStep(currentStep + 1);
    };

    const goToPreviousStep = () => {
        setCurrentStep(currentStep - 1);
    };

    const goToStep = (stepNumber) => {
        // فقط اجازه رفتن به مراحل تکمیل‌شده
        if (completedSteps.includes(stepNumber)) {
            setCurrentStep(stepNumber);
        }
    };

    /**
     * رندر مرحله فعلی
     * اگر isCoursesOnly: 3 مرحله (1سبد خرید, 2ورود, 3پرداخت)
     * اگر محصول هم دارد: 4 مرحله (با مرحله آدرس)
     */
    const renderCurrentStep = () => {
        if (isCoursesOnly) {
            // جریان 3مرحله‌ای
            switch (currentStep) {
                case 1:
                    return <CartReviewStep onNext={goToNextStep} />;
                case 2:
                    return <AuthStep onNext={goToNextStep} totalPrice={totalPrice} />;
                case 3:
                    return <PaymentStep onPrevious={goToPreviousStep} />;
                default:
                    return <CartReviewStep onNext={goToNextStep} />;
            }
        }

        // جریان 4مرحله‌ای (شامل آدرس)
        // ایمپورت ShippingStep در صورت نیاز dynamic بارگذاری می‌شود
        const ShippingStep = require('@/components/checkout/ShippingStep').default;
        switch (currentStep) {
            case 1:
                return <CartReviewStep onNext={goToNextStep} />;
            case 2:
                return <AuthStep onNext={goToNextStep} totalPrice={totalPrice} />;
            case 3:
                return (
                    <ShippingStep
                        onNext={goToNextStep}
                        onPrevious={goToPreviousStep}
                    />
                );
            case 4:
                return <PaymentStep onPrevious={goToPreviousStep} />;
            default:
                return <CartReviewStep onNext={goToNextStep} />;
        }
    };

    return (
        <div className={`${styles.checkoutPage} container`}>
            <h1 className={styles.pageTitle}>تسویه حساب</h1>

            {/* Stepper */}
            <CheckoutStepper
                currentStep={currentStep}
                completedSteps={completedSteps}
                onStepClick={goToStep}
                isCoursesOnly={isCoursesOnly}
            />

            {/* مرحله فعلی */}
            <div className={styles.stepContainer}>
                {renderCurrentStep()}
            </div>
        </div>
    );
}
