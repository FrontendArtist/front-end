'use client';

import styles from './CheckoutStepper.module.scss';

/**
 * کامپوننت Stepper برای نمایش مراحل checkout
 * 
 * @param {number} currentStep - مرحله فعلی (1-4)
 * @param {number[]} completedSteps - آرایه مراحل تکمیل‌شده
 * @param {function} onStepClick - callback برای کلیک روی مراحل تکمیل‌شده
 */
export default function CheckoutStepper({ currentStep, completedSteps = [], onStepClick }) {
    const steps = [
        { number: 1, title: 'سبد خرید', icon: 'cart' },
        { number: 2, title: 'ورود', icon: 'user' },
        { number: 3, title: 'آدرس', icon: 'location' },
        { number: 4, title: 'پرداخت', icon: 'payment' },
    ];

    const getStepStatus = (stepNumber) => {
        if (completedSteps.includes(stepNumber)) return 'completed';
        if (stepNumber === currentStep) return 'active';
        return 'pending';
    };

    const handleStepClick = (stepNumber) => {
        // فقط اجازه کلیک روی مراحل تکمیل‌شده
        if (completedSteps.includes(stepNumber) && onStepClick) {
            onStepClick(stepNumber);
        }
    };

    const renderIcon = (iconType) => {
        switch (iconType) {
            case 'cart':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="9" cy="21" r="1" />
                        <circle cx="20" cy="21" r="1" />
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                );
            case 'user':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M6 20c0-3.333 3-6 6-6s6 2.667 6 6" />
                    </svg>
                );
            case 'location':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                    </svg>
                );
            case 'payment':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <div className={styles.stepper}>
            {steps.map((step, index) => {
                const status = getStepStatus(step.number);
                const isClickable = completedSteps.includes(step.number);

                return (
                    <div key={step.number} className={styles.stepWrapper}>
                        {/* Step Circle */}
                        <div
                            className={`${styles.step} ${styles[status]} ${isClickable ? styles.clickable : ''}`}
                            onClick={() => handleStepClick(step.number)}
                        >
                            <div className={styles.stepCircle}>
                                {status === 'completed' ? (
                                    // آیکون تیک برای مراحل تکمیل‌شده
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                ) : (
                                    // آیکون مرحله
                                    renderIcon(step.icon)
                                )}
                            </div>
                            <div className={styles.stepInfo}>
                                <span className={styles.stepNumber}>{step.number}</span>
                                <span className={styles.stepTitle}>{step.title}</span>
                            </div>
                        </div>

                        {/* Connector Line */}
                        {index < steps.length - 1 && (
                            <div
                                className={`${styles.connector} ${completedSteps.includes(step.number) ? styles.completed : ''
                                    }`}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
