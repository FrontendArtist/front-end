import { render, screen } from '@testing-library/react';
import CheckoutResultPage from './page';
import useCourseCheckoutResult from '@/hooks/useCourseCheckoutResult';
import { useSearchParams } from 'next/navigation';

jest.mock('next/navigation', () => ({ useSearchParams: jest.fn() }));
jest.mock('@/hooks/useCompletedOrderCart', () => jest.fn());
jest.mock('@/hooks/useCourseCheckoutResult', () => jest.fn());
jest.mock('./page.module.scss', () => ({ card: 'card', success: 'success', failed: 'failed' }));

beforeEach(() => {
    useSearchParams.mockReturnValue(new URLSearchParams('status=success&orderType=light_topup&topUpId=topup-1'));
});

test('شارژ موفق با تحویل ناموفق، دوره را فعال‌شده نمایش نمی‌دهد', () => {
    useCourseCheckoutResult.mockReturnValue({ phase: 'activating', paid: true, courses: [{ externalCourseId: 'course-1', purchaseStatus: 'DeliveryPending' }] });
    render(<CheckoutResultPage />);
    expect(screen.getByText('در حال بررسی و فعال‌سازی دوره‌ها…')).toBeTruthy();
    expect(screen.getByRole('heading').closest('.card').className).not.toContain('success');
    expect(screen.queryByText('خرید موفق؛ دوره‌ها فعال شدند')).toBeNull();
    expect(screen.queryByText(/پرداخت مجدد/)).toBeNull();
});

test('شکست خرید پس از شارژ، تکمیل‌نشدن خرید را صریح نمایش می‌دهد', () => {
    useCourseCheckoutResult.mockReturnValue({ phase: 'incomplete', paid: true, courses: [{ externalCourseId: 'course-1', purchaseStatus: 'PurchaseIncomplete' }] });
    render(<CheckoutResultPage />);
    expect(screen.getByText(/اما خرید دوره تکمیل نشده است/)).toBeTruthy();
    expect(screen.queryByText('خرید موفق؛ دوره‌ها فعال شدند')).toBeNull();
});

test('سابقه پرداخت با دسترسی حذف‌شده، پیام موفقیت و ظاهر موفق ندارد', () => {
    useSearchParams.mockReturnValue(new URLSearchParams('source=noor&cartId=bea58246-fa9b-4366-9f90-acf871a4244a'));
    useCourseCheckoutResult.mockReturnValue({ phase: 'accessMissing', paid: true,
        courses: [{ externalCourseId: 'course-1', purchaseStatus: 'AccessMissing' }] });
    render(<CheckoutResultPage />);
    expect(screen.getByText(/سابقه خرید در بای‌مانی وجود دارد/)).toBeTruthy();
    expect(screen.queryByText('خرید موفق؛ دوره‌ها فعال شدند')).toBeNull();
    expect(screen.getByRole('heading').closest('.card').className).not.toContain('success');
    expect(screen.queryByText(/پرداخت مجدد/)).toBeNull();
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
    expect(screen.getByText('خرید موفق؛ دوره‌ها فعال شدند')).toBeTruthy();
});

test('شکست قطعی خرید دوره راه بازگشت به همان سبد و پرداخت مجدد دارد', () => {
    useCourseCheckoutResult.mockReturnValue({ phase: 'paymentFailed', paid: false,
        courses: [{ externalCourseId: 'course-1', purchaseStatus: 'PurchaseIncomplete' }] });
    render(<CheckoutResultPage />);
    expect(screen.getByRole('link', { name: 'بازگشت به سبد خرید و پرداخت مجدد' }).getAttribute('href')).toBe('/cart');
    expect(screen.getByText('پرداخت تأیید نشد')).toBeTruthy();
    expect(screen.queryByText(/تا مشخص‌شدن نتیجه دوباره پرداخت نکنید/)).toBeNull();
});

test('انصراف تأییدشده با پیام پرداخت نامعلوم نمایش داده نمی‌شود', () => {
    useSearchParams.mockReturnValue(new URLSearchParams('status=cancel&orderType=light_topup&topUpId=topup-1'));
    useCourseCheckoutResult.mockReturnValue({ phase: 'paymentFailed', paid: false,
        courses: [{ externalCourseId: 'course-1', purchaseStatus: 'NotPurchased' }] });
    render(<CheckoutResultPage />);
    expect(screen.getByText('لغو شده توسط کاربر')).toBeTruthy();
    expect(screen.queryByText('در حال پیگیری')).toBeNull();
});

test('شارژ با نتیجه نامعلوم، شکست قطعی یا برگشت تضمین‌شده نشان نمی‌دهد', () => {
    useSearchParams.mockReturnValue(new URLSearchParams('status=failed&orderType=light_topup&topUpId=topup-1'));
    useCourseCheckoutResult.mockReturnValue({ phase: 'paymentPending', paid: false, courses: [] });
    render(<CheckoutResultPage />);
    expect(screen.getByText('در حال پیگیری')).toBeTruthy();
    expect(screen.getByText(/نتیجهٔ شارژ یا برگشت وجه هنوز قطعی نیست/)).toBeTruthy();
    expect(screen.queryByText('ناموفق')).toBeNull();
    expect(screen.queryByText(/۷۲ ساعت/)).toBeNull();
});
