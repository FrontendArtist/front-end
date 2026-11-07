import { refreshSessionToken, shouldRefreshJwt, SESSION_EXPIRED_ERROR } from '../strapiTokenRefresh';

const HOUR = 60 * 60;
const NOW = 1_800_000_000;

function fakeJwt(iat, exp) {
    const encode = (value) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${encode({ alg: 'HS256' })}.${encode({ id: 7, documentId: 'doc-7', iat, exp })}.sig`;
}

function mockFetch(status, body) {
    global.fetch = jest.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
}

describe('strapiTokenRefresh (BND-08)', () => {
    const originalEnv = process.env.STRAPI_API_TOKEN;

    beforeEach(() => {
        process.env.STRAPI_API_TOKEN = 'server-api-token';
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        process.env.STRAPI_API_TOKEN = originalEnv;
        jest.restoreAllMocks();
        delete global.fetch;
    });

    test('does not refresh before half of the lifetime', async () => {
        mockFetch(200, { jwt: 'new' });
        const token = { jwt: fakeJwt(NOW - 20 * 60, NOW + 40 * 60) };
        const result = await refreshSessionToken(token, NOW);
        expect(global.fetch).not.toHaveBeenCalled();
        expect(result.jwt).toBe(token.jwt);
    });

    test('refreshes after half of the lifetime through the server API token', async () => {
        mockFetch(200, { jwt: 'new-jwt' });
        const oldJwt = fakeJwt(NOW - 40 * 60, NOW + 20 * 60);
        const result = await refreshSessionToken({ jwt: oldJwt, error: 'old' }, NOW);

        expect(result.jwt).toBe('new-jwt');
        expect(result.error).toBeUndefined();
        const [url, init] = global.fetch.mock.calls[0];
        expect(url).toMatch(/\/api\/auth\/token\/refresh$/);
        expect(init.headers.Authorization).toBe('Bearer server-api-token');
        expect(JSON.parse(init.body)).toEqual({ jwt: oldJwt });
    });

    test('rejected refresh marks the session expired and drops the jwt', async () => {
        mockFetch(401, {});
        const result = await refreshSessionToken({ jwt: fakeJwt(NOW - 40 * 60, NOW + 20 * 60) }, NOW);
        expect(result.error).toBe(SESSION_EXPIRED_ERROR);
        expect(result.jwt).toBeUndefined();
    });

    test('temporary outage keeps a still-valid token', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
        const jwt = fakeJwt(NOW - 40 * 60, NOW + 20 * 60);
        const result = await refreshSessionToken({ jwt }, NOW);
        expect(result.jwt).toBe(jwt);
        expect(result.error).toBeUndefined();
    });

    test('outage with an already expired token expires the session', async () => {
        mockFetch(503, {});
        const result = await refreshSessionToken({ jwt: fakeJwt(NOW - 2 * HOUR, NOW - HOUR) }, NOW);
        expect(result.error).toBe(SESSION_EXPIRED_ERROR);
    });

    test('tokens without times are left untouched', () => {
        expect(shouldRefreshJwt('not-a-jwt', NOW)).toBe(false);
    });
});
