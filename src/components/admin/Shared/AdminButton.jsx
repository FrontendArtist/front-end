import React from 'react';
import styles from './AdminShared.module.scss';
import Link from 'next/link';

export default function AdminButton({
    children,
    variant = 'default',
    onClick,
    type = 'button',
    href,
    disabled = false,
    className = '',
    ...props
}) {
    const btnClass = `${styles.btnAction} ${styles[`btnAction--${variant}`] || styles['btnAction--default']} ${className}`;

    if (href) {
        return (
            <Link href={href} className={btnClass} {...props}>
                {children}
            </Link>
        );
    }

    return (
        <button
            type={type}
            className={btnClass}
            onClick={onClick}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
}
