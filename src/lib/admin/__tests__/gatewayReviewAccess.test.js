/** @jest-environment node */
jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/byeMoneyApi', () => ({ checkAdminTopUpPermissionWithByeMoney: jest.fn() }));
import { getServerSession } from 'next-auth/next';
import { checkAdminTopUpPermissionWithByeMoney } from '@/lib/byeMoneyApi';
import { getGatewayReviewAccess } from '../gatewayReviewAccess';

beforeEach(() => jest.clearAllMocks());
test('does not require a Strapi administrator role when ByeMoney authorizes finance staff', async () => {
    getServerSession.mockResolvedValue({ user: { jwt: 'staff', role: { type: 'authenticated' } } });
    checkAdminTopUpPermissionWithByeMoney.mockResolvedValue({ hasPermission: true });
    expect((await getGatewayReviewAccess()).status).toBe(200);
});
test('denies an administrator without ByeMoney permission', async () => {
    getServerSession.mockResolvedValue({ user: { jwt: 'staff', role: { type: 'administrator' } } });
    checkAdminTopUpPermissionWithByeMoney.mockResolvedValue({ hasPermission: false });
    expect((await getGatewayReviewAccess()).status).toBe(403);
});
test('missing session is unauthorized', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await getGatewayReviewAccess()).status).toBe(401);
    expect(checkAdminTopUpPermissionWithByeMoney).not.toHaveBeenCalled();
});

test.each([401, 403, 500, 503])('preserves permission service failure status (%i)', async status => {
    getServerSession.mockResolvedValue({ user: { jwt: 'staff' } });
    checkAdminTopUpPermissionWithByeMoney.mockResolvedValue({ hasPermission: false, status });
    expect((await getGatewayReviewAccess()).status).toBe(status);
});
