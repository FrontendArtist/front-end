/**
 * ابزارهای کمکی قالب‌بندی و نگاشت عنوان دوره و فصل‌ها
 */

/**
 * فرمت‌بندی عنوان دوره و فصل طبق مشخصات: «عنوان دوره (عنوان فصل)»
 * به عنوان مثال: «طرح الهی (فصل 1)»
 * 
 * @param {string} courseTitle - عنوان دوره
 * @param {string} chapterTitle - عنوان فصل
 * @returns {string} عنوان ترکیبی
 */
export function formatChapterDisplayTitle(courseTitle, chapterTitle) {
    const cTitle = String(courseTitle || '').trim();
    const chTitle = String(chapterTitle || '').trim();

    if (!cTitle && !chTitle) return '';
    if (!cTitle) return chTitle;
    if (!chTitle) return cTitle;

    // اگر عنوان فصل از قبل شامل نام دوره باشد (مثلاً سرور آن را ترکیب کرده باشد)
    if (chTitle.includes(cTitle)) {
        return chTitle;
    }

    return `${cTitle} (${chTitle})`;
}

/**
 * ذخیره نگاشت شناسه فصل و والد با عنوان‌ها در LocalStorage
 */
export function rememberChapterCourse(chapterIdOrIntegrationId, courseTitle, chapterTitle, parentExternalId) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
        const map = JSON.parse(localStorage.getItem('chapter_course_titles') || '{}');
        const entry = {
            courseTitle: courseTitle || null,
            chapterTitle: chapterTitle || null,
            parentExternalId: parentExternalId || null,
            displayTitle: formatChapterDisplayTitle(courseTitle, chapterTitle)
        };
        if (chapterIdOrIntegrationId) {
            map[String(chapterIdOrIntegrationId)] = entry;
        }
        if (parentExternalId && courseTitle) {
            map[String(parentExternalId)] = {
                courseTitle,
                chapterTitle: null,
                parentExternalId,
                displayTitle: courseTitle
            };
        }
        localStorage.setItem('chapter_course_titles', JSON.stringify(map));
    } catch {
        // نادیده گرفتن خطاهای ذخیره‌سازی محلی
    }
}

/**
 * بازیابی اطلاعات ذخیره‌شده فصل یا دوره از LocalStorage
 */
export function getRememberedChapterCourse(chapterExternalId, parentExternalId) {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
        const map = JSON.parse(localStorage.getItem('chapter_course_titles') || '{}');
        if (chapterExternalId && map[String(chapterExternalId)]) {
            return map[String(chapterExternalId)];
        }
        if (parentExternalId && map[String(parentExternalId)]) {
            return map[String(parentExternalId)];
        }
    } catch {
        // نادیده گرفتن خطا
    }
    return null;
}

/**
 * استخراج عنوان نمایشی مناسب برای اقلام سبد خرید
 * تضمین می‌کند که برای خرید فصلی همیشه به شکل «عنوان دوره (فصل مثلا 1)» نمایش داده شود
 * 
 * @param {object} item - آیتم سبد خرید (از zustand store)
 * @param {object} quote - کوت قیمت استعلام‌شده از سرور (اختیاری)
 * @returns {string} عنوان نمایشی
 */
export function getCartItemDisplayTitle(item, quote) {
    if (!item && !quote) return '';

    const isChapter = item?.type === 'chapter' ||
        item?.type === 'course_chapter' ||
        quote?.type === 'course_chapter' ||
        quote?.itemType === 'CourseChapter' ||
        Boolean(item?.parentExternalId || quote?.parentExternalId);

    if (!isChapter) {
        return quote?.title || item?.title || '';
    }

    // اگر عنوان برگشتی از سرور قبلاً به شکل «عنوان دوره (فصل...)» فرمت شده است
    if (quote?.title && quote.title.includes('(')) {
        return quote.title;
    }
    if (item?.title && item.title.includes('(')) {
        return item.title;
    }

    // تعیین عنوان فصل
    let chapterName = item?.chapterTitle || quote?.title;
    if (!chapterName && item?.title) {
        if (item.title.includes(' - ')) {
            chapterName = item.title.split(/\s*-\s*/)[1]?.trim();
        } else {
            chapterName = item.title;
        }
    }
    if (!chapterName) chapterName = 'فصل';

    // تعیین عنوان دوره والد
    let courseName = item?.courseTitle;
    if (!courseName && item?.title) {
        if (item.title.includes(' (')) {
            courseName = item.title.split(/\s*\(/)[0].trim();
        } else if (item.title.includes(' - ')) {
            courseName = item.title.split(/\s*-\s*/)[0].trim();
        }
    }

    // بررسی حافظه محلی در صورت نبودن عنوان دوره
    if (!courseName) {
        const remembered = getRememberedChapterCourse(
            item?.integrationId || item?.externalCourseId || item?.chapterId || item?.id,
            item?.parentExternalId || quote?.parentExternalId
        );
        if (remembered?.courseTitle) {
            courseName = remembered.courseTitle;
        }
    }

    if (courseName) {
        return formatChapterDisplayTitle(courseName, chapterName);
    }

    return quote?.title || item?.title || chapterName;
}

