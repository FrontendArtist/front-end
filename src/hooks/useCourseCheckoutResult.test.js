import { getCourseCart, purchaseCourseCart } from '@/lib/courseCartApi';
jest.mock('@/lib/courseCartApi', () => ({ getCourseCart: jest.fn(), purchaseCourseCart: jest.fn() }));
import { act, renderHook, waitFor } from '@testing-library/react';
import useCourseCheckoutResult from './useCourseCheckoutResult';
import { getCourseCheckout, getTopUpCheckout, getCurrentCourseAccess } from '@/lib/courseCheckoutApi';
import { useCartStore } from '@/store/useCartStore';
import { triggerLightUpdate } from '@/store/useLightStore';

jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 7, jwt: 'jwt' } }, status: 'authenticated' }) }));
jest.mock('@/lib/courseCheckoutApi', () => ({ getCourseCheckout: jest.fn(), getTopUpCheckout: jest.fn(), getCurrentCourseAccess: jest.fn() }));
jest.mock('@/store/useLightStore', () => ({ triggerLightUpdate: jest.fn() }));
jest.mock('@/lib/client/profileClientApi', () => ({ invalidateProfileCache: jest.fn() }));
const course = { id: 42, documentId: 'course-1', type: 'course' };
const otherCourse = { id: 43, documentId: 'course-2', type: 'course' };
const response = (purchaseStatus, topUpStatus = 'Confirmed') => ({ topUpStatus, courses: [{ externalCourseId: 'course-1', purchaseStatus }] });

beforeEach(() => {
    jest.clearAllMocks();
    getCurrentCourseAccess.mockResolvedValue(new Set(['course-1', 'course-2']));
    useCartStore.setState({ items: [course, otherCourse], hydratedUserId: 7 });
});
afterEach(() => jest.useRealTimers());

test('تحویل تأییدشده فقط همان دوره را از سبد حذف می‌کند', async () => {
    getTopUpCheckout.mockResolvedValue(response('Completed'));
    const { result } = renderHook(() => useCourseCheckoutResult('', 'topup-1'));
    await waitFor(() => expect(result.current.phase).toBe('completed'));
    expect(useCartStore.getState().items).toEqual([otherCourse]);
    expect(triggerLightUpdate).toHaveBeenCalled();
});

test('شارژ موفق بدون خرید، پس از فرصت پردازش به کاربر اعلام می‌شود و سبد حفظ می‌شود', async () => {
    jest.useFakeTimers();
    getTopUpCheckout.mockResolvedValue(response('PurchaseIncomplete'));
    const { result } = renderHook(() => useCourseCheckoutResult('', 'topup-1'));
    await act(async () => {});
    expect(result.current.phase).toBe('incomplete');
    for (let i = 0; i < 14; i++) await act(async () => { jest.advanceTimersByTime(2000); });
    expect(result.current.phase).toBe('incomplete');
    expect(result.current.paid).toBe(true);
    expect(useCartStore.getState().items).toHaveLength(2);
});

test('حذف دسترسی در استرپی با وجود سابقه تحویل، موفقیت فعال‌سازی اعلام نمی‌کند', async () => {
    getCourseCart.mockResolvedValue({ status: 'Paid', courses: [{ externalCourseId: 'course-1', purchaseStatus: 'Completed' }] });
    getCurrentCourseAccess.mockResolvedValue(new Set());
    const { result } = renderHook(() => useCourseCheckoutResult('', '', 'old-cart'));
    await waitFor(() => expect(result.current.phase).toBe('accessMissing'));
    expect(result.current.courses[0].purchaseStatus).toBe('AccessMissing');
    expect(useCartStore.getState().items).toEqual([course, otherCourse]);
    expect(purchaseCourseCart).not.toHaveBeenCalled();
});

test('خطای بررسی دسترسی فعلی، سابقه تحویل را به موفقیت تبدیل نمی‌کند', async () => {
    getCourseCart.mockResolvedValue({ status: 'Paid', courses: [{ externalCourseId: 'course-1', purchaseStatus: 'Completed' }] });
    getCurrentCourseAccess.mockRejectedValue(new Error('قطع ارتباط استرپی'));
    const { result } = renderHook(() => useCourseCheckoutResult('', '', 'old-cart'));
    await waitFor(() => expect(result.current.phase).toBe('unknown'));
    expect(useCartStore.getState().items).toEqual([course, otherCourse]);
});

test('شکست تحویل پس از برداشت، موفقیت دسترسی اعلام نمی‌کند و پرداخت تازه نمی‌سازد', async () => {
    getTopUpCheckout.mockResolvedValue(response('DeliveryPending'));
    const { result } = renderHook(() => useCourseCheckoutResult('', 'topup-1'));
    await waitFor(() => expect(result.current.phase).toBe('activating'));
    expect(result.current.paid).toBe(true);
    expect(useCartStore.getState().items).toEqual([otherCourse]);
    expect(getCourseCheckout).not.toHaveBeenCalled();
});

test('لغو پرداخت، سبد را حفظ می‌کند', async () => {
    getTopUpCheckout.mockResolvedValue(response('NotPurchased', 'Rejected'));
    const { result } = renderHook(() => useCourseCheckoutResult('', 'topup-1'));
    await waitFor(() => expect(result.current.phase).toBe('paymentFailed'));
    expect(useCartStore.getState().items).toHaveLength(2);
});

