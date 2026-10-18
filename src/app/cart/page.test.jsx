import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { StrictMode } from 'react';
import CartPage from './page';
import { useCartStore } from '@/store/useCartStore';
import { prepareCourseCart, getCourseCart, getExistingCourseCartId } from '@/lib/courseCartApi';
import { previewCourseCart } from '@/lib/courseCartPreviewApi';
import { getWalletBalanceWithByeMoney } from '@/lib/byeMoneyApi';
import { executeNoorCartPurchase } from '@/lib/checkoutService';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 7, jwt: 'jwt' } }, status: 'authenticated' }) }));
jest.mock('@/lib/courseCartApi', () => ({ prepareCourseCart: jest.fn(), getCourseCartId: () => 'cart-1', getExistingCourseCartId: jest.fn(), getCourseCart: jest.fn() }));
jest.mock('@/lib/courseCartPreviewApi', () => ({ ...jest.requireActual('@/lib/courseCartPreviewApi'), previewCourseCart: jest.fn() }));
jest.mock('@/lib/byeMoneyApi', () => ({ getWalletBalanceWithByeMoney: jest.fn() }));
jest.mock('@/lib/checkoutService', () => ({ executeNoorCartPurchase: jest.fn(), executeOnlinePayment: jest.fn() }));
jest.mock('@/components/cart/DiscountCouponInput/DiscountCouponInput', () => () => null);
jest.mock('@/components/ui/PriceWithHint/PriceWithHint', () => ({ price }) => <span>{price} نور</span>);
jest.mock('@/components/ui/BreadCrumb/Breadcrumb', () => () => null);
jest.mock('next/image', () => () => null);

const course = (id = 'course-1', price = 150) => ({ externalCourseId: id, title: 'عنوان معتبر', basePriceInNoor: price, itemDiscountInNoor: 0, couponDiscountInNoor: 0, priceInNoor: price });
const quote = (price = 150) => ({ couponCode: null, originalTotalInNoor: price, itemDiscountInNoor: 0, couponDiscountInNoor: 0, priceInNoor: price, courses: [course('course-1', price)] });
const ready = (price = 150, shortfall = 0) => ({ ...quote(price), cartId: 'cart-1', status: 'Ready', balanceInNoor: price - shortfall, shortfallInNoor: shortfall });
const purchaseButton = () => screen.findByRole('button', { name: 'خرید با کیف پول نور' });
beforeEach(() => {
    jest.resetAllMocks();
    useCartStore.setState({ items: [{ id: 42, documentId: 'course-1', type: 'course', title: 'دوره', price: 999, quantity: 1, slug: 'course' }], appliedCoupon: null, userId: 7, hydratedUserId: 7 });
    previewCourseCart.mockResolvedValue(quote());
    prepareCourseCart.mockResolvedValue(ready());
    getWalletBalanceWithByeMoney.mockResolvedValue({ success: true, balance: 1000 });
});

test('نمایش، فوکوس و نمایش مجدد صفحه هیچ آماده‌سازی مالی یا رزروی ایجاد نمی‌کنند', async () => {
    render(<StrictMode><CartPage /></StrictMode>);
    await purchaseButton();
    const previewCount = previewCourseCart.mock.calls.length;
    await act(async () => {
        window.dispatchEvent(new Event('focus'));
        window.dispatchEvent(new Event('pageshow'));
    });
    expect(previewCourseCart).toHaveBeenCalledTimes(previewCount);
    expect(prepareCourseCart).not.toHaveBeenCalled();
    expect(getCourseCart).not.toHaveBeenCalled();
    expect(screen.queryByText('999 نور')).toBeNull();
});

