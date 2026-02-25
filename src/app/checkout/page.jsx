'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCartStore, selectItemsCount } from '@/store/useCartStore';
import CheckoutStepper from '@/components/checkout/CheckoutStepper';
import CartReviewStep from '@/components/checkout/CartReviewStep';
import AuthStep from '@/components/checkout/AuthStep';
import ShippingStep from '@/components/checkout/ShippingStep';
import PaymentStep from '@/components/checkout/PaymentStep';
import Link from 'next/link';
import styles from './page.module.scss';

/**
 * صفحه Checkout چند مرحله‌ای
 * 
 * 4 مرحله:
 * 1. بررسی سبد خرید
 * 2. ورود/ثبت‌نام
 * 3. اطلاعات ارسال
 * 4. روش پرداخت
 */
export default function CheckoutPage() {
    const router = useRouter();
    const itemsCount = useCartStore(selectItemsCount);
    const [currentStep, setCurrentStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState([]);

    // بررسی سبد خرید خالی
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
     */
    const renderCurrentStep = () => {
        switch (currentStep) {
            case 1:
                return <CartReviewStep onNext={goToNextStep} />;
            case 2:
                return <AuthStep onNext={goToNextStep} />;
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
            />

            {/* مرحله فعلی */}
            <div className={styles.stepContainer}>
                {renderCurrentStep()}
            </div>
        </div>
    );
}
