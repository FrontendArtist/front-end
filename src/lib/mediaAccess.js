import { API_BASE_URL } from './api';
import { resolveAudioAccess } from './lessonAccess';

function matchesFile(value, fileUrl) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const source = new URL(value, API_BASE_URL);
    const target = new URL(fileUrl);
    return source.origin === target.origin &&
      decodeURIComponent(source.pathname) === decodeURIComponent(target.pathname);
  } catch {
    return false;
  }
}

function matchesCourse(course, cid) {
  return !cid || [course.id, course.documentId, course.slug]
    .some(value => value != null && String(value) === cid);
}

// نبودن فایل در یک صفحه کافی نیست؛ تمام صفحات باید با موفقیت بررسی شوند.
export async function resolveMediaAccess(fileUrl, cid, session) {
  const lessons = [];
  let publicCourseMatch = false;
  for (const status of ['published', 'draft']) {
    let page = 1;
    let pageCount = 1;
    do {
      const query = new URLSearchParams({
        'populate[chapters][populate][lessons]': '*',
        'populate[curriculum]': '*',
        'populate[media]': '*',
        'pagination[pageSize]': '100',
        'pagination[page]': String(page),
        status,
      });
      const response = await fetch(`${API_BASE_URL}/api/courses?${query}`, {
        headers: { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}` },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('دریافت محتوای دوره‌ها انجام نشد.');
      const json = await response.json();
      const pagination = json?.meta?.pagination;
      if (!Array.isArray(json?.data) || !Number.isInteger(pagination?.pageCount) ||
          pagination.pageCount < 0 || pagination.page !== page) {
        throw new Error('پاسخ فهرست دوره‌ها معتبر نیست.');
      }
      pageCount = pagination.pageCount;
      for (const rawCourse of json.data) {
        const course = rawCourse?.attributes ? { ...rawCourse.attributes, id: rawCourse.id } : rawCourse;
        if (!course || course.id == null || !Array.isArray(course.curriculum) ||
            !Array.isArray(course.chapters)) {
          throw new Error('ساختار محتوای دوره معتبر نیست.');
        }
        const media = course.media?.data || course.media || [];
        if (status === 'published' && Array.isArray(media) && matchesCourse(course, cid) && media.some(file =>
          matchesFile(file?.attributes?.url || file?.url, fileUrl))) publicCourseMatch = true;

        const addLessons = (items, chapter = null) => {
          if (!Array.isArray(items)) throw new Error('ساختار جلسه‌ها معتبر نیست.');
          for (const lesson of items) {
            if (!lesson || typeof lesson !== 'object') throw new Error('جلسه معتبر نیست.');
            if (matchesFile(lesson.audioUrl, fileUrl) || matchesFile(lesson.videoUrl, fileUrl)) {
              const chapterPrice = chapter?.price;
              const freeChapter = ['number', 'string'].includes(typeof chapterPrice) &&
                String(chapterPrice).trim() !== '' && Number(chapterPrice) === 0;
              lessons.push({ course, lesson, published: status === 'published', chapterId: chapter?.id ?? null,
                isFree: lesson.isFree === true || freeChapter });
            }
          }
        };
        addLessons(course.curriculum);
        for (const chapter of course.chapters) {
          if (!chapter || chapter.id == null) throw new Error('فصل معتبر نیست.');
          addLessons(chapter.lessons, chapter);
        }
      }
      page += 1;
    } while (page <= pageCount);
  }

  // فایل عمومی تنها پس از بررسی کامل و نبودن ارتباط آموزشی قابل دریافت است.
  if (!lessons.length) return { allowed: !cid || publicCourseMatch, status: 403 };
  for (const lesson of lessons.filter(item => matchesCourse(item.course, cid))) {
    const access = await resolveAudioAccess(lesson, session, { allowFree: lesson.published });
    if (access.allowed) return access;
  }
  return { allowed: false, status: 403 };
}
