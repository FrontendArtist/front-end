import { NextResponse } from 'next/server';
import { isIP } from 'node:net';

export const dynamic = 'force-dynamic';
const ipCache = new Map();
const inFlight = new Map();
const CACHE_TTL_MS = 120000;
const UNKNOWN_TTL_MS = 10000;
const REFRESH_INTERVAL_MS = 10000;
// سهمیه و کش در هر پردازش مشترک‌اند؛ چند نمونهٔ سرور به ذخیره‌ساز مشترک نیاز دارند.
let cooldownUntil = 0;
let budgetWindowStartedAt = 0;
let budgetUsed = 0;
const LOCAL_REQUEST_BUDGET = 40;
const json = body => NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
const unknown = reason => ({ success: false, status: 'unknown', isVpn: null, reason });
const VPN_DATACENTER_KEYWORDS = [
  'm247', 'hetzner', 'digitalocean', 'ovh', 'linode', 'vultr', 'leaseweb', 'hostinger',
  'aws', 'amazon', 'google', 'azure', 'microsoft', 'cloudflare', 'fastly', 'expressvpn',
  'nordvpn', 'surfshark', 'proton', 'cyberghost', 'mullvad', 'private internet access',
  'pia', 'vpn', 'vps', 'proxy', 'hosting', 'datacenter', 'cloud', 'servers', 'dedicated',
];
function normalizeIp(value = '') {
  return value.trim().replace(/^::ffff:/i, '');
}
function isPublicIp(ip) {
  const version = isIP(ip);
  if (!version) return false;
  if (version === 4) {
    return !/^(?:0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(ip);
  }
  return !/^(?:::$|::1$|f[cd]|fe[89ab])/i.test(ip);
}
function saveResult(ip, data, lastRefreshAt) {
  if (!ipCache.has(ip) && ipCache.size >= 500) ipCache.delete(ipCache.keys().next().value);
  ipCache.set(ip, { data, checkedAt: Date.now(), lastRefreshAt });
  return data;
}
function updateProviderLimit(response) {
  const remaining = response.headers?.get('X-Rl');
  if (response.status !== 429 && (remaining === null || remaining === undefined || Number(remaining) !== 0)) return;
  const seconds = Number(response.headers?.get('X-Ttl'));
  // نبود هدر معتبر: یک دقیقه توقف؛ refresh این توقف را دور نمی‌زند.
  const waitMs = Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds * 1000) : 60000;
  cooldownUntil = Math.max(cooldownUntil, Date.now() + waitMs);
}
async function lookupIp(clientIp) {
  try {
    const response = await fetch(
      `http://ip-api.com/json/${clientIp}?fields=status,country,countryCode,isp,org,as,proxy,hosting,query`,
      { cache: 'no-store', signal: AbortSignal.timeout(1500) }
    );
    updateProviderLimit(response);
    if (!response.ok) return unknown(response.status === 429 ? 'rate_limited' : 'provider_error');
    const data = await response.json();
    if (data.status !== 'success' || !/^[A-Z]{2}$/.test(data.countryCode || '')) return unknown('invalid_response');
    const provider = `${data.isp || ''} ${data.org || ''} ${data.as || ''}`.toLowerCase();
    const providerMatched = VPN_DATACENTER_KEYWORDS.some(keyword => provider.includes(keyword));
    const isVpn = data.proxy === true || data.hosting === true || providerMatched || data.countryCode !== 'IR';
    return {
      success: true, status: isVpn ? 'blocked' : 'allowed', isVpn,
      ip: clientIp, country: data.country, countryCode: data.countryCode, isp: data.isp,
    };
  } catch (error) {
    console.warn('[check-vpn] Provider unavailable:', error.name);
    return unknown('provider_unavailable');
  }
}
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  // پراکسی ورودی باید این هدرها را تنظیم کند. IP خصوصی یک هدر، هدر عمومی دیگر را پنهان نمی‌کند.
  const candidates = [
    request.headers.get('cf-connecting-ip'), request.headers.get('x-real-ip'),
    ...(request.headers.get('x-forwarded-for') || '').split(','),
  ].filter(Boolean).map(normalizeIp);
  const connectionIp = candidates.find(isPublicIp);
  const localTestIp = !connectionIp && process.env.NODE_ENV === 'development'
    ? normalizeIp(searchParams.get('ip') || '') : '';
  const clientIp = connectionIp || (isPublicIp(localTestIp) ? localTestIp : null);
  if (!clientIp) {
    if (process.env.NODE_ENV === 'development') return json({ ...unknown('local_connection'), isLocal: true });
    console.warn('[check-vpn] Public client IP unavailable');
    return json(unknown('client_ip_unavailable'));
  }
  const now = Date.now();
  const refresh = searchParams.get('refresh') === '1';
  const cached = ipCache.get(clientIp);
  const cacheTtl = cached?.data.success ? CACHE_TTL_MS : UNKNOWN_TTL_MS;
  if (!refresh && cached && now - cached.checkedAt < cacheTtl) return json(cached.data);
  if (inFlight.has(clientIp)) return json(await inFlight.get(clientIp));
  if (refresh && cached?.lastRefreshAt !== undefined && now - cached.lastRefreshAt < REFRESH_INTERVAL_MS) return json(cached.data);
  if (now < cooldownUntil) return json(unknown('rate_limited'));
  if (now - budgetWindowStartedAt >= 60000) {
    budgetWindowStartedAt = now;
    budgetUsed = 0;
  }
  if (budgetUsed >= LOCAL_REQUEST_BUDGET) return json(unknown('rate_limited'));
  // یک استعلام هم‌زمان؛ سهمیهٔ پاسخ قبلی پیش از درخواست بعدی بررسی می‌شود.
  // کاربران دیگر در صف نمی‌مانند: وضعیت نامشخص، با امکان ادامهٔ پرداخت.
  if (inFlight.size > 0) return json(unknown('provider_busy'));
  budgetUsed += 1;
  const lastRefreshAt = refresh ? now : cached?.lastRefreshAt;
  const pending = lookupIp(clientIp).then(data => saveResult(clientIp, data, lastRefreshAt));
  inFlight.set(clientIp, pending);
  try { return json(await pending); }
  finally { inFlight.delete(clientIp); }
}
