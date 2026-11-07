const { buildContentSecurityPolicy } = require('../contentSecurityPolicy');
const nextConfig = require('../../../next.config');

const directive = (policy, name) => policy.split('; ').find((part) => part.startsWith(`${name} `));

describe('content security policy (BND-08)', () => {
    const production = {
        NODE_ENV: 'production',
        NEXT_PUBLIC_STRAPI_URL: 'https://api.tarhelahi.ir/api',
        NEXT_PUBLIC_BYEMONEY_API_URL: 'https://wallet.tarhelahi.ir',
    };

    test('production policy limits scripts, connections, frames and forms', () => {
        const policy = buildContentSecurityPolicy(production);
        expect(directive(policy, 'script-src')).toBe("script-src 'self' 'unsafe-inline'");
        expect(directive(policy, 'connect-src')).toContain('https://api.tarhelahi.ir');
        expect(directive(policy, 'connect-src')).toContain('https://wallet.tarhelahi.ir');
        expect(directive(policy, 'connect-src')).not.toContain('ws:');
        expect(directive(policy, 'form-action')).toBe("form-action 'self' https://sep.shaparak.ir");
        expect(directive(policy, 'frame-src')).toBe('frame-src https://www.aparat.com');
        expect(policy).toContain("object-src 'none'");
        expect(policy).toContain("frame-ancestors 'none'");
    });

    test('development allows eval and HMR websocket', () => {
        const policy = buildContentSecurityPolicy({ NODE_ENV: 'development' });
        expect(directive(policy, 'script-src')).toContain("'unsafe-eval'");
        expect(directive(policy, 'connect-src')).toContain('http://localhost:1337');
        expect(directive(policy, 'connect-src')).toContain('http://localhost:5000');
        expect(directive(policy, 'connect-src')).toContain('ws:');
    });

    test.each([
        [undefined, 'Content-Security-Policy'],
        ['true', 'Content-Security-Policy-Report-Only'],
    ])('CSP_REPORT_ONLY=%s sends %s on every path', async (reportOnly, headerName) => {
        const original = process.env.CSP_REPORT_ONLY;
        if (reportOnly === undefined) delete process.env.CSP_REPORT_ONLY;
        else process.env.CSP_REPORT_ONLY = reportOnly;
        try {
            const [rule] = await nextConfig.headers();
            expect(rule.source).toBe('/:path*');
            expect(rule.headers[0].key).toBe(headerName);
            expect(rule.headers[0].value).toContain('form-action');
        } finally {
            if (original === undefined) delete process.env.CSP_REPORT_ONLY;
            else process.env.CSP_REPORT_ONLY = original;
        }
    });
});
