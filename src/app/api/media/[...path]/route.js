/**
 * Media Proxy Route Handler
 *
 * این Route Handler فایل‌های رسانه‌ای (صوت/ویدیو) را از Strapi دریافت کرده و
 * به عنوان پاسخ برمی‌گرداند تا مشکل CORS و CSP مرورگر برطرف شود.
 *
 * جریان:
 *   مرورگر → /api/media/uploads/file.mp3 → این handler → localhost:1337/uploads/file.mp3
 */

const STRAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';

export async function GET(request, { params }) {
  const { path } = await params;
  const filePath = Array.isArray(path) ? path.join('/') : path;

  const strapiUrl = `${STRAPI_URL}/uploads/${filePath}`;

  try {
    // دریافت فایل از Strapi با پشتیبانی از Range requests (برای seek صوت/ویدیو)
    const rangeHeader = request.headers.get('range');
    const fetchHeaders = {};
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const response = await fetch(strapiUrl, { headers: fetchHeaders });

    if (!response.ok && response.status !== 206) {
      return new Response('Media not found', { status: response.status });
    }

    // انتقال هدرهای مهم از Strapi به مرورگر
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');
    const contentRange = response.headers.get('content-range');
    const acceptRanges = response.headers.get('accept-ranges');

    const responseHeaders = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    };

    if (contentLength) responseHeaders['Content-Length'] = contentLength;
    if (contentRange) responseHeaders['Content-Range'] = contentRange;
    if (acceptRanges) responseHeaders['Accept-Ranges'] = acceptRanges;

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('Media proxy error:', error.message);
    return new Response('Error fetching media', { status: 500 });
  }
}
