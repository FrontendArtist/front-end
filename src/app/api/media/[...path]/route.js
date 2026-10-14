// فایل عمومی و رسانهٔ آموزشی پیش از دریافت، از روی محتوای واقعی تفکیک می‌شوند.
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/api';
import { resolveMediaAccess } from '@/lib/mediaAccess';

async function proxyMedia(request, { params }, method) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response(null, { status: 401 });

  const { path } = await params;
  const parts = Array.isArray(path) ? [...path] : [path];
  if (parts[0] === 'uploads') parts.shift();
  if (!parts.length || parts.some(part => typeof part !== 'string' || !part ||
      part === '.' || part === '..' || /[\\/\x00-\x1f?#%]/.test(part))) {
    return new Response(null, { status: 400 });
  }
  const fileUrl = new URL('/uploads/' + parts.map(encodeURIComponent).join('/'), API_BASE_URL).href;
  const cid = new URL(request.url).searchParams.get('cid');

  if (process.env.NODE_ENV === 'production') {
    const siteHostname = new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000').hostname;
    const origin = request.headers.get('origin') || '';
    const referer = request.headers.get('referer') || '';
    const isValidOrigin = !origin || origin.includes(siteHostname);
    const isValidReferer = !referer || referer.includes(siteHostname);
    if (!isValidOrigin && !isValidReferer) return new Response(null, { status: 403 });
  }

  try {
    const access = await resolveMediaAccess(fileUrl, cid, session);
    if (!access.allowed) return new Response(null, { status: access.status });
    const headers = {};
    const range = request.headers.get('range');
    if (range) headers.Range = range;
    const response = await fetch(fileUrl, { method, headers });
    if (!response.ok) return new Response(null, { status: response.status });
    const responseHeaders = {
      'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    };
    for (const name of ['content-length', 'content-range', 'accept-ranges']) {
      const value = response.headers.get(name);
      if (value) responseHeaders[name] = value;
    }
    return new Response(method === 'HEAD' ? null : response.body, {
      status: response.status, headers: responseHeaders,
    });
  } catch (error) {
    console.error('بررسی یا دریافت رسانه انجام نشد:', error.message);
    return new Response(null, { status: 503 });
  }
}

export async function GET(request, context) {
  return proxyMedia(request, context, 'GET');
}

export async function HEAD(request, context) {
  return proxyMedia(request, context, 'HEAD');
}
