/**
 * Media Proxy Route Handler — Authenticated + Purchase Validated
 *
 * سه لایه امنیتی:
 *
 *  لایه ۱: کاربر باید لاگین باشد (session معتبر)
 *  لایه ۲: اگر courseId ارسال شود، چک می‌شود آیا کاربر این دوره را خریده یا رایگان است
 *  لایه ۳: Hotlinking بلاک می‌شود در production
 *
 * نحوه استفاده امن:
 *   /api/media/uploads/file.mp3             ← فقط لایه ۱ (تصاویر، عمومی)
 *   /api/media/uploads/file.mp3?cid=abc123  ← لایه ۱+۲ (فایل صوتی دوره)
 *
 * جریان:
 *   مرورگر → /api/media/uploads/file.mp3?cid=courseDocId → این handler → Strapi
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const STRAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;
const SITE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

/**
 * بررسی server-side که آیا کاربر با userId مشخص، دوره با courseDocumentId را خریده است
 * مستقیماً از Strapi می‌پرسیم — بدون وابستگی به client state
 */
async function userHasPurchasedCourse(userId, courseDocumentId) {
  try {
    // دریافت سفارشات پرداخت‌شده این کاربر از Strapi
    const strapiOrdersUrl =
      `${STRAPI_URL}/api/orders` +
      `?filters[user][id][$eq]=${userId}` +
      `&filters[paymentStatus][$eq]=paid` +
      `&pagination[pageSize]=100` +
      `&populate[items]=*`;

    const res = await fetch(strapiOrdersUrl, {
      headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
      // cache کوتاه برای جلوگیری از spike درخواست‌ها
      next: { revalidate: 60 },
    });

    if (!res.ok) return false;

    const data = await res.json();
    const orders = data?.data || [];

    for (const order of orders) {
      const oStatus = String(order.orderStatus || '').toLowerCase();
      const pStatus = String(order.paymentStatus || '').toLowerCase();

      // فقط سفارشات معتبر
      const isValidPayment = pStatus === 'paid';
      const isValidOrder = ['paid', 'confirmed', 'processing', 'shipped', 'delivered'].includes(oStatus);
      if (!isValidPayment && !isValidOrder) continue;

      // بررسی آیتم‌های این سفارش برای پیدا کردن این دوره
      const items = order.items || [];
      for (const item of items) {
        const itemCourseDocId = item.documentId || item.courseDocumentId || item.id;
        const itemCourseId = item.courseId;

        if (
          String(itemCourseDocId) === String(courseDocumentId) ||
          String(itemCourseId) === String(courseDocumentId) ||
          item.slug === courseDocumentId
        ) {
          return true;
        }
      }
    }

    return false;
  } catch (err) {
    console.error('[media-proxy] purchase check error:', err.message);
    // در صورت خطای شبکه، اجازه می‌دهیم (fail-open برای جلوگیری از قطع سرویس)
    return true;
  }
}

/**
 * بررسی رایگان بودن دوره از Strapi
 */
async function isCourseFreePlan(courseDocumentId) {
  try {
    const res = await fetch(
      `${STRAPI_URL}/api/courses?filters[documentId][$eq]=${courseDocumentId}&fields[0]=price&fields[1]=documentId`,
      {
        headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) return false;
    const data = await res.json();
    const course = data?.data?.[0];
    if (!course) return false;
    const price = Number(course.price || 0);
    return price === 0;
  } catch {
    return false;
  }
}

export async function GET(request, { params }) {
  // ── لایه ۱: احراز هویت ─────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(
      JSON.stringify({ error: 'برای دسترسی به این فایل باید وارد حساب کاربری خود شوید.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ── لایه ۲: بررسی خرید دوره (فقط اگر courseId ارسال شده باشد) ──────────
  const { searchParams } = new URL(request.url);
  const courseDocumentId = searchParams.get('cid'); // course document id

  if (courseDocumentId) {
    // ادمین‌ها و منتورها همیشه دسترسی دارند
    const role = String(session.user.role?.type || session.user.role || '').toLowerCase();
    const isAdmin = role === 'administrator' || role === 'admin' || role === 'mentor' || role === 'استاد';

    if (!isAdmin) {
      // چک رایگان بودن دوره
      const isFree = await isCourseFreePlan(courseDocumentId);

      if (!isFree) {
        // چک خرید کاربر
        const hasPurchased = await userHasPurchasedCourse(session.user.id, courseDocumentId);
        if (!hasPurchased) {
          return new Response(
            JSON.stringify({ error: 'شما این دوره را خریداری نکرده‌اید.' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    }
  }

  // ── لایه ۳: جلوگیری از hotlinking خارجی (production) ─────────────────
  if (process.env.NODE_ENV === 'production') {
    const origin = request.headers.get('origin') || '';
    const referer = request.headers.get('referer') || '';
    const siteHostname = new URL(SITE_URL).hostname;
    const isValidOrigin = !origin || origin.includes(siteHostname);
    const isValidReferer = !referer || referer.includes(siteHostname);
    if (!isValidOrigin && !isValidReferer) {
      return new Response('Forbidden', { status: 403 });
    }
  }

  // ── پروکسی فایل از Strapi ───────────────────────────────────────────────
  const { path } = await params;
  const filePath = Array.isArray(path) ? path.join('/') : path;
  const strapiUrl = `${STRAPI_URL}/uploads/${filePath}`;

  try {
    const rangeHeader = request.headers.get('range');
    const fetchHeaders = {};
    if (rangeHeader) fetchHeaders['Range'] = rangeHeader;

    const response = await fetch(strapiUrl, { headers: fetchHeaders });

    if (!response.ok && response.status !== 206) {
      return new Response('Media not found', { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');
    const contentRange = response.headers.get('content-range');
    const acceptRanges = response.headers.get('accept-ranges');

    const responseHeaders = {
      'Content-Type': contentType,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
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

// HEAD request برای بررسی حجم فایل
export async function HEAD(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(null, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const courseDocumentId = searchParams.get('cid');

  if (courseDocumentId) {
    const role = String(session.user.role?.type || session.user.role || '').toLowerCase();
    const isAdmin = ['administrator', 'admin', 'mentor', 'استاد'].includes(role);

    if (!isAdmin) {
      const isFree = await isCourseFreePlan(courseDocumentId);
      if (!isFree) {
        const hasPurchased = await userHasPurchasedCourse(session.user.id, courseDocumentId);
        if (!hasPurchased) {
          return new Response(null, { status: 403 });
        }
      }
    }
  }

  const { path } = await params;
  const filePath = Array.isArray(path) ? path.join('/') : path;
  const strapiUrl = `${STRAPI_URL}/uploads/${filePath}`;

  try {
    const response = await fetch(strapiUrl, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    return new Response(null, {
      status: response.ok ? 200 : response.status,
      headers: {
        'Content-Type': contentType,
        ...(contentLength ? { 'Content-Length': contentLength } : {}),
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return new Response(null, { status: 500 });
  }
}
