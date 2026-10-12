/**
 * Secure Audio Streaming API
 * 
 * جریان کار:
 * 1. واکشی اطلاعات جلسه و دوره از استراپی و استخراج audioUrl واقعی (آدرس CDN هرگز به کلاینت داده نمی‌شود)
 * 2. برای جلسات رایگان (isFree): پخش آزادانه بدون افشای آدرس اصلی CDN
 * 3. برای جلسات غیررایگان:
 *    - احراز هویت سشن NextAuth (جلوگیری از دسترسی کاربران لاگین‌نشده: 401)
 *    - بررسی دسترسی خرید (کاربر باید کل دوره یا فصل مربوطه را خریده باشد: 403)
 * 4. استریم بایت به بایت فایل صوتی از هاست دانلود با پشتیبانی از Range Request (جهت عقب/جلو بردن در پلیر و دانلود)
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkCourseAccess } from '@/lib/ordersApi';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

/**
 * جستجوی امن جلسه و دوره از دیتابیس استراپی (Server-side Only)
 */
async function findLessonFromStrapi(lessonId, cid) {
  let targetCourse = null;

  // ۱. تلاش برای یافتن دوره از طریق cid (documentId یا slug یا id)
  if (cid) {
    try {
      const res = await fetch(
        `${STRAPI_URL}/api/courses/${cid}?populate[chapters][populate][lessons]=*&populate[curriculum]=*`,
        {
          headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
          next: { revalidate: 60 },
        }
      );
      if (res.ok) {
        const json = await res.json();
        targetCourse = json?.data;
      }
    } catch {}

    if (!targetCourse) {
      try {
        const res = await fetch(
          `${STRAPI_URL}/api/courses?filters[$or][0][slug][$eq]=${cid}&filters[$or][1][id][$eq]=${cid}&populate[chapters][populate][lessons]=*&populate[curriculum]=*`,
          {
            headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
            next: { revalidate: 60 },
          }
        );
        if (res.ok) {
          const json = await res.json();
          targetCourse = json?.data?.[0];
        }
      } catch {}
    }
  }

  const searchInCourse = (c) => {
    if (!c) return null;
    const curriculum = Array.isArray(c.curriculum) ? c.curriculum : [];
    for (const l of curriculum) {
      if (String(l.id) === String(lessonId)) {
        return {
          lesson: l,
          course: c,
          chapterId: null,
          audioUrl: l.audioUrl || null,
          isFree: Boolean(l.isFree),
        };
      }
    }
    const chapters = Array.isArray(c.chapters) ? c.chapters : [];
    for (const ch of chapters) {
      const lessons = Array.isArray(ch.lessons) ? ch.lessons : [];
      for (const l of lessons) {
        if (String(l.id) === String(lessonId)) {
          return {
            lesson: l,
            course: c,
            chapterId: ch.id,
            audioUrl: l.audioUrl || null,
            isFree: Boolean(l.isFree),
          };
        }
      }
    }
    return null;
  };

  let found = searchInCourse(targetCourse);
  if (found) return found;

  // ۲. فال‌بک: در صورتی که cid ارائه نشده بود، جستجو در بین دوره‌های منتشرشده
  try {
    const res = await fetch(
      `${STRAPI_URL}/api/courses?populate[chapters][populate][lessons]=*&populate[curriculum]=*&pagination[pageSize]=100`,
      {
        headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
        next: { revalidate: 60 },
      }
    );
    if (res.ok) {
      const json = await res.json();
      for (const c of json?.data || []) {
        found = searchInCourse(c);
        if (found) return found;
      }
    }
  } catch {}

  return null;
}

/**
 * بررسی دسترسی خرید کاربر برای جلسات غیررایگان
 */
