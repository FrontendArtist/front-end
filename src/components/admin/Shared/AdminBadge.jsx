import React from 'react';
import styles from './AdminShared.module.scss';
import { ROLE_MAP, STATUS_MAP } from '@/utils/enumMappers';

export default function AdminBadge({ status, text, label, children, variant = 'default' }) {
    const rawValue = text || label || children || status;
    const rawKey = typeof rawValue === 'string' ? rawValue.trim() : rawValue ? String(rawValue).trim() : '';

    // ترجمه برچسب در صورت وجود معادل فارسی
    const displayText = ROLE_MAP[rawKey] || STATUS_MAP[rawKey] || rawKey || '—';

    // Attempt to map variant automatically from status if variant isn't explicitly provided
    let finalVariant = variant;
    if (variant === 'default') {
        const lowerRaw = rawKey.toLowerCase();
        const lowerDisplay = String(displayText).toLowerCase();

        if ([
            'available', 'published', 'success', 'green', 'completed', 'delivered', 'paid', 'granted',
            'پرداخت شده', 'تحویل شده', 'پرداخت آنلاین موفق', 'اعطا شد', 'موفق', 'تکمیل شده', 'تأیید شده'
        ].includes(lowerRaw) || [
            'اعطا شد', 'موفق', 'تکمیل شده', 'تأیید شده', 'پرداخت شده'
        ].includes(lowerDisplay)) {
            finalVariant = 'success';
        } else if ([
            'unavailable', 'error', 'admin', 'administrator', 'red', 'cancelled', 'canceled', 'failed',
            'رد شده', 'ناموفق', 'مدیر کل', 'مدیر سیستم', 'لغو شده', 'خطا'
        ].includes(lowerRaw) || [
            'رد شده', 'ناموفق', 'مدیر کل', 'مدیر سیستم', 'لغو شده', 'خطا'
        ].includes(lowerDisplay)) {
            finalVariant = 'error';
        } else if ([
            'draft', 'warning', 'yellow', 'processing', 'pending',
            'در حال پردازش', 'در انتظار پرداخت', 'انتظار تأیید رسید', 'در انتظار پرداخت آنلاین', 'در انتظار'
        ].includes(lowerRaw) || [
            'در حال پردازش', 'در انتظار پرداخت', 'انتظار تأیید رسید', 'در انتظار'
        ].includes(lowerDisplay)) {
            finalVariant = 'warning';
        } else if ([
            'info', 'blue', 'shipped', 'ارسال شده', 'financial_manager', 'مدیر مالی'
        ].includes(lowerRaw) || [
            'ارسال شده', 'مدیر مالی'
        ].includes(lowerDisplay)) {
            finalVariant = 'info';
        } else if ([
            'authenticated', 'user', 'public', 'کاربر عادی', 'کاربر مهمان'
        ].includes(lowerRaw) || [
            'کاربر عادی', 'کاربر مهمان'
        ].includes(lowerDisplay)) {
            finalVariant = 'default';
        }
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
