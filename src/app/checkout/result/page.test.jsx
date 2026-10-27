import { render, screen, fireEvent } from '@testing-library/react';
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

test('بازگشت از پرداخت موفق با استعلام در حال پردازش، وضعیت ناموفق نشان نمی‌دهد و حالت در انتظار فعال‌سازی نمایش می‌دهد', () => {
    useSearchParams.mockReturnValue(new URLSearchParams('orderType=light_topup&topUpId=topup-1&status=success&refNum=mock-ref'));
    useCourseCheckoutResult.mockReturnValue({ phase: 'checking', courses: [], receipts: [] });
    render(<CheckoutResultPage />);
    expect(screen.getByRole('heading').closest('.card').className).not.toContain('failed');
    expect(screen.getByRole('heading').closest('.card').className).toContain('pending');
    expect(screen.queryByText('تراکنش پرداخت ناموفق بود')).toBeNull();
    expect(screen.queryByText(/اگر مبلغ از حسابتان کسر شده/)).toBeNull();
    expect(screen.getByText(/در حال استعلام پرداخت و فعال‌سازی دوره/)).toBeTruthy();
});

test('مرحله فعال‌سازی دوره ظاهر ناموفق ندارد و وضعیت در حال فعال‌سازی نشان می‌دهد', () => {
    useSearchParams.mockReturnValue(new URLSearchParams('orderType=light_topup&topUpId=topup-1&status=success&refNum=mock-ref'));
    useCourseCheckoutResult.mockReturnValue({ phase: 'activating', paid: true, courses: [{ externalCourseId: 'course-1', purchaseStatus: 'DeliveryPending' }] });
    render(<CheckoutResultPage />);
    expect(screen.getByRole('heading').closest('.card').className).not.toContain('failed');
    expect(screen.getByRole('heading').closest('.card').className).toContain('pending');
    expect(screen.queryByText('تراکنش پرداخت ناموفق بود')).toBeNull();
    expect(screen.queryByText(/اگر مبلغ از حسابتان کسر شده/)).toBeNull();
    expect(screen.getByText('در حال بررسی و فعال‌سازی دوره‌ها…')).toBeTruthy();
});

test('خرید با ۱ قلم به صورت پیش‌فرض آکاردئون را باز نمایش می‌دهد', () => {
    useSearchParams.mockReturnValue(new URLSearchParams('cartId=cart-123&status=success'));
    useCourseCheckoutResult.mockReturnValue({
        phase: 'completed',
        paid: true,
        courses: [{ externalCourseId: 'course-1', title: 'دوره جامع زیست‌شناسی', purchaseStatus: 'Completed' }],
        receipts: [{
            purchaseId: 'order-item-999',
            courseExternalId: 'course-1',
            courseTitle: 'دوره جامع زیست‌شناسی',
            baseAmountInNoor: 1500,
            finalAmountInNoor: 1200,
            discountAmountInNoor: 300,
            deliveryStatus: 'Delivered'
        }]
    });
    render(<CheckoutResultPage />);

    expect(screen.getByText('دوره جامع زیست‌شناسی')).toBeTruthy();
    expect(screen.getByText('۱ مورد')).toBeTruthy();
    expect(screen.getAllByText(/۱٬۲۰۰ نور/).length).toBeGreaterThanOrEqual(1);
    // چون فقط ۱ قلم وجود دارد، جزئیات باید پیش‌فرض باز باشند
    expect(screen.getByText('شماره سفارش / شناسه خرید:')).toBeTruthy();
    expect(screen.getByText('order-item-999')).toBeTruthy();
    expect(screen.getByText('رسید مالی بای‌مانی ✓')).toBeTruthy();
});

