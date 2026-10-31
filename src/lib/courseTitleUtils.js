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

function looksLikeUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function isUsableCourseSlug(value) {
    const slug = String(value || '').trim();
    if (!slug || looksLikeUuid(slug) || slug === '#') return false;
    return true;
}

function isChapterPurchaseItem(item) {
    return Boolean(
        item &&
        (item.type === 'chapter' ||
            item.type === 'course_chapter' ||
            item.itemType === 'CourseChapter' ||
            item.chapterId ||
            item.parentExternalId ||
            String(item.slug || '').includes('-chapter-'))
    );
}

function getChapterMatchIds(item) {
    const values = [item?.integrationId, item?.externalCourseId, item?.chapterId];
    // شناسهٔ عددی component شمارهٔ ردیف سفارش است و هویت فصل نیست.
    if (item?.chapterId == null) values.push(item?.id);
    return values
        .filter(value => value != null && !/^chapter-\d+$/.test(String(value)))
        .map(String);
}

function catalogChapterMatches(chapter, externalIds) {
    if (!chapter || externalIds.length === 0) return false;
    return [chapter.id, chapter.integrationId]
        .filter(value => value != null)
        .some(value => externalIds.includes(String(value)));
}

/**
 * یافتن دورهٔ کاتالوگ متناظر با قلم خرید؛ شناسهٔ والد در اقلام بای‌مانی documentId است
 * و اسلاگ در آن‌ها وجود ندارد.
 */
export function findPurchasedCourseInCatalog(item, catalog = []) {
    if (!item || !Array.isArray(catalog)) return null;
    const isChapter = isChapterPurchaseItem(item);
    const parentDocId = item.parentExternalId || item.courseDocumentId || (isChapter ? item.documentId : null);
    const ownDocId = !isChapter ? (item.documentId || item.externalCourseId || item.courseDocumentId) : null;
    const parentNumericId = item.courseId != null ? String(item.courseId) : '';
    const chapterExternalIds = isChapter ? getChapterMatchIds(item) : [];

    return catalog.find((course) => {
        if (!course) return false;
        const courseDoc = String(course.documentId ?? '');
        const courseId = String(course.id ?? '');
        if (parentDocId && courseDoc && courseDoc === String(parentDocId)) return true;
        if (ownDocId && courseDoc && courseDoc === String(ownDocId)) return true;
        if (parentNumericId && courseId && courseId === parentNumericId) return true;
        if (!isChapter && item.slug && course.slug && String(course.slug) === String(item.slug)) return true;
        // خریدهای بای‌مانی در فهرست فقط courseTitle دارند؛ تطابق دقیق عنوان آخرین راه‌حل است.
        const itemCourseTitle = String(item.courseTitle || (!isChapter ? item.title : '') || '').trim();
        if (itemCourseTitle && course.title && String(course.title).trim() === itemCourseTitle) return true;
        if (isChapter && chapterExternalIds.length > 0 && Array.isArray(course.chapters)) {
            return course.chapters.some(ch => catalogChapterMatches(ch, chapterExternalIds));
        }
        return false;
    }) || null;
}

/**
 * اسلاگ قابل‌ناوبری دورهٔ والد را از قلم خرید و کاتالوگ دوره‌ها استخراج می‌کند.
 */
export function resolvePurchasedCourseSlug(item, catalog = []) {
    if (!item) return '';
    const isChapter = isChapterPurchaseItem(item);
    const slugFromChapterPath = String(item.slug || '').includes('-chapter-')
        ? String(item.slug).split('-chapter-')[0]
        : '';

    const catalogMatch = findPurchasedCourseInCatalog(item, catalog);

    const candidates = [
        item.courseSlug,
        slugFromChapterPath,
        !isChapter ? item.slug : '',
        catalogMatch?.slug,
    ];

    return candidates.map(value => String(value || '').trim()).find(isUsableCourseSlug) || '';
}

/**
 * عنوان نمایشی قلم خرید: «عنوان دوره (عنوان فصل)» برای فصل و عنوان دوره برای دوره.
 * برای اقلام بای‌مانی که slug/title کامل ندارند، نام از کاتالوگ بازیابی می‌شود.
 */
export function resolvePurchasedCourseTitle(item, catalog = []) {
    if (!item) return '';
    const isChapter = isChapterPurchaseItem(item);
    const catalogMatch = findPurchasedCourseInCatalog(item, catalog);

    if (!isChapter) {
        return catalogMatch?.title || item.title || item.courseTitle || '';
    }

    const chapterExternalIds = getChapterMatchIds(item);
    const catalogChapter = catalogMatch && Array.isArray(catalogMatch.chapters)
        ? catalogMatch.chapters.find(ch => catalogChapterMatches(ch, chapterExternalIds))
        : null;

    const courseTitle = catalogMatch?.title || item.courseTitle || '';
    const chapterTitle = catalogChapter?.title || item.chapterTitle || '';

    if (courseTitle && chapterTitle) {
        return formatChapterDisplayTitle(courseTitle, chapterTitle);
    }
    if (courseTitle) return courseTitle;
    if (chapterTitle) return chapterTitle;

    return getCartItemDisplayTitle(item, null) || item.title || '';
}

export function resolvePurchasedCourseHref(item, catalog = []) {
    const slug = resolvePurchasedCourseSlug(item, catalog);
    return slug ? `/courses/${slug}` : '';
}

