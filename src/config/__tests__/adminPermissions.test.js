import { ADMIN_PERMISSIONS, ROUTE_PERMISSIONS, getRequiredPermissionsForRoute } from '../adminPermissions';

describe('Admin Permissions Configuration', () => {
    test('ADMIN_PERMISSIONS matches ByeMoney permission codes exactly', () => {
        expect(ADMIN_PERMISSIONS.NOOR_INJECT).toBe('Noor.Inject');
        expect(ADMIN_PERMISSIONS.TOPUP_REVIEW).toBe('TopUp.Review');
        expect(ADMIN_PERMISSIONS.COURSES_MANAGE).toBe('Courses.Manage');
        expect(ADMIN_PERMISSIONS.WALLET_VIEW).toBe('Wallet.View');
    });

    test('ROUTE_PERMISSIONS assigns Courses.Manage to /admin/orders/new and TopUp.Review to /admin/gateway-reviews', () => {
        expect(ROUTE_PERMISSIONS['/admin/orders/new']).toEqual([ADMIN_PERMISSIONS.COURSES_MANAGE]);
        expect(ROUTE_PERMISSIONS['/admin/gateway-reviews']).toEqual([ADMIN_PERMISSIONS.TOPUP_REVIEW]);
    });

    test('getRequiredPermissionsForRoute correctly resolves routes', () => {
        expect(getRequiredPermissionsForRoute('/admin/orders/new')).toEqual([ADMIN_PERMISSIONS.COURSES_MANAGE]);
        expect(getRequiredPermissionsForRoute('/admin/gateway-reviews')).toEqual([ADMIN_PERMISSIONS.TOPUP_REVIEW]);
        expect(getRequiredPermissionsForRoute('/admin/orders')).toBeNull();
        expect(getRequiredPermissionsForRoute('/admin/users')).toBeNull();
        expect(getRequiredPermissionsForRoute('/admin')).toBeNull();
    });
});
