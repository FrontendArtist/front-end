import { render, screen } from '@testing-library/react';
import CheckoutResultPage from './page';
import useCourseCheckoutResult from '@/hooks/useCourseCheckoutResult';

jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('status=success&orderType=light_topup&topUpId=topup-1') }));
jest.mock('@/hooks/useCompletedOrderCart', () => jest.fn());
jest.mock('@/hooks/useCourseCheckoutResult', () => jest.fn());

test('شارژ موفق با تحویل ناموفق، دوره را فعال‌شده نمایش نمی‌دهد', () => {
    useCourseCheckoutResult.mockReturnValue({ phase: 'activating', paid: true, courses: [{ externalCourseId: 'course-1', purchaseStatus: 'DeliveryPending' }] });
    render(<CheckoutResultPage />);
    expect(screen.getByText('در حال بررسی و فعال‌سازی دوره…')).toBeTruthy();
    expect(screen.queryByText('خرید موفق؛ دوره فعال شد')).toBeNull();
    expect(screen.queryByText(/پرداخت مجدد/)).toBeNull();
});

test('شکست خرید پس از شارژ، حفظ نور را صریح نمایش می‌دهد', () => {
    useCourseCheckoutResult.mockReturnValue({ phase: 'incomplete', paid: true, courses: [{ externalCourseId: 'course-1', purchaseStatus: 'PurchaseIncomplete' }] });
    render(<CheckoutResultPage />);
    expect(screen.getByText(/نور شارژشده در کیف پول شما محفوظ است/)).toBeTruthy();
    expect(screen.queryByText('خرید موفق؛ دوره فعال شد')).toBeNull();
});

test('پارامتر موفق در نشانی بدون استعلام موفق سرور، تأیید خرید یا شارژ نمی‌سازد', () => {
    useCourseCheckoutResult.mockReturnValue({ phase: 'unknown', courses: [] });
    render(<CheckoutResultPage />);
    expect(screen.getByText('وضعیت پرداخت در حال بررسی است')).toBeTruthy();
    expect(screen.queryByText('نور شارژشده به کیف پول شما اضافه شد.')).toBeNull();
});

test('فقط تحویل تأییدشده، موفقیت فعال‌سازی نشان می‌دهد', () => {
    useCourseCheckoutResult.mockReturnValue({ phase: 'completed', paid: true, courses: [{ externalCourseId: 'course-1', purchaseStatus: 'Completed' }] });
    render(<CheckoutResultPage />);
    expect(screen.getByText('خرید موفق؛ دوره فعال شد')).toBeTruthy();
});