test('خرید با چند قلم به صورت پیش‌فرض آکاردئون‌ها را بسته نگه می‌دارد و با کلیک باز و بسته می‌شود', () => {
    useSearchParams.mockReturnValue(new URLSearchParams('cartId=cart-multi&status=success'));
    useCourseCheckoutResult.mockReturnValue({
        phase: 'completed',
        paid: true,
        courses: [
            { externalCourseId: 'course-1', title: 'دوره فیزیک دوازدهم', purchaseStatus: 'Completed' },
            { externalCourseId: 'course-2', title: 'دوره ریاضی تجربی', purchaseStatus: 'Completed' }
        ],
        receipts: [
            {
                purchaseId: 'pch-101',
                courseExternalId: 'course-1',
                courseTitle: 'دوره فیزیک دوازدهم',
                finalAmountInNoor: 5000,
                deliveryStatus: 'Delivered'
            },
            {
                purchaseId: 'pch-102',
                courseExternalId: 'course-2',
                courseTitle: 'دوره ریاضی تجربی',
                finalAmountInNoor: 7000,
                deliveryStatus: 'Delivered'
            }
        ]
    });
    render(<CheckoutResultPage />);

    expect(screen.getByText('۲ مورد')).toBeTruthy();
    expect(screen.getByText(/۱۲٬۰۰۰ نور/)).toBeTruthy();
    expect(screen.getByText('دوره فیزیک دوازدهم')).toBeTruthy();
    expect(screen.getByText('دوره ریاضی تجربی')).toBeTruthy();

    // برای بیش از ۱ قلم، جزئیات پیش‌فرض بسته هستند
    expect(screen.queryByText('pch-101')).toBeNull();
    expect(screen.queryByText('pch-102')).toBeNull();

    // کلیک روی قلم اول جهت باز کردن آکاردئون
    const firstItemHeader = screen.getByRole('button', { name: /دوره فیزیک دوازدهم/ });
    fireEvent.click(firstItemHeader);

    // اکنون جزئیات قلم اول قابل مشاهده است
    expect(screen.getByText('pch-101')).toBeTruthy();
    expect(screen.queryByText('pch-102')).toBeNull();

    // کلیک مجدد برای بستن
    fireEvent.click(firstItemHeader);
    expect(screen.queryByText('pch-101')).toBeNull();
});

test('کارت درگاه و مشخصات پرداخت اطلاعات و وضعیت را مرتب نمایش می‌دهد', () => {
    useSearchParams.mockReturnValue(new URLSearchParams('cartId=cart-1&status=success&refNum=sep-ref-123456789&traceNo=sep-trace-987'));
    useCourseCheckoutResult.mockReturnValue({
        phase: 'completed',
        paid: true,
        courses: [{ externalCourseId: 'c1', title: 'دوره آزمایشی', purchaseStatus: 'Completed' }],
        receipts: []
    });
    render(<CheckoutResultPage />);

    expect(screen.getByText('مشخصات پرداخت و تراکنش')).toBeTruthy();
    expect(screen.getByText('رسید دیجیتال (RefNum):')).toBeTruthy();
    expect(screen.getByText('sep-ref-123456789')).toBeTruthy();
    expect(screen.getByText('کد رهگیری بانک (TraceNo):')).toBeTruthy();
    expect(screen.getByText('sep-trace-987')).toBeTruthy();
    expect(screen.getByText('پرداخت الکترونیک سامان (سپ)')).toBeTruthy();
    expect(screen.getByText('خرید و فعال‌سازی تأیید شد')).toBeTruthy();
});

