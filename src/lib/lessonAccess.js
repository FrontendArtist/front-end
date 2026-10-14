import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkCourseAccess } from '@/lib/ordersApi';
import { getDiscountedCoursePrice } from '@/lib/coursePricing';
import { isIranianPhoneNumber } from '@/lib/phoneUtils';

function hasZeroPrice(price) {
  if (typeof price !== 'number' && typeof price !== 'string') return false;
  if (typeof price === 'string' && !price.trim()) return false;
  return Number(price) === 0;
}

/**
 * بررسی دسترسی خرید کاربر برای جلسات غیررایگان
 */
async function verifyAccess(session, lessonData, allowFree) {
  if (allowFree && lessonData.isFree) {
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

// GET و HEAD باید در قیمت مؤثر، سشن و مالکیت دقیقاً یک تصمیم بگیرند.
export async function resolveAudioAccess(lessonData, suppliedSession = undefined, { allowFree = true } = {}) {
  if (allowFree && lessonData.isFree) return { allowed: true };
  const isFreeCourse = allowFree && hasZeroPrice(getDiscountedCoursePrice(lessonData.course));
  const hasInternationalPrice = Number(lessonData.course.internationalPrice) > 0;
  if (isFreeCourse && !hasInternationalPrice) return { allowed: true };

  const session = suppliedSession === undefined ? await getServerSession(authOptions) : suppliedSession;
  const user = session?.user;
  const usesInternationalPrice = hasInternationalPrice && Boolean(user?.is_foreigner ||
    (user?.phoneNumber && !isIranianPhoneNumber(user.phoneNumber)));
  if (isFreeCourse && !usesInternationalPrice) return { allowed: true };
  if (!user?.id) {
    return { allowed: false, status: 401, error: 'برای دسترسی به این فایل باید ابتدا وارد حساب کاربری خود شوید.' };
  }
  const access = await verifyAccess(session, lessonData, allowFree);
  return { ...access, status: access.allowed ? 200 : 403 };
}

