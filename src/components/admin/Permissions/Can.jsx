'use client';

import React from 'react';
import { usePermissions } from '@/context/PermissionsContext';

/**
 * کامپوننت Can جهت نمایش یا پنهان‌سازی مشروط عناصر بر اساس مجوزهای کاربر
 * 
 * مثال:
 * <Can permission="TopUp.Review">
 *   <button>افزایش شارژ کارت به کارت</button>
 * </Can>
 * 
 * <Can permission={['Noor.Inject', 'TopUp.Review']} any>
 *   <SpecialActions />
 * </Can>
 * 
 * @param {object} props
 * @param {string | string[]} props.permission - مجوز یا آرایه‌ای از مجوزها
 * @param {boolean} [props.any=true] - اگر آرایه است، آیا داشتن حداقل یکی کافی است؟
 * @param {boolean} [props.all=false] - آیا داشتن تمام مجوزهای آرایه الزامی است؟
 * @param {React.ReactNode} [props.fallback=null] - عنصری که در صورت عدم دسترسی نمایش داده می‌شود
 * @param {React.ReactNode} props.children
 */
export default function Can({
    permission,
    any = true,
    all = false,
    fallback = null,
    children,
}) {
    const { hasPermission, hasAnyPermission, hasAllPermissions, isLoaded } = usePermissions();

    if (!permission) {
        return <>{children}</>;
    }

    let allowed = false;

    if (Array.isArray(permission)) {
        if (all) {
            allowed = hasAllPermissions(permission);
        } else {
            allowed = hasAnyPermission(permission);
        }
    } else if (typeof permission === 'string') {
        allowed = hasPermission(permission);
    }

    if (!allowed) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