test('چیدمان جدید اقدام‌ها در خرید موفق: دکمه اصلی «مشاهده دوره‌های من»، لینک‌های متنی و پشتیبانی در پایین کارت', () => {
    useSearchParams.mockReturnValue(new URLSearchParams('cartId=cart-success&status=success'));
    useCourseCheckoutResult.mockReturnValue({
        phase: 'completed',
        paid: true,
        courses: [{ externalCourseId: 'c1', title: 'دوره فیزیک', purchaseStatus: 'Completed' }],
        receipts: [{ purchaseId: 'pch-1', finalAmountInNoor: 1000 }]
    });
    render(<CheckoutResultPage />);

    // دکمه اصلی (Primary CTA)
    const primaryBtn = screen.getByRole('link', { name: 'مشاهده دوره‌های من' });
    expect(primaryBtn.getAttribute('href')).toBe('/profile/purchases');
    expect(primaryBtn.className).toContain('primaryButton');

    // لینک‌های متنی ساده بدون کادر
    const ordersLink = screen.getByRole('link', { name: 'سفارش‌های من' });
    expect(ordersLink.getAttribute('href')).toBe('/profile/orders');
    expect(ordersLink.className).toContain('textLink');

    const walletLink = screen.getByRole('link', { name: 'کیف پول' });
    expect(walletLink.getAttribute('href')).toBe('/profile');
    expect(walletLink.className).toContain('textLink');

    // لینک راهنمای پشتیبانی در انتهای کارت
    const supportLink = screen.getByRole('link', { name: 'با پشتیبانی تماس بگیرید' });
    expect(supportLink.getAttribute('href')).toBe('/contact');
    expect(screen.getByText(/در صورت نیاز به راهنمایی/)).toBeTruthy();

    // سرتیتر لیست اقلام بدون کادر
    expect(screen.getByText('اقلام سفارش')).toBeTruthy();
    expect(screen.getByText('۱ مورد')).toBeTruthy();
});

test('چیدمان جدید اقدام‌ها در خرید ناموفق یا در حال استعلام: دکمه اصلی «کیف پول و حساب کاربری» همراه با لینک مشاهده دوره‌ها', () => {
    useSearchParams.mockReturnValue(new URLSearchParams('cartId=cart-fail&status=failed'));
    useCourseCheckoutResult.mockReturnValue({
        phase: 'incomplete',
        paid: false,
        courses: [{ externalCourseId: 'c1', title: 'دوره شیمی', purchaseStatus: 'PurchaseIncomplete' }],
        receipts: []
    });
    render(<CheckoutResultPage />);

    // دکمه اصلی در حالت ناموفق/استعلام: کیف پول و حساب کاربری
    const primaryBtn = screen.getByRole('link', { name: 'کیف پول و حساب کاربری' });
    expect(primaryBtn.getAttribute('href')).toBe('/profile');
    expect(primaryBtn.className).toContain('primaryButton');

    // لینک متنی مشاهده دوره‌های من
    const coursesLink = screen.getByRole('link', { name: 'مشاهده دوره‌های من' });
    expect(coursesLink.getAttribute('href')).toBe('/profile/purchases');
    expect(coursesLink.className).toContain('textLink');

    // لینک پشتیبانی
    expect(screen.getByRole('link', { name: 'با پشتیبانی تماس بگیرید' }).getAttribute('href')).toBe('/contact');
});

test('فیلد رسید دیجیتال (RefNum) و شناسه‌ها به درستی با کلاس کوتاه ساز و کنترل سرریز نمایش داده می‌شوند', () => {
    useSearchParams.mockReturnValue(new URLSearchParams('cartId=cart-1&status=success&refNum=sep-ref-very-long-digit-12345678901234567890'));
    useCourseCheckoutResult.mockReturnValue({
        phase: 'completed',
        paid: true,
        courses: [{ externalCourseId: 'c1', title: 'دوره فیزیک', purchaseStatus: 'Completed' }],
        receipts: []
    });
    render(<CheckoutResultPage />);

    expect(screen.getByText('رسید دیجیتال (RefNum):')).toBeTruthy();
    const refNumElem = screen.getByText('sep-ref-very-long-digit-12345678901234567890');
    expect(refNumElem).toBeTruthy();
    expect(refNumElem.getAttribute('dir')).toBe('ltr');
});

