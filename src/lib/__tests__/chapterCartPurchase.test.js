import { isSameCartItem, deduplicateCourses } from '../cartItemIdentity';
import { normalizeCartItemType, isCartItemChapter, sameCourseCartPrice } from '../courseCartPreviewApi';
import { isChapteredCourse } from '../courseUtils';

describe('منطق هویتی و مالی خرید فصل با نور', () => {
    describe('هویت پایدار فصل و اقلام سبد (isSameCartItem & deduplicateCourses)', () => {
        test('دو فصل با integrationId یکسان (حتی با حروف بزرگ/کوچک متفاوت) یکسان شناخته می‌شوند', () => {
            const item1 = {
                type: 'chapter',
                integrationId: 'b7b8f9e0-1234-4567-89ab-cdef01234567',
                title: 'فصل اول',
            };
            const item2 = {
                type: 'chapter',
                integrationId: 'B7B8F9E0-1234-4567-89AB-CDEF01234567',
                title: 'فصل اول دوره',
            };
            expect(isSameCartItem(item1, item2)).toBe(true);
        });

        test('فصل و دوره با شناسه‌های مشابه یکسان تشخیص داده نمی‌شوند', () => {
            const chapter = {
                type: 'chapter',
                integrationId: 'common-id-123',
            };
            const course = {
                type: 'course',
                documentId: 'common-id-123',
            };
            expect(isSameCartItem(chapter, course)).toBe(false);
        });

        test('اقلام تکراری فصل در سبد حذف می‌شوند (deduplicateCourses)', () => {
            const items = [
                { type: 'chapter', integrationId: 'ch-uuid-1', title: 'فصل ۱' },
                { type: 'course', documentId: 'c-uuid-1', title: 'دوره ۱' },
                { type: 'chapter', integrationId: 'ch-uuid-1', title: 'فصل ۱ تکراری' },
                { type: 'chapter', integrationId: 'ch-uuid-2', title: 'فصل ۲' },
            ];
            const deduped = deduplicateCourses(items);
            expect(deduped).toHaveLength(3);
            expect(deduped.map(i => i.integrationId || i.documentId)).toEqual(['ch-uuid-1', 'c-uuid-1', 'ch-uuid-2']);
        });

        test('فصل‌های متعلق به دو دورهٔ متفاوت با شناسهٔ محلی یکسان متمایز می‌شوند', () => {
            const ch1 = {
                type: 'chapter',
                chapterId: 1,
                parentExternalId: 'course-doc-a',
            };
            const ch2 = {
                type: 'chapter',
                chapterId: 1,
                parentExternalId: 'course-doc-b',
            };
            expect(isSameCartItem(ch1, ch2)).toBe(false);
        });
    });

    describe('نگاشت DTO پیش‌نمایش استراپی و پاسخ بای‌مانی (normalizeCartItemType & isCartItemChapter)', () => {
        test('پیش‌نمایش استراپی با type=course_chapter به درستی به course_chapter نگاشت می‌شود', () => {
            expect(normalizeCartItemType({ type: 'course_chapter' })).toBe('course_chapter');
            expect(isCartItemChapter({ type: 'course_chapter' })).toBe(true);
        });

        test('پاسخ بای‌مانی با itemType=CourseChapter به درستی نگاشت می‌شود', () => {
            expect(normalizeCartItemType({ itemType: 'CourseChapter' })).toBe('course_chapter');
            expect(isCartItemChapter({ itemType: 'CourseChapter' })).toBe(true);
        });

        test('دوره‌های عادی با type=course یا itemType=Course به course نگاشت می‌شوند', () => {
            expect(normalizeCartItemType({ type: 'course' })).toBe('course');
            expect(normalizeCartItemType({ itemType: 'Course' })).toBe('course');
            expect(isCartItemChapter({ type: 'course' })).toBe(false);
            expect(isCartItemChapter({ itemType: 'Course' })).toBe(false);
        });
    });

    describe('بررسی هماهنگی قیمت فصل و تخفیف‌ها (sameCourseCartPrice)', () => {
        test('پیش‌نمایش استراپی فصل با قیمت پایه و پاسخ بای‌مانی با قیمت ردیف ثابت تطابق دارند', () => {
            const strapiPreview = {
                couponCode: 'CH10',
                originalTotalInNoor: 50,
                itemDiscountInNoor: 0,
                couponDiscountInNoor: 5,
                priceInNoor: 45,
                courses: [
                    {
                        externalCourseId: 'ch-integration-uuid',
                        title: 'فصل اول',
                        basePriceInNoor: 50,
                        itemDiscountInNoor: 0,
                        couponDiscountInNoor: 5,
                        priceInNoor: 45,
                        type: 'course_chapter',
                    },
                ],
            };

            const byeMoneyCart = {
                cartId: 'cart-1',
                status: 'Ready',
                couponCode: 'CH10',
                originalTotalInNoor: 50,
                itemDiscountInNoor: 0,
                couponDiscountInNoor: 5,
                priceInNoor: 45,
                courses: [
                    {
                        externalCourseId: 'ch-integration-uuid',
                        title: 'فصل اول',
                        priceInNoor: 50,
                        purchaseStatus: 'NotPurchased',
                        itemType: 'CourseChapter',
                    },
                ],
            };

            expect(sameCourseCartPrice(strapiPreview, byeMoneyCart)).toBe(true);
        });

        test('تغییر در قیمت پایه ردیف فصل بین پیش‌نمایش و بای‌مانی عدم تطابق را به درستی تشخیص می‌دهد', () => {
            const strapiPreview = {
                priceInNoor: 50,
                courses: [{ externalCourseId: 'ch-1', basePriceInNoor: 50 }],
            };
            const byeMoneyCart = {
                priceInNoor: 50,
                courses: [{ externalCourseId: 'ch-1', priceInNoor: 60 }],
            };
            expect(sameCourseCartPrice(strapiPreview, byeMoneyCart)).toBe(false);
        });
    });

    describe('اعتبارسنجی isChaptered', () => {
        test('فقط مقدار بولی صریح true به عنوان دوره فصلی‌فروش شناخته می‌شود', () => {
            expect(isChapteredCourse({ isChaptered: true })).toBe(true);
            expect(isChapteredCourse({ isChaptered: 'true' })).toBe(false);
            expect(isChapteredCourse({ isChaptered: 1 })).toBe(false);
            expect(isChapteredCourse({ isChaptered: false })).toBe(false);
            expect(isChapteredCourse({ isChaptered: null })).toBe(false);
            expect(isChapteredCourse({})).toBe(false);
        });
    });
});