test('خطای استعلام به معنی تأیید شارژ یا خرید نیست', async () => {
    getTopUpCheckout.mockRejectedValue(new Error('قطع ارتباط'));
    const { result } = renderHook(() => useCourseCheckoutResult('', 'topup-1'));
    await waitFor(() => expect(result.current.phase).toBe('unknown'));
    expect(result.current.paid).not.toBe(true);
    expect(useCartStore.getState().items).toHaveLength(2);
});

test('نتیجه خرید مستقیم هم از سرور تأیید می‌شود', async () => {
    getCourseCheckout.mockResolvedValue({ purchaseStatus: 'Completed' });
    const { result } = renderHook(() => useCourseCheckoutResult('course-1', ''));
    await waitFor(() => expect(result.current.phase).toBe('completed'));
    expect(getTopUpCheckout).not.toHaveBeenCalled();
});

 test('بازگشت بانک بدون حافظه مرورگر، سبد را از شناسه شارژ پیدا می‌کند و فقط استعلام می‌زند', async () => {
    sessionStorage.clear();
    getTopUpCheckout.mockResolvedValue({ cartId: 'cart-1', topUpStatus: 'Confirmed', courses: [] });
    getCourseCart.mockResolvedValue({ status: 'Paid', courses: [
        { externalCourseId: 'course-1', title: 'اول', purchaseStatus: 'Completed' },
        { externalCourseId: 'course-2', title: 'دوم', purchaseStatus: 'DeliveryPending' },
    ] });
    const added = { id: 99, documentId: 'new-course', type: 'course' };
    useCartStore.setState({ items: [course, otherCourse, added], hydratedUserId: 7 });
    const { result } = renderHook(() => useCourseCheckoutResult('', 'topup-cart'));
    await waitFor(() => expect(result.current.phase).toBe('activating'));
    expect(getCourseCart).toHaveBeenCalledWith('cart-1', 'jwt', expect.anything());
    expect(result.current.paid).toBe(true);
    expect(useCartStore.getState().items).toEqual([added]);
    expect(purchaseCourseCart).not.toHaveBeenCalled();
});

test('خرید همزمان دوره و فصل با اعتبارسنجی فصل تکمیل می‌شود و پیام‌ها با هم هماهنگ می‌مانند', async () => {
    const chapterCartItem = { id: 'chapter-uuid-1', type: 'chapter', integrationId: 'chapter-uuid-1', chapterId: 6 };
    useCartStore.setState({ items: [course, chapterCartItem], hydratedUserId: 7 });

    const access = new Set(['course-1']);
    access.hasChapterAccess = (chapterExternalId) => chapterExternalId === 'chapter-uuid-1';
    getCurrentCourseAccess.mockResolvedValue(access);

    getCourseCart.mockResolvedValue({
        status: 'Paid',
        courses: [
            { externalCourseId: 'course-1', title: 'دوره ازدواج کائناتی', purchaseStatus: 'Completed', itemType: 'Course' },
            { externalCourseId: 'chapter-uuid-1', title: 'فصل 6', purchaseStatus: 'Completed', itemType: 'CourseChapter', parentExternalId: 'course-parent' },
        ]
    });

    const { result } = renderHook(() => useCourseCheckoutResult('', '', 'cart-with-chapter'));
    await waitFor(() => expect(result.current.phase).toBe('completed'));
    expect(result.current.courses[0].purchaseStatus).toBe('Completed');
    expect(result.current.courses[1].purchaseStatus).toBe('Completed');
    expect(useCartStore.getState().items).toEqual([]);
});

test('بازکردن صفحه نتیجه با سبد خالی، دسترسی فصل را از نگاشت استراپی تایید می‌کند و خطا نمی‌دهد', async () => {
    // سبد خرید از قبل خالی است (هیچ قلم یا chapterId کمکی در کلاینت نیست)
    useCartStore.setState({ items: [], hydratedUserId: 7 });

    const access = new Set(['course-1']);
    access.enrolledChapterIntegrationIds = new Set(['chapter-uuid-1']);
    access.hasChapterAccess = (chapterExternalId) => access.enrolledChapterIntegrationIds.has(chapterExternalId);
    getCurrentCourseAccess.mockResolvedValue(access);

    getCourseCart.mockResolvedValue({
        status: 'Paid',
        courses: [
            { externalCourseId: 'course-1', title: 'دوره ازدواج کائناتی', purchaseStatus: 'Completed', itemType: 'Course' },
            { externalCourseId: 'chapter-uuid-1', title: 'فصل 6', purchaseStatus: 'Completed', itemType: 'CourseChapter', parentExternalId: 'course-parent' },
        ]
    });

    const { result } = renderHook(() => useCourseCheckoutResult('', '', 'cart-with-chapter'));
    await waitFor(() => expect(result.current.phase).toBe('completed'));
    expect(result.current.courses[0].purchaseStatus).toBe('Completed');
    expect(result.current.courses[1].purchaseStatus).toBe('Completed');
    expect(result.current.phase).not.toBe('accessMissing');
});