test.each([[150, 0, 'خرید با کیف پول نور'], [20, 130, 'پرداخت آنلاین و خرید']])('آماده‌سازی فقط پس از کلیک و پرداخت با کسری نهایی سرور انجام می‌شود: %s', async (balance, shortfall, label) => {
    getWalletBalanceWithByeMoney.mockResolvedValue({ success: true, balance });
    prepareCourseCart.mockResolvedValue(ready(150, shortfall));
    render(<CartPage />);
    const button = await screen.findByRole('button', { name: label });
    expect(prepareCourseCart).not.toHaveBeenCalled();
    fireEvent.click(button);
    await waitFor(() => expect(executeNoorCartPurchase).toHaveBeenCalledWith(expect.objectContaining({ cartId: 'cart-1', jwt: 'jwt', payOnline: shortfall > 0 })));
    expect(prepareCourseCart).toHaveBeenCalledTimes(1);
});

test('عدم دسترسی به موجودی مانع نمایش قیمت مستقل استرپی نیست', async () => {
    getWalletBalanceWithByeMoney.mockResolvedValue({ success: false });
    render(<CartPage />);
    expect(await screen.findByRole('button', { name: 'ادامه پرداخت' })).toBeTruthy();
    expect(screen.getAllByText('150 نور').length).toBeGreaterThan(0);
    expect(prepareCourseCart).not.toHaveBeenCalled();
});

test('تغییر قیمت هنگام پرداخت قبل از برداشت نمایش داده می‌شود و تأیید دوباره لازم دارد', async () => {
    prepareCourseCart.mockResolvedValue(ready(200));
    render(<CartPage />);
    fireEvent.click(await purchaseButton());
    await screen.findByText(/قیمت یا تخفیف سبد تغییر کرده است/);
    expect(screen.getAllByText('200 نور').length).toBeGreaterThan(0);
    expect(executeNoorCartPurchase).not.toHaveBeenCalled();
    fireEvent.click(await purchaseButton());
    await waitFor(() => expect(executeNoorCartPurchase).toHaveBeenCalledTimes(1));
});

test('دو کلیک هم‌زمان فقط یک آماده‌سازی و خرید دارند', async () => {
    let finish;
    prepareCourseCart.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(<CartPage />);
    const button = await purchaseButton();
    fireEvent.click(button);
    fireEvent.click(button);
    expect(prepareCourseCart).toHaveBeenCalledTimes(1);
    await act(async () => finish(ready()));
    await waitFor(() => expect(executeNoorCartPurchase).toHaveBeenCalledTimes(1));
});

test('تغییر انتخاب هنگام آماده‌سازی، پرداخت انتخاب قبلی را متوقف می‌کند', async () => {
    let finish;
    prepareCourseCart.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(<CartPage />);
    fireEvent.click(await purchaseButton());
    await act(async () => useCartStore.setState({ items: [{ id: 99, documentId: 'new', type: 'course' }] }));
    await act(async () => finish(ready()));
    expect(executeNoorCartPurchase).not.toHaveBeenCalled();
});

test.each(['Paid', 'AwaitingTopUp'])('اقدام پرداخت قبلی با GET بازیابی می‌شود: %s', async status => {
    getExistingCourseCartId.mockReturnValue('cart-1');
    getCourseCart.mockResolvedValue({ ...ready(), status });
    render(<CartPage />);
    await screen.findByRole('button', { name: status === 'AwaitingTopUp' ? 'پیگیری وضعیت پرداخت' : 'خرید با کیف پول نور' });
    expect(getCourseCart).toHaveBeenCalledWith('cart-1', 'jwt', expect.anything());
    expect(previewCourseCart).not.toHaveBeenCalled();
    expect(prepareCourseCart).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: status === 'AwaitingTopUp' ? 'پیگیری وضعیت پرداخت' : 'خرید با کیف پول نور' }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/checkout/result?source=noor&cartId=cart-1'));
    expect(executeNoorCartPurchase).not.toHaveBeenCalled();
});

