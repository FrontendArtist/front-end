'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { usePermissions } from '@/context/PermissionsContext';
import { getRequiredPermissionsForRoute } from '@/config/adminPermissions';
import AdminForbidden from '@/components/admin/Shared/AdminForbidden';

/**
 * گارد مسیرهای مدیریت جهت بررسی دسترسی صفحه با توجه به URL فعلی
 */
export default function AdminRouteGuard({ children }) {
    const pathname = usePathname();
    const { hasAllPermissions, isLoaded } = usePermissions();

    const requiredPermissions = getRequiredPermissionsForRoute(pathname);

    // اگر مسیر به مجوز خاصی نیاز ندارد یا هنوز در حال لود است
    if (!requiredPermissions || requiredPermissions.length === 0) {
        return <>{children}</>;
    }

    // اگر دسترسی‌های مورد نیاز در آرایه permissions کاربر نبود
    const isAllowed = hasAllPermissions(requiredPermissions);

    if (!isAllowed) {
        return (
            <AdminForbidden
                title="عدم دسترسی به این صفحه (خطای ۴۰۳)"
                description="حساب کاربری شما دارای مجوز لازم برای دسترسی به این بخش مدیریتی نمی‌باشد."
            />
        );
    }

    return <>{children}</>;
}
