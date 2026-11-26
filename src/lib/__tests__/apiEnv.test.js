/** @jest-environment node */

describe('Strapi URL startup validation (M19)', () => {
    const origEnv = process.env.NODE_ENV;
    const origPhase = process.env.NEXT_PHASE;
    const origUrl = process.env.NEXT_PUBLIC_STRAPI_URL;
    const origApiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL;
    const origServerUrl = process.env.STRAPI_API_URL;

    afterEach(() => {
        process.env.NODE_ENV = origEnv;
        if (origPhase !== undefined) process.env.NEXT_PHASE = origPhase;
        else delete process.env.NEXT_PHASE;
        if (origUrl !== undefined) process.env.NEXT_PUBLIC_STRAPI_URL = origUrl;
        else delete process.env.NEXT_PUBLIC_STRAPI_URL;
        if (origApiUrl !== undefined) process.env.NEXT_PUBLIC_STRAPI_API_URL = origApiUrl;
        else delete process.env.NEXT_PUBLIC_STRAPI_API_URL;
        if (origServerUrl !== undefined) process.env.STRAPI_API_URL = origServerUrl;
        else delete process.env.STRAPI_API_URL;
        jest.resetModules();
    });

    test('import کردن api.js در production بدون env نباید برنامه را هنگام بارگذاری ماژول بیندازد', () => {
        process.env.NODE_ENV = 'production';
        delete process.env.NEXT_PHASE;
        delete process.env.NEXT_PUBLIC_STRAPI_URL;
        delete process.env.NEXT_PUBLIC_STRAPI_API_URL;
        delete process.env.STRAPI_API_URL;

        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        try {
            jest.resetModules();
            const api = require('../api');
            expect(api.API_BASE_URL).toBe('https://api.tarhelahi.ir');
            expect(() => api.assertRequiredStrapiEnv()).toThrow(/NEXT_PUBLIC_STRAPI_URL/);
        } finally {
            errorSpy.mockRestore();
        }
    });

    test('assertRequiredStrapiEnv در phase-production-build یا با وجود env خطا نمی‌دهد', () => {
        process.env.NODE_ENV = 'production';
        delete process.env.NEXT_PUBLIC_STRAPI_URL;
        delete process.env.NEXT_PUBLIC_STRAPI_API_URL;
        delete process.env.STRAPI_API_URL;
        process.env.NEXT_PHASE = 'phase-production-build';

        jest.resetModules();
        const api = require('../api');
        expect(() => api.assertRequiredStrapiEnv()).not.toThrow();

        delete process.env.NEXT_PHASE;
        process.env.NEXT_PUBLIC_STRAPI_URL = 'https://api.tarhelahi.ir';
        expect(() => api.assertRequiredStrapiEnv()).not.toThrow();
    });
});
