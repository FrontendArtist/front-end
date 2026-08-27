import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// لیست کلیدواژه‌های دیتاسنترها و ارائه‌دهندگان VPN سرور
const VPN_DATACENTER_KEYWORDS = [
  'm247', 'hetzner', 'digitalocean', 'ovh', 'linode', 'vultr', 'leaseweb', 'hostinger',
  'aws', 'amazon', 'google', 'azure', 'microsoft', 'cloudflare', 'fastly', 'expressvpn', 
  'nordvpn', 'surfshark', 'proton', 'cyberghost', 'mullvad', 'private internet access', 
  'pia', 'vpn', 'vps', 'proxy', 'hosting', 'datacenter', 'cloud', 'servers', 'dedicated'
];

// لیست برخی از شناخته‌شده‌ترین ISPهای عمومی ایران
const IRANIAN_ISP_KEYWORDS = [
  'mci', 'mobile telecommunication', 'irancell', 'shatel', 'asiatech', 'tci',
  'telecommunication company of iran', 'parsonline', 'rightel', 'mobinet',
  'pishgaman', 'hiweb', 'fanava', 'datak', 'afranet', 'resanet', 'iran'
];

function isPrivateIp(ip) {
  if (!ip) return true;
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === 'localhost' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)
  );
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customIp = searchParams.get('ip');

    // ۱. استخراج IP کاربر از پارامتر یا هدرهای درخواست
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfIp = request.headers.get('cf-connecting-ip');

    let clientIp = customIp || cfIp || realIp || (forwardedFor ? forwardedFor.split(',')[0].trim() : null);

    // اگر IP اختصاصی ارسال نشده بود و IP لوکال بود
    if (!customIp && (!clientIp || isPrivateIp(clientIp))) {
      return NextResponse.json({
        success: true,
        isVpn: false,
        isLocal: true,
        ip: clientIp || '127.0.0.1',
      });
    }

    // ۲. فراخوانی API رایگان ip-api.com با فیلدهای مورد نیاز
    const apiUrl = `http://ip-api.com/json/${clientIp}?fields=status,message,country,countryCode,isp,org,as,proxy,hosting,query`;
    
    const apiRes = await fetch(apiUrl, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    if (!apiRes.ok) {
      return NextResponse.json({ success: true, isVpn: false, ip: clientIp });
    }

    const data = await apiRes.json();

    if (data.status !== 'success') {
      return NextResponse.json({ success: true, isVpn: false, ip: clientIp });
    }

    const ispLower = (data.isp || '').toLowerCase();
    const orgLower = (data.org || '').toLowerCase();
    const asLower = (data.as || '').toLowerCase();
    const fullProviderStr = `${ispLower} ${orgLower} ${asLower}`;

    // ۳. بررسی فیلدهای اختصاصی دیتاسنتر و پروکسی
    const isProxy = Boolean(data.proxy);
    const isHosting = Boolean(data.hosting);

    // بررسی وجود کلیدواژه‌های دیتاسنتر و وی‌پای‌ان
    const hasVpnKeyword = VPN_DATACENTER_KEYWORDS.some((kw) => fullProviderStr.includes(kw));
    
    // بررسی اینکه آیا ISP جزو اینترنت خانگی/موبایل ایران است یا خیر
    const isIranianIsp = IRANIAN_ISP_KEYWORDS.some((kw) => fullProviderStr.includes(kw));

    let isVpn = false;
    let reason = '';

    if (isProxy || isHosting) {
      isVpn = true;
      reason = 'Datacenter / Proxy IP detected';
    } else if (hasVpnKeyword) {
      isVpn = true;
      reason = 'VPN / Cloud Provider keyword matched';
    } else if (data.countryCode !== 'IR' && !isIranianIsp) {
      isVpn = true;
      reason = 'Non-Iranian IP and ISP detected';
    }

    return NextResponse.json({
      success: true,
      isVpn,
      ip: clientIp,
      country: data.country,
      countryCode: data.countryCode,
      isp: data.isp,
      reason,
    });
  } catch (error) {
    console.error('Error in /api/check-vpn:', error);
    return NextResponse.json(
      {
        success: false,
        isVpn: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
