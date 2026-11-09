import { useCartStore } from '../useCartStore';

beforeEach(() => {
    useCartStore.setState({ items: [], userId: 1, removalError: null });
});

describe('مدیریت هوشمند دوره‌های فصلی در سبد خرید', () => {
    test('افزودن دوره کامل، فصل‌های تکی همان دوره را از سبد حذف می‌کند', () => {
        // ۱. اضافه کردن دو فصل از دوره ۱۰
        useCartStore.getState().addItem({
            id: 'chapter-1',
            chapterId: 1,
            courseId: 10,
            slug: 'course-10-chapter-1',
            title: 'دوره ۱۰ - فصل ۱',
            price: 500000,
            type: 'chapter',
        });
        useCartStore.getState().addItem({
            id: 'chapter-2',
            chapterId: 2,
            courseId: 10,
            slug: 'course-10-chapter-2',
            title: 'دوره ۱۰ - فصل ۲',
            price: 500000,
            type: 'chapter',
        });
        // اضافه کردن یک فصل از دوره ۲۰ (نباید حذف شود)
        useCartStore.getState().addItem({
            id: 'chapter-99',
            chapterId: 99,
            courseId: 20,
            slug: 'course-20-chapter-99',
            title: 'دوره ۲۰ - فصل ۹۹',
            price: 300000,
            type: 'chapter',
        });

        expect(useCartStore.getState().items).toHaveLength(3);

        // ۲. کاربر روی «خرید یکجا دوره ۱۰» کلیک می‌کند
        useCartStore.getState().addItem({
            id: 10,
            documentId: 'doc-course-10',
            slug: 'course-10',
            title: 'دوره ۱۰ کامل',
            price: 1500000,
            type: 'course',
            isChaptered: true,
        });

        const items = useCartStore.getState().items;
        // باید شامل دوره ۱۰ و فصل ۹۹ از دوره ۲۰ باشد، ولی فصل‌های ۱ و ۲ دوره ۱۰ حذف شده باشند
        expect(items).toHaveLength(2);
        expect(items.some((i) => i.id === 10 && i.type === 'course')).toBe(true);
        expect(items.some((i) => i.id === 'chapter-99')).toBe(true);
        expect(items.some((i) => i.id === 'chapter-1')).toBe(false);
        expect(items.some((i) => i.id === 'chapter-2')).toBe(false);
    });

    test('اگر دوره کامل در سبد باشد، افزودن فصل تکی از همان دوره رد می‌شود', () => {
        // ۱. افزودن دوره کامل به سبد
        useCartStore.getState().addItem({
            id: 10,
            documentId: 'doc-course-10',
            slug: 'course-10',
            title: 'دوره ۱۰ کامل',
            price: 1500000,
            type: 'course',
            isChaptered: true,
        });

        // ۲. تلاش برای افزودن یک فصل از همان دوره
        useCartStore.getState().addItem({
            id: 'chapter-1',
            chapterId: 1,
            courseId: 10,
            slug: 'course-10-chapter-1',
            title: 'دوره ۱۰ - فصل ۱',
            price: 500000,
            type: 'chapter',
        });

        const items = useCartStore.getState().items;
        expect(items).toHaveLength(1);
        expect(items[0].id).toBe(10);
    });
});
