import React from 'react';
import styles from './AdminShared.module.scss';

export default function AdminBadge({ status, text, variant = 'default' }) {
    // Attempt to map variant automatically from status if variant isn't explicitly provided
    let finalVariant = variant;
    if (variant === 'default') {
        const lowerStatus = String(status).toLowerCase();
        if (['available', 'published', 'success', 'user', 'green', 'completed', 'delivered'].includes(lowerStatus)) finalVariant = 'success';
        else if (['unavailable', 'error', 'admin', 'red', 'cancelled'].includes(lowerStatus)) finalVariant = 'error';
        else if (['draft', 'warning', 'yellow', 'processing', 'pending'].includes(lowerStatus)) finalVariant = 'warning';
        else if (['info', 'blue'].includes(lowerStatus)) finalVariant = 'info';
    }

    // Determine the class based on finalVariant
    let badgeClass = styles['badge--info']; // default fallback
    if (finalVariant === 'success') badgeClass = styles['badge--success'];
    else if (finalVariant === 'error') badgeClass = styles['badge--error'];
    else if (finalVariant === 'warning') badgeClass = styles['badge--warning'];
    else if (finalVariant === 'info') badgeClass = styles['badge--info'];
    else badgeClass = styles[`badge--${finalVariant}`] || styles['badge--info']; // allow explicit like badge--published

    return (
        <span className={`${styles.badge} ${badgeClass}`}>
            {text || status}
        </span>
    );
}
