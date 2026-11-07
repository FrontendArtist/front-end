/**
 * نگهبان BND-07: هیچ فایل سمت مرورگر ('use client') توابع مسیرهای ادمین بای‌مانی را import نکند؛
 * این مسیرها فقط از routeهای سروری Next و با JWT نشست سروری صدا زده می‌شوند.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '../../..');
const ADMIN_FUNCTION = /^(sendNoorGift\w*|createAdminAssistedTopUp\w*|getBatchBalances\w*|getAdmin\w*|purchaseCoursesAsAdmin\w*|confirmTopUp\w*|rejectTopUp\w*|updatePhysicalPurchaseDeliveryStatus|getPendingPhysicalRestocks)$/;
const BYEMONEY_IMPORT = /import\s*\{([^}]*)\}\s*from\s*['"]@\/lib\/byeMoneyApi['"]/g;
const USE_CLIENT = /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*['"]use client['"]/;

function sourceFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
        return /\.(jsx?|tsx?)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : [];
    });
}

function adminImports(source) {
    return [...source.matchAll(BYEMONEY_IMPORT)]
        .flatMap((match) => match[1].split(','))
        .map((name) => name.trim().split(/\s+as\s+/)[0])
        .filter((name) => ADMIN_FUNCTION.test(name));
}

describe('BND-07: client components do not call ByeMoney admin endpoints', () => {
    test('detector recognizes a forbidden client import', () => {
        const sample = "'use client';\nimport { getConversionRateWithByeMoney, sendNoorGiftWithByeMoney as send } from '@/lib/byeMoneyApi';";
        expect(USE_CLIENT.test(sample)).toBe(true);
        expect(adminImports(sample)).toEqual(['sendNoorGiftWithByeMoney']);
    });

    test('no use-client file imports an admin ByeMoney function', () => {
        const violations = sourceFiles(SRC)
            .map((file) => ({ file, source: fs.readFileSync(file, 'utf8') }))
            .filter(({ source }) => USE_CLIENT.test(source))
            .map(({ file, source }) => ({ file: path.relative(SRC, file), names: adminImports(source) }))
            .filter(({ names }) => names.length > 0);
        expect(violations).toEqual([]);
    });
});
