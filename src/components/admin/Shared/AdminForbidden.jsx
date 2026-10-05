'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import styles from './AdminForbidden.module.scss';

/**
 * کامپوننت ۴۰۳ عدم دسترسی در پنل مدیریت
 */
export default function AdminForbidden({
    title = 'دسترسی غیرمجاز (خطای ۴۰۳)',
    description = 'شما مجوز لازم جهت دسترسی به این بخش را در سامانه ندارید. در صورت نیاز با مدیر ارشد هماهنگ نمایید.',
}) {
    return (
        <div className={styles.container}>
            <div className={styles.iconWrapper}>
                <ShieldAlert size={36} />
            </div>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>{description}</p>
            <div className={styles.actions}>
                <Link href="/admin" className={styles.backBtn}>
                    <span>بازگشت به داشبورد</span>
                    <ArrowRight size={16} />
                </Link>
            </div>
        </div>
    );
}