test('بازگشت از درگاه با status=success در صورت ارجاع به بررسی مالی، پیام چرخنده استعلام را نشان نمی‌دهد و وضعیت در صف بررسی مالی را نمایش می‌دهد', () => {
    useSearchParams.mockReturnValue(new URLSearchParams('cartId=cart-1&status=success&refNum=sep-ref-666&traceNo=sep-trace-666'));
    useCourseCheckoutResult.mockReturnValue({
        phase: 'financialReview',
        isUnderReview: true,
        reviewCaseId: 'case-financial-789',
        reviewReasonCode: 'VERIFY_UNKNOWN',
        paid: false,
        courses: [{ externalCourseId: 'course-1', title: 'دوره جامع نورانی', purchaseStatus: 'NotPurchased' }],
        receipts: []
    });
    render(<CheckoutResultPage />);

    // پیام چرخنده و نوار پیشرفت استعلام نباید وجود داشته باشد
    expect(screen.queryByText(/در حال استعلام پرداخت و فعال‌سازی دوره/)).toBeNull();
    expect(screen.queryByText('در حال بررسی و فعال‌سازی دوره‌ها…')).toBeNull();

    // عنوان کارت و وضعیت بررسی مالی
    expect(screen.getByText('پرداخت در صف بررسی مالی قرار گرفت')).toBeTruthy();
    expect(screen.getByText(/به دلیل پاسخ نامشخص درگاه بانکی، پرداخت شما در صف بررسی مالی قرار گرفته است/)).toBeTruthy();
    expect(screen.getAllByText('در انتظار بررسی مالی').length).toBeGreaterThanOrEqual(1);

    // نمایش کد پرونده و کدهای پیگیری
    expect(screen.getByText('کد پرونده رسیدگی مالی:')).toBeTruthy();
    expect(screen.getByText('case-financial-789')).toBeTruthy();
    expect(screen.getByText('sep-ref-666')).toBeTruthy();

    // کارت نباید دارای کلاس failed باشد
    expect(screen.getByRole('heading').closest('.card').className).not.toContain('failed');
    // راهنمای پیگیری و عدم پرداخت دوباره
    expect(screen.getAllByText(/نیازی به پرداخت مجدد نیست/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('link', { name: 'کیف پول و حساب کاربری' })).toBeTruthy();
});

test('بازگشت از درگاه با status=financial_review صریح مستقیماً کارت بررسی مالی و عدم نیاز به پرداخت مجدد را نمایش می‌دهد', () => {
    useSearchParams.mockReturnValue(new URLSearchParams('orderType=light_topup&topUpId=topup-fr&status=financial_review&refNum=sep-ref-777'));
    useCourseCheckoutResult.mockReturnValue({
        phase: 'financialReview',
        isUnderReview: true,
        paid: false,
        courses: [],
        receipts: []
    });
    render(<CheckoutResultPage />);

    expect(screen.queryByText(/در حال استعلام پرداخت و فعال‌سازی دوره/)).toBeNull();
    expect(screen.getByText('پرداخت در صف بررسی مالی قرار گرفت')).toBeTruthy();
    expect(screen.getByText(/به دلیل پاسخ نامشخص درگاه بانکی، پرداخت شما در صف بررسی مالی قرار گرفته است/)).toBeTruthy();
    expect(screen.getByText('در انتظار بررسی مالی')).toBeTruthy();
    expect(screen.queryByText('تراکنش پرداخت ناموفق بود')).toBeNull();
    expect(screen.getByRole('link', { name: 'کیف پول و حساب کاربری' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /پرداخت مجدد/ })).toBeNull();
});

test('بازگشت از درگاه با status=pending_sync پیام در حال بررسی و همگام‌سازی پرداخت بدون اسپینر نمایش می‌دهد', () => {
    useSearchParams.mockReturnValue(new URLSearchParams('orderType=light_topup&topUpId=topup-ps&status=pending_sync&refNum=sep-ref-888'));
    useCourseCheckoutResult.mockReturnValue({
        phase: 'pendingSync',
        isUnderReview: false,
        paid: false,
        courses: [],
        receipts: []
    });
    render(<CheckoutResultPage />);

    expect(screen.queryByText(/در حال استعلام پرداخت و فعال‌سازی دوره/)).toBeNull();
    expect(screen.getByText('پرداخت در حال بررسی و همگام‌سازی است')).toBeTruthy();
    expect(screen.getAllByText(/بدون نیاز به پرداخت مجدد/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('در حال همگام‌سازی')).toBeTruthy();
    expect(screen.queryByText('تراکنش پرداخت ناموفق بود')).toBeNull();
    expect(screen.getByRole('link', { name: 'کیف پول و حساب کاربری' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /پرداخت مجدد/ })).toBeNull();
});
