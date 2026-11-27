import { API_BASE_URL } from './api';
import { resolveAudioAccess } from './lessonAccess';
import { CACHE_TAGS } from './cacheTags';

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
        'fields[0]': 'id',
        'fields[1]': 'documentId',
        'fields[2]': 'slug',
        'fields[3]': 'price',
        'fields[4]': 'internationalPrice',
        'fields[5]': 'discountPercent',
        'fields[6]': 'discountUntil',
        'populate[chapters][fields][0]': 'id',
        'populate[chapters][fields][1]': 'price',
        'populate[chapters][fields][2]': 'integrationId',
        'populate[chapters][populate][lessons][fields][0]': 'id',
        'populate[chapters][populate][lessons][fields][1]': 'audioUrl',
        'populate[chapters][populate][lessons][fields][2]': 'videoUrl',
        'populate[chapters][populate][lessons][fields][3]': 'isFree',
        'populate[curriculum][fields][0]': 'id',
        'populate[curriculum][fields][1]': 'audioUrl',
        'populate[curriculum][fields][2]': 'videoUrl',
        'populate[curriculum][fields][3]': 'isFree',
        'populate[media][fields][0]': 'url',
        'pagination[pageSize]': '100',
        'pagination[page]': String(page),
        status,
      });
      const response = await fetch(`${API_BASE_URL}/api/courses?${query}`, {
        headers: { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}` },
        next: { revalidate: 300, tags: [CACHE_TAGS.courses] },
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
