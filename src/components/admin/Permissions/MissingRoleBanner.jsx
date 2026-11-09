'use client';

import React from 'react';
import { usePermissions } from '@/context/PermissionsContext';
import styles from './MissingRoleBanner.module.scss';

/**
 * هشدار سراسری: وقتی پاسخ ByeMoney موفق بوده ولی ادمین هیچ مجوزی ندارد
 * (نقش بای‌مانی تخصیص داده نشده است).
 */
export default function MissingRoleBanner() {
    const { permissions, isLoaded } = usePermissions();

    if (!isLoaded || permissions.length > 0) return null;

    return (
        <div className={styles.banner} role="alert">
            حساب شما در بای‌مانی نقشی ندارد و بخش‌های مالی پنل ممکن است ناقص یا خالی نمایش داده شوند.
            برای تخصیص نقش، مسئول فنی باید اسکریپت <code dir="ltr">scripts/assign-admin-role.sql</code> را اجرا کند.
        </div>
    );
}
