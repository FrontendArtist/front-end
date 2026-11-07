// سیاست امنیت محتوای ایستا (BND-08)، روش «بدون nonce» راهنمای Next.
// ارزش اصلی: بستن بارگذاری اسکریپت بیرونی و محدودکردن مقصد fetch/XHR به سایت، استرپی، بای‌مانی و رسانه.
// ضعف آگاهانه: 'unsafe-inline' اسکریپت درون‌خطِ تزریق‌شده را متوقف نمی‌کند (CSP با nonce پس از فاز اول)؛
// حفاظت اصلی توکن، عمر کوتاه آن است. تصویر و رسانه از هر https مجازند، چون محتوای ادمین (مقاله، درس) نشانی آزاد دارد.
// CommonJS است چون next.config.js آن را می‌خواند.

const SEP_GATEWAY_ORIGIN = 'https://sep.shaparak.ir';
const APARAT_ORIGIN = 'https://www.aparat.com';
// همان دامنه‌های رسانهٔ images.remotePatterns؛ پخش HLS قطعه‌ها را با XHR می‌گیرد.
const MEDIA_ORIGINS = ['https://*.tarhelahi.ir', 'https://*.liara.site'];

function originOf(url) {
    try {
        return new URL(url).origin;
    } catch {
        return null;
    }
}

function buildContentSecurityPolicy(env) {
    const isDev = env.NODE_ENV !== 'production';
    const strapiOrigin = originOf(
        env.NEXT_PUBLIC_STRAPI_URL || env.NEXT_PUBLIC_STRAPI_API_URL ||
        (isDev ? 'http://localhost:1337' : 'https://api.tarhelahi.ir')
    );
    const byeMoneyOrigin = originOf(
        env.NEXT_PUBLIC_BYEMONEY_API_URL || env.NEXT_PUBLIC_BYEMONEY_URL || 'http://localhost:5000'
    );
    const apiOrigins = [strapiOrigin, byeMoneyOrigin].filter(Boolean);
    // توسعه: HMR با websocket و استعلام IP عمومی VpnModal روی localhost.
    const devConnect = isDev ? ['ws:', 'http://ip-api.com'] : [];

    const directives = {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])],
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'blob:', 'https:', ...apiOrigins],
        'media-src': ["'self'", 'data:', 'blob:', 'https:', ...apiOrigins],
        'font-src': ["'self'", 'data:'],
        'connect-src': ["'self'", ...apiOrigins, ...MEDIA_ORIGINS, ...devConnect],
        'frame-src': [APARAT_ORIGIN],
        'worker-src': ["'self'", 'blob:'],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'frame-ancestors': ["'none'"],
        'form-action': ["'self'", SEP_GATEWAY_ORIGIN],
    };

    return Object.entries(directives)
        .map(([name, sources]) => `${name} ${[...new Set(sources)].join(' ')}`)
        .join('; ');
}

module.exports = { buildContentSecurityPolicy };
