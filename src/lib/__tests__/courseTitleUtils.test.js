import {
    formatChapterDisplayTitle,
    rememberChapterCourse,
    getRememberedChapterCourse,
    getCartItemDisplayTitle
} from '../courseTitleUtils';

describe('courseTitleUtils', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test('formatChapterDisplayTitle formats as «عنوان دوره (عنوان فصل)»', () => {
        expect(formatChapterDisplayTitle('دوره جامع هفت آسمان', 'فصل 1'))
            .toBe('دوره جامع هفت آسمان (فصل 1)');
        expect(formatChapterDisplayTitle('خاک به افلاک', 'فصل اول'))
            .toBe('خاک به افلاک (فصل اول)');
    });

    test('formatChapterDisplayTitle does not duplicate if chapter title already contains course title', () => {
        expect(formatChapterDisplayTitle('طرح الهی', 'طرح الهی (فصل 1)'))
            .toBe('طرح الهی (فصل 1)');
    });

    test('formatChapterDisplayTitle handles missing arguments gracefully', () => {
        expect(formatChapterDisplayTitle('دوره', '')).toBe('دوره');
        expect(formatChapterDisplayTitle('', 'فصل 1')).toBe('فصل 1');
        expect(formatChapterDisplayTitle(null, null)).toBe('');
    });

    test('rememberChapterCourse and getRememberedChapterCourse work with localStorage', () => {
        rememberChapterCourse('ch-uuid-1', 'معماری ذهن', 'فصل ۲', 'doc-course-1');

        const byChapter = getRememberedChapterCourse('ch-uuid-1', null);
        expect(byChapter).toMatchObject({
            courseTitle: 'معماری ذهن',
            chapterTitle: 'فصل ۲',
            displayTitle: 'معماری ذهن (فصل ۲)'
        });

        const byParent = getRememberedChapterCourse(null, 'doc-course-1');
        expect(byParent).toMatchObject({
            courseTitle: 'معماری ذهن'
        });
    });

    test('getCartItemDisplayTitle formats chapter items with courseTitle and chapterTitle', () => {
        const item = {
            type: 'chapter',
            courseTitle: 'دوره آموزش عکاسی',
            chapterTitle: 'فصل 1',
            title: 'دوره آموزش عکاسی (فصل 1)'
        };
        const quote = {
            title: 'فصل 1'
        };

        expect(getCartItemDisplayTitle(item, quote)).toBe('دوره آموزش عکاسی (فصل 1)');
    });

    test('getCartItemDisplayTitle formats chapter items even if quote title is plain chapter name', () => {
        const item = {
            type: 'chapter',
            courseTitle: 'دوره هفت آسمان',
            title: 'دوره هفت آسمان - فصل 2'
        };
        const quote = {
            title: 'فصل 2'
        };

        expect(getCartItemDisplayTitle(item, quote)).toBe('دوره هفت آسمان (فصل 2)');
    });

    test('getCartItemDisplayTitle leaves regular course untouched', () => {
        const item = {
            type: 'course',
            title: 'دوره آرامش درون'
        };
        const quote = {
            title: 'دوره آرامش درون'
        };

        expect(getCartItemDisplayTitle(item, quote)).toBe('دوره آرامش درون');
    });

    test('getCartItemDisplayTitle recovers course title from remembered localStorage entry', () => {
        rememberChapterCourse('ch-abc', 'دوره شناخت نفس', 'فصل ۳', 'doc-parent-abc');

        const item = {
            type: 'chapter',
            integrationId: 'ch-abc',
            parentExternalId: 'doc-parent-abc',
            title: 'فصل ۳'
        };
        const quote = {
            title: 'فصل ۳'
        };

        expect(getCartItemDisplayTitle(item, quote)).toBe('دوره شناخت نفس (فصل ۳)');
    });
});

