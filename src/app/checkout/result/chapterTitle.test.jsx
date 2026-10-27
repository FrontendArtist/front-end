import { render, screen } from '@testing-library/react';
import CheckoutResultPage from './page';
import useCourseCheckoutResult from '@/hooks/useCourseCheckoutResult';
import { useSearchParams } from 'next/navigation';

jest.mock('next/navigation', () => ({ useSearchParams: jest.fn() }));
jest.mock('@/hooks/useCompletedOrderCart', () => jest.fn());
jest.mock('@/hooks/useCourseCheckoutResult', () => jest.fn());
jest.mock('./page.module.scss', () => ({
    card: 'card',
    success: 'success',
    failed: 'failed',
    cancel: 'cancel',
    financialReview: 'financialReview',
    pending: 'pending',
    pendingBadge: 'pendingBadge',
    primaryButton: 'primaryButton',
    textLink: 'textLink',
    itemsSectionHeader: 'itemsSectionHeader'
}));

describe('نمایش عنوان خرید فصلی در صفحه نتیجه پرداخت', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test('برای خرید فصلی، عنوان به شکل «عنوان دوره (فصل مثلا 1)» در اقلام رسید نمایش داده می‌شود', () => {
        useSearchParams.mockReturnValue(new URLSearchParams('source=noor&cartId=cart-chapter-1'));
        useCourseCheckoutResult.mockReturnValue({
            phase: 'completed',
            paid: true,
            courses: [
                {
                    externalCourseId: 'ch-int-1',
                    title: 'دوره هفت آسمان (فصل 1)',
                    purchaseStatus: 'Completed',
                    itemType: 'CourseChapter',
                    parentExternalId: 'course-doc-1'
                }
            ],
            receipts: [
                {
                    purchaseId: 'p-1',
                    courseExternalId: 'ch-int-1',
                    courseTitle: 'دوره هفت آسمان (فصل 1)',
                    finalAmountInNoor: 50,
                    itemType: 'CourseChapter'
                }
            ]
        });
        render(<CheckoutResultPage />);

        expect(screen.getByText('دوره هفت آسمان (فصل 1)')).toBeTruthy();
    });

    test('برای خرید فصلی در صورت ارسال عنوان خام فصل از سرور، عنوان دوره از کش به فرمت پرانتز اضافه می‌شود', () => {
        localStorage.setItem('chapter_course_titles', JSON.stringify({
            'ch-int-2': {
                courseTitle: 'طرح الهی',
                chapterTitle: 'فصل 2',
                parentExternalId: 'course-doc-2'
            }
        }));
        useSearchParams.mockReturnValue(new URLSearchParams('source=noor&cartId=cart-chapter-2'));
        useCourseCheckoutResult.mockReturnValue({
            phase: 'completed',
            paid: true,
            courses: [
                {
                    externalCourseId: 'ch-int-2',
                    title: 'فصل 2',
                    purchaseStatus: 'Completed',
                    itemType: 'CourseChapter',
                    parentExternalId: 'course-doc-2'
                }
            ],
            receipts: []
        });
        render(<CheckoutResultPage />);

        expect(screen.getByText('طرح الهی (فصل 2)')).toBeTruthy();
    });
});

