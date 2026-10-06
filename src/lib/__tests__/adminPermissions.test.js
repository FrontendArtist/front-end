/** @jest-environment node */
jest.mock('../byeMoneySync.js', () => ({ BYEMONEY_API_URL: 'http://localhost:5000' }));
import { checkAdminTopUpPermissionWithByeMoney, clearAdminPermissionsCache } from '../byeMoneyApi';

const originalFetch = global.fetch;
beforeEach(() => {
    clearAdminPermissionsCache();
    global.fetch = jest.fn();
});
afterEach(() => { global.fetch = originalFetch; });

test.each([401, 403, 500, 503])('preserves actual permission API failure status (%i)', async status => {
    global.fetch.mockResolvedValue({ ok: false, status });
    expect(await checkAdminTopUpPermissionWithByeMoney({ jwt: 'staff-jwt' }))
        .toMatchObject({ hasPermission: false, status });
});

test.each([
    [{ permissions: ['TopUp.Review'], roles: ['Admin'] }, 200, true],
    [{ permissions: [], roles: [] }, 403, false],
    [{ canReviewTopUps: true }, 200, true],
])('maps successful permission response %j to %i', async (data, status, hasPermission) => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => data });
    expect(await checkAdminTopUpPermissionWithByeMoney({ jwt: 'staff-jwt' }))
        .toMatchObject({ hasPermission, status });
});

test('missing JWT is unauthorized without calling ByeMoney', async () => {
    expect(await checkAdminTopUpPermissionWithByeMoney({ jwt: null }))
        .toMatchObject({ hasPermission: false, status: 401 });
    expect(global.fetch).not.toHaveBeenCalled();
});

test('connection failure is unavailable and is not cached as a permission denial', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
        global.fetch.mockRejectedValueOnce(new Error('connection refused'));
        expect(await checkAdminTopUpPermissionWithByeMoney({ jwt: 'staff-jwt' }))
            .toMatchObject({ hasPermission: false, status: 503 });
        global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ permissions: ['TopUp.Review'] }) });
        expect(await checkAdminTopUpPermissionWithByeMoney({ jwt: 'staff-jwt' }))
            .toMatchObject({ hasPermission: true, status: 200 });
        expect(global.fetch).toHaveBeenCalledTimes(2);
    } finally {
        log.mockRestore();
    }
});
