import React from 'react';
import styles from './AdminShared.module.scss';

export default function AdminBadge({ status, text, label, children, variant = 'default' }) {
    const displayText = text || label || children || status || '—';

    // Attempt to map variant automatically from status if variant isn't explicitly provided
    let finalVariant = variant;
    if (variant === 'default') {
        const lowerStatus = String(displayText).toLowerCase();
        if (['available', 'published', 'success', 'user', 'green', 'completed', 'delivered', 'paid', 'پرداخت شده', 'تحویل شده'].includes(lowerStatus)) finalVariant = 'success';
        else if (['unavailable', 'error', 'admin', 'red', 'cancelled', 'canceled', 'failed', 'رد شده', 'ناموفق'].includes(lowerStatus)) finalVariant = 'error';
        else if (['draft', 'warning', 'yellow', 'processing', 'pending', 'در حال پردازش', 'در انتظار پرداخت', 'انتظار تأیید رسید'].includes(lowerStatus)) finalVariant = 'warning';
        else if (['info', 'blue', 'shipped', 'ارسال شده'].includes(lowerStatus)) finalVariant = 'info';
    }

    // Determine the class based on finalVariant
    let badgeClass = styles['badge--info']; // default fallback
    if (finalVariant === 'success') badgeClass = styles['badge--success'];
    else if (finalVariant === 'error') badgeClass = styles['badge--error'];
    else if (finalVariant === 'warning') badgeClass = styles['badge--warning'];
    else if (finalVariant === 'info') badgeClass = styles['badge--info'];
    else if (finalVariant === 'default') badgeClass = styles['badge--default'];
    else badgeClass = styles[`badge--${finalVariant}`] || styles['badge--info'];

    return (
        <span className={`${styles.badge} ${badgeClass}`}>
            {displayText}
        </span>
    );
}
