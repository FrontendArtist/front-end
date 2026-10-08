'use client';

import React, { createContext, useContext, useMemo } from 'react';

const PermissionsContext = createContext({
    permissions: [],
    roles: [],
    isLoaded: false,
    hasPermission: () => false,
    hasAnyPermission: () => false,
    hasAllPermissions: () => false,
});

/**
 * کامپوننت ارائه‌دهنده مجوزهای متمرکز ادمین در سمت کلاینت
 * این کامپوننت مقادیر واکشی شده از سرور در AdminLayout را دریافت کرده و در سراسر درخت ادمین به اشتراک می‌گذارد.
 */
export function PermissionsProvider({
    children,
    initialPermissions = [],
    initialRoles = [],
    isLoaded = true,
}) {
    const permissions = useMemo(() => {
        return Array.isArray(initialPermissions) ? initialPermissions : [];
    }, [initialPermissions]);

    const roles = useMemo(() => {
        return Array.isArray(initialRoles) ? initialRoles : [];
    }, [initialRoles]);

    const value = useMemo(() => {
        const hasPermission = (permission) => {
            if (!permission) return true;
            return permissions.includes(permission);
        };

        const hasAnyPermission = (permissionList) => {
            if (!permissionList || permissionList.length === 0) return true;
            return permissionList.some((p) => permissions.includes(p));
        };

        const hasAllPermissions = (permissionList) => {
            if (!permissionList || permissionList.length === 0) return true;
            return permissionList.every((p) => permissions.includes(p));
        };

        return {
            permissions,
            roles,
            isLoaded,
            hasPermission,
            hasAnyPermission,
            hasAllPermissions,
        };
    }, [permissions, roles, isLoaded]);

    return (
        <PermissionsContext.Provider value={value}>
            {children}
        </PermissionsContext.Provider>
    );
}

/**
 * هوک استفاده از مجوزهای ادمین در کامپوننت‌های فرانت‌اند
 * @returns {{
 *   permissions: string[],
 *   roles: string[],
 *   isLoaded: boolean,
 *   hasPermission: (permission: string) => boolean,
 *   hasAnyPermission: (permissions: string[]) => boolean,
 *   hasAllPermissions: (permissions: string[]) => boolean
 * }}
 */
export function usePermissions() {
    const context = useContext(PermissionsContext);
    if (!context) {
        throw new Error('usePermissions must be used within a PermissionsProvider');
    }
    return context;
}
