'use client';

import React from 'react';
import styles from './Alert.module.scss';

const ICONS = {
    error: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    ),
    warning: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
    info: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    ),
    success: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    ),
};

/**
 * کامپوننت یکپارچه نمایش اعلان، هشدار و خطا
 *
 * @param {object} props
 * @param {'error'|'warning'|'info'|'success'} [props.variant='error']
 * @param {string} [props.title]
 * @param {React.ReactNode} props.children
 * @param {React.ReactNode} [props.action]
 * @param {string} [props.className]
 */
export default function Alert({
    variant = 'error',
    title = null,
    children,
    action = null,
    className = '',
    ...rest
}) {
    if (!children && !title) return null;

    const variantClass = styles[variant] || styles.error;
    const role = variant === 'error' || variant === 'warning' ? 'alert' : 'status';

    return (
        <div
            role={role}
            className={`${styles.alert} ${variantClass} ${className}`.trim()}
            {...rest}
        >
            <span className={styles.icon}>{ICONS[variant] || ICONS.error}</span>
            <div className={styles.content}>
                {title && <div className={styles.title}>{title}</div>}
                {children && <div className={styles.message}>{children}</div>}
            </div>
            {action && <div className={styles.action}>{action}</div>}
        </div>
    );
}