test('رزرو معتبر قبلی بدون استعلام دوباره ظرفیت کوپن بازیابی می‌شود', async () => {
    const items = useCartStore.getState().items;
    useCartStore.setState({ appliedCoupon: { code: 'LAST', pending: true } });
    getExistingCourseCartId.mockReturnValue('cart-1');
    getCourseCart.mockResolvedValue({ ...ready(), couponCode: 'LAST', expiresAtUtc: new Date(Date.now() + 60000).toISOString() });
    render(<CartPage />);
    await purchaseButton();
    expect(previewCourseCart).not.toHaveBeenCalled();
    expect(useCartStore.getState().appliedCoupon).toMatchObject({ code: 'LAST', pending: false, validationItems: items });
});

test('پاسخ دیرهنگام پیش‌نمایش، قیمت انتخاب تازه را بازنویسی نمی‌کند', async () => {
    let finish;
    previewCourseCart.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue(quote(260));
    render(<CartPage />);
    await act(async () => useCartStore.setState({ items: [{ id: 99, documentId: 'new', type: 'course' }] }));
    await purchaseButton();
    await act(async () => finish(quote(999)));
    expect(screen.queryByText('999 نور')).toBeNull();
    expect(screen.getAllByText('260 نور').length).toBeGreaterThan(0);
});

test('کوپن عمومی در خلاصه کم می‌شود و قیمت نمایشی دوره را عوض نمی‌کند', async () => {
    const base = { ...quote(210), courses: [course('one', 105), course('two', 105)] };
    const discounted = { ...base, couponCode: 'ALL10', couponDiscountInNoor: 21, priceInNoor: 189,
        courses: base.courses.map((item, index) => ({ ...item, couponDiscountInNoor: index ? 10 : 11, priceInNoor: index ? 95 : 94 })) };
    useCartStore.setState({ items: [{ id: 1, documentId: 'one', type: 'course' }, { id: 2, documentId: 'two', type: 'course' }] });
    previewCourseCart.mockResolvedValueOnce(base).mockResolvedValue(discounted);
    prepareCourseCart.mockResolvedValue({ ...discounted, status: 'Ready', cartId: 'cart-1', balanceInNoor: 200, shortfallInNoor: 0 });
    render(<CartPage />);
    await purchaseButton();
    await act(async () => useCartStore.getState().applyCoupon({ code: 'ALL10' }));
    await screen.findByText('189 نور');
    expect(screen.getAllByText('105 نور')).toHaveLength(4);
    expect(screen.queryByText('94 نور')).toBeNull();
    expect(prepareCourseCart).not.toHaveBeenCalled();
    fireEvent.click(await purchaseButton());
    await waitFor(() => expect(executeNoorCartPurchase).toHaveBeenCalledWith(expect.objectContaining({ payOnline: false })));
    expect(prepareCourseCart).toHaveBeenCalledWith(expect.objectContaining({ externalCourseIds: ['one', 'two'], couponCode: 'ALL10' }), 'jwt');
});

test('خطای قیمت فقط پیش‌نمایش را تکرار می‌کند و checkout نمی‌زند', async () => {
    previewCourseCart.mockRejectedValueOnce(new Error('کوپن معتبر نیست.')).mockResolvedValue(quote());
    render(<CartPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'بررسی دوباره' }));
    await purchaseButton();
    expect(prepareCourseCart).not.toHaveBeenCalled();
});

test('رزرو انتخاب قبلی مانع شروع پرداخت انتخاب تازه نمی‌شود و پیش از برداشت مبلغ نیاز به تأیید دارد', async () => {
    previewCourseCart.mockRejectedValue(new Error('ظرفیت کوپن تکمیل است.'));
    render(<CartPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'بررسی و ادامه پرداخت' }));
    await screen.findByText(/مبلغ معتبر سبد دریافت شد/);
    expect(prepareCourseCart).toHaveBeenCalledTimes(1);
    expect(executeNoorCartPurchase).not.toHaveBeenCalled();
    fireEvent.click(await purchaseButton());
    await waitFor(() => expect(executeNoorCartPurchase).toHaveBeenCalledTimes(1));
});