async function verifyAccess(session, lessonData) {
  if (lessonData.isFree) {
    return { allowed: true };
  }

  const role = String(session.user?.role?.type || session.user?.role || '').toLowerCase();
  const isAdmin = ['administrator', 'admin', 'mentor', 'استاد'].includes(role);
  if (isAdmin) {
    return { allowed: true };
  }

  const course = lessonData.course;
  if (!course) {
    return { allowed: false, error: 'دوره یافت نشد.' };
  }

  // بررسی وضعیت خرید از طریق تابع مرجع ordersApi
  const courseId = course.id;
  const courseSlug = course.slug;
  const { hasAccess, purchasedChapterIds } = await checkCourseAccess(
    session.user.id,
    courseId,
    courseSlug,
    session.user
  );

  // ۱. اگر کل دوره خریداری شده باشد
  if (hasAccess) {
    return { allowed: true };
  }

  // ۲. اگر جلسه داخل یک فصل خاص باشد و آن فصل خریداری شده باشد
  if (lessonData.chapterId) {
    const hasChapter = (purchasedChapterIds || []).some(
      (chId) => String(chId) === String(lessonData.chapterId)
    );
    if (hasChapter) {
      return { allowed: true };
    }
  }

  // ۳. فال‌بک به دوره‌های ثبت‌نام‌شده در سشن کاربر
  const enrolledCourses = session.user?.enrolledCourses || [];
  const enrolledSlugs = session.user?.enrolledSlugs || [];
  const enrolledChapters = session.user?.enrolledChapters || [];

  const isEnrolledInCourse =
    enrolledCourses.some((c) => String(c) === String(courseId) || String(c) === String(course.documentId)) ||
    enrolledSlugs.some((s) => String(s) === String(courseSlug));

  if (isEnrolledInCourse) {
    return { allowed: true };
  }

  if (lessonData.chapterId) {
    const isEnrolledInChapter = enrolledChapters.some(
      (ch) => String(ch) === String(lessonData.chapterId)
    );
    if (isEnrolledInChapter) {
      return { allowed: true };
    }
  }

  return { allowed: false, error: 'شما این دوره یا فصل را خریداری نکرده‌اید.' };
}

export async function GET(request, { params }) {
  const { lessonId } = await params;
  const { searchParams } = new URL(request.url);
  const cid = searchParams.get('cid');

  // ۱. واکشی اطلاعات جلسه و آدرس واقعی از استراپی
  const lessonData = await findLessonFromStrapi(lessonId, cid);
  if (!lessonData?.audioUrl) {
    return new Response(
      JSON.stringify({ error: 'فایل صوتی یافت نشد.' }),
      { status: 404, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  // ۲. اگر جلسه رایگان نبود، احراز هویت و بررسی خرید انجام شود
  if (!lessonData.isFree) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({ error: 'برای دسترسی به این فایل باید ابتدا وارد حساب کاربری خود شوید.' }),
        { status: 401, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }

    const access = await verifyAccess(session, lessonData);
    if (!access.allowed) {
      return new Response(
        JSON.stringify({ error: access.error || 'دسترسی غیرمجاز.' }),
        { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
      );
    }
  }

  // ۳. استریم امن با پشتیبانی از Range Header
  try {
    const rangeHeader = request.headers.get('range');
    const fetchHeaders = {};
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const cdnResponse = await fetch(lessonData.audioUrl, {
      headers: fetchHeaders,
    });

    if (!cdnResponse.ok && cdnResponse.status !== 206) {
      return new Response('خطا در دریافت فایل از منبع', { status: cdnResponse.status });
    }

    const contentType = cdnResponse.headers.get('content-type') || 'audio/mpeg';
    const contentLength = cdnResponse.headers.get('content-length');
    const contentRange = cdnResponse.headers.get('content-range');
    const acceptRanges = cdnResponse.headers.get('accept-ranges');

    const headers = {
      'Content-Type': contentType,
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff',
    };

    if (contentLength) headers['Content-Length'] = contentLength;
    if (contentRange) headers['Content-Range'] = contentRange;
    if (acceptRanges) headers['Accept-Ranges'] = acceptRanges;

    return new Response(cdnResponse.body, {
      status: cdnResponse.status,
      headers,
    });
  } catch (err) {
    console.error('[audio-stream] error:', err);
    return new Response('خطای سرور در استریم فایل', { status: 500 });
  }
}

export async function HEAD(request, { params }) {
  const { lessonId } = await params;
  const { searchParams } = new URL(request.url);
  const cid = searchParams.get('cid');

  const lessonData = await findLessonFromStrapi(lessonId, cid);
  if (!lessonData?.audioUrl) {
    return new Response(null, { status: 404 });
  }

  if (!lessonData.isFree) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(null, { status: 401 });
    }

    const access = await verifyAccess(session, lessonData);
    if (!access.allowed) {
      return new Response(null, { status: 403 });
    }
  }

  try {
    const cdnResponse = await fetch(lessonData.audioUrl, { method: 'HEAD' });
    const contentLength = cdnResponse.headers.get('content-length');
    const contentType = cdnResponse.headers.get('content-type') || 'audio/mpeg';

    return new Response(null, {
      status: cdnResponse.ok ? 200 : cdnResponse.status,
      headers: {
        'Content-Type': contentType,
        ...(contentLength ? { 'Content-Length': contentLength } : {}),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch {
    return new Response(null, { status: 500 });
  }
}
