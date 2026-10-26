import { purchaseCourseCart } from '@/lib/courseCartApi';
jest.mock('@/lib/courseCartApi', () => ({ purchaseCourseCart: jest.fn() }));
import { executeOnlinePayment, executeNoorCoursePurchase, executeNoorCartPurchase } from '../checkoutService';
import { invalidatePaymentConnection } from '../client/paymentConnection';
import { purchaseCourseWithByeMoney } from '@/lib/byeMoneyApi';
import { triggerLightUpdate } from '@/store/useLightStore';
import { invalidateProfileCache } from '@/lib/client/profileClientApi';
import { useCartStore } from '@/store/useCartStore';

jest.mock('@/lib/byeMoneyApi', () => ({
  ...jest.requireActual('@/lib/byeMoneyApi'),
  purchaseCourseWithByeMoney: jest.fn(),
}));

jest.mock('@/store/useLightStore', () => ({
  ...jest.requireActual('@/store/useLightStore'),
  triggerLightUpdate: jest.fn(),
}));

jest.mock('@/lib/client/profileClientApi', () => ({
  ...jest.requireActual('@/lib/client/profileClientApi'),
  invalidateProfileCache: jest.fn(),
}));

describe('نتیجهٔ رایگان checkout از سرور تعیین می‌شود', () => {
  beforeEach(() => { invalidatePaymentConnection(); jest.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {}); });
  afterEach(() => { jest.restoreAllMocks(); document.body.innerHTML = ''; });
  const server = order => {
    global.fetch = jest.fn(async url => ({ ok: true, json: async () =>
      url === '/api/orders' ? { data: { documentId: 'order-one', ...order } } :
      url === '/api/payment/request' ? { success: true, token: 'bank-token' } : { success: true, isVpn: false } }));
  };
  it('تا پایان بررسی کوپن هیچ سفارش یا پرداختی آغاز نمی‌کند', async () => {
    global.fetch = jest.fn();
    await expect(executeOnlinePayment({ items: [{ id: 7 }], finalTotalPrice: 101,
      appliedCoupon: { code: 'SALE', pending: true } })).rejects.toThrow('بررسی کد تخفیف');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('قیمت صفر مرورگر، سفارش پولی سرور را موفق رایگان نشان نمی‌دهد', async () => {
    server({ totalPrice: 101, paymentMethod: 'online', paymentStatus: 'pending_payment' });
    const router = { push: jest.fn() };
    const result = await executeOnlinePayment({ items: [{ id: 7 }], finalTotalPrice: 0, router });
    expect(result.isFree).toBe(false);
    expect(router.push).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith('/api/payment/request', expect.anything());
  });
  it('رایگان واقعی سرور را حتی با نمایش قدیمی پولی درست ادامه می‌دهد', async () => {
    server({ totalPrice: 0, paymentMethod: 'free', paymentStatus: 'paid' });
    const router = { push: jest.fn() };
    expect((await executeOnlinePayment({ items: [{ id: 7 }], finalTotalPrice: 101, router })).isFree).toBe(true);
    expect(router.push).toHaveBeenCalledWith('/checkout/result?status=success&source=free&orderId=order-one');
    expect(fetch.mock.calls.some(([url]) => url === '/api/payment/request')).toBe(false);
  });
});

describe('خرید یک دوره با نور (ByeMoney Course Purchase - TASKS/R01)', () => {
  const courseItem = {
    id: 42,
    documentId: 'course-doc-42',
    externalCourseId: 'course-doc-42',
    type: 'course',
    title: 'دوره جامع نورانی',
    price: 150,
  };

  beforeEach(() => {
    useCartStore.setState({ items: [courseItem], appliedCoupon: null });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('خرید موفق تک‌دوره با نور و بازگشت نتیجهٔ معتبر، پاکسازی سبد و به‌روزرسانی استورها', async () => {
    const mockByeMoneyResponse = {
      success: true,
      data: {
        transactionId: 'bm-tx-999',
        totalPriceInNoor: 150,
        purchasedAtUtc: '2026-10-17T10:00:00Z',
        items: [
          {
            purchaseId: 'p-1',
            externalCourseId: 'course-doc-42',
            courseTitle: 'دوره جامع نورانی',
            priceInNoor: 150,
            status: 'NotificationSent',
          },
        ],
      },
    };

    purchaseCourseWithByeMoney.mockResolvedValue(mockByeMoneyResponse);

    const router = { push: jest.fn() };

    const result = await executeNoorCoursePurchase({
      items: [courseItem],
      jwt: 'valid-jwt-token',
      router,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockByeMoneyResponse.data);

    // ۱. بررسی تطابق کامل آرگومان ارسالی با قرارداد (externalCourseIds حاوی documentId)
    expect(purchaseCourseWithByeMoney).toHaveBeenCalledWith({
      externalCourseIds: ['course-doc-42'],
      jwt: 'valid-jwt-token',
    });

    // ۲. بررسی پاکسازی سبد خرید
    expect(useCartStore.getState().items).toEqual([]);

    // ۳. بررسی صدا زدن توابع بروزرسانی موجودی و کش پروفایل
    expect(triggerLightUpdate).toHaveBeenCalled();
    expect(invalidateProfileCache).toHaveBeenCalled();

    // ۴. بررسی هدایت به صفحه نتیجه با شناسه تراکنش
    expect(router.push).toHaveBeenCalledWith(
      '/checkout/result?status=success&source=noor&courseId=course-doc-42&refNum=bm-tx-999'
    );
  });

  it('در مسیر خرید نوری دوره، POST /api/orders (سفارش معلق Strapi) به هیچ وجه فراخوانی نمی‌شود', async () => {
    purchaseCourseWithByeMoney.mockResolvedValue({
      success: true,
      data: { transactionId: 'bm-tx-100' },
    });

    await executeNoorCoursePurchase({
      items: [courseItem],
      jwt: 'valid-jwt-token',
    });

    // احراز این که تحت هیچ شرایطی /api/orders در Strapi صدا زده نشده است (I01 و I08)
    const ordersCalls = global.fetch.mock.calls.filter(([url]) =>
      typeof url === 'string' && url.includes('/api/orders')
    );
    expect(ordersCalls.length).toBe(0);
  });

  it('شکست شروع پرداخت آنلاین پس از کسری موجودی، سبد را حفظ می‌کند', async () => {
    purchaseCourseWithByeMoney.mockResolvedValue({
      success: false,
      insufficientBalance: true,
      error: 'موجودی کیف پول برای خرید این دوره‌ها کافی نیست.',
    });

    global.fetch.mockResolvedValue({ ok: false, json: async () => ({ message: 'دریافت درگاه ممکن نیست.' }) });

    await expect(
      executeNoorCoursePurchase({
        items: [courseItem],
        jwt: 'valid-jwt-token',
      })
    ).rejects.toThrow('دریافت درگاه ممکن نیست.');

    // سبد خرید نباید دست‌نخورده و خالی نشده باقی بماند
    expect(useCartStore.getState().items.length).toBe(1);
    expect(useCartStore.getState().items[0].id).toBe(42);
  });

  it('در صورت خالی بودن سبد خرید یا داشتن بیش از یک قلم خطا پرتاب می‌کند', async () => {
    await expect(
      executeNoorCoursePurchase({ items: [], jwt: 'valid-jwt' })
    ).rejects.toThrow('سبد خرید شما خالی است.');

    await expect(
      executeNoorCoursePurchase({
        items: [courseItem, { ...courseItem, id: 43 }],
        jwt: 'valid-jwt',
      })
    ).rejects.toThrow('فقط برای خرید یک دوره کامل فعال است');
  });

  it('کسری موجودی بدون گام اضافه به درگاه می‌رود و سبد تا تأیید خرید باقی می‌ماند', async () => {
    purchaseCourseWithByeMoney.mockResolvedValue({ success: false, insufficientBalance: true });
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, token: 'bank-token', gatewayUrl: 'https://bank.test/pay' }) });
    const submit = jest.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {});
    const result = await executeNoorCoursePurchase({ items: [courseItem], jwt: 'valid-jwt' });
    expect(result.awaitingPayment).toBe(true);
    const request = global.fetch.mock.calls.find(([url]) => url === '/api/payment/request');
    expect(JSON.parse(request[1].body)).toEqual({ paymentType: 'course_purchase', externalCourseId: 'course-doc-42' });
    expect(submit).toHaveBeenCalledTimes(1);
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('خطای شبکه خرید به شارژ یا خرید دوباره تبدیل نمی‌شود', async () => {
    purchaseCourseWithByeMoney.mockResolvedValue({ success: false, error: 'ارتباط قطع شد.' });
    await expect(executeNoorCoursePurchase({ items: [courseItem], jwt: 'valid-jwt' })).rejects.toThrow('ارتباط قطع شد.');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(useCartStore.getState().items).toHaveLength(1);
  });
});

describe('خرید سبد با قیمت تثبیت‌شده', () => {
  test('فقط شناسه سبد را ارسال می‌کند و تا تأیید GET اقلام را نگه می‌دارد', async () => {
    const items = [{ id: 1, type: 'course', documentId: 'one' }, { id: 2, type: 'course', documentId: 'two' }];
    useCartStore.setState({ items });
    purchaseCourseCart.mockResolvedValue({ cartId: 'cart-1', status: 'Paid', courses: [] });
    const router = { push: jest.fn() };
    await executeNoorCartPurchase({ cartId: 'cart-1', jwt: 'jwt', router });
    expect(purchaseCourseCart).toHaveBeenCalledWith('cart-1', 'jwt');
    expect(router.push).toHaveBeenCalledWith('/checkout/result?source=noor&cartId=cart-1');
    expect(useCartStore.getState().items).toEqual(items);
  });

  test('فقط دوره‌های تکمیل‌شده را از سبد حذف می‌کند و اقلام تازه‌اضافه‌شده را نگه می‌دارد', async () => {
    const items = [
      { id: 10, type: 'course', documentId: 'c-10' },
      { id: 20, type: 'course', documentId: 'c-20' },
      { id: 30, type: 'course', documentId: 'c-new' },
    ];
    useCartStore.setState({ items });
    purchaseCourseCart.mockResolvedValue({
      cartId: 'cart-1',
      status: 'Paid',
      courses: [
        { externalCourseId: 'c-10', purchaseStatus: 'Completed' },
        { externalCourseId: 'c-20', purchaseStatus: 'Pending' },
      ],
    });
    const router = { push: jest.fn() };
    await executeNoorCartPurchase({ cartId: 'cart-1', jwt: 'jwt', router });
    expect(useCartStore.getState().items.map(i => i.id)).toEqual([20, 30]);
  });
});

test('کاهش هم‌زمان موجودی به شروع شارژ سروری تبدیل می‌شود؛ حافظه مرورگر الزامی نیست', async () => {
    jest.clearAllMocks();
    invalidatePaymentConnection();
    purchaseCourseCart.mockRejectedValue(Object.assign(new Error('کسری موجودی'), { code: 'CART_INSUFFICIENT_BALANCE' }));
    global.fetch = jest.fn(async url => ({ ok: true, json: async () => url.startsWith('/api/check-vpn')
        ? { success: true, isVpn: false } : { success: true, token: 'bank-token', topUpRequestId: 'topup-cart' } }));
    const submit = jest.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {});
    const storage = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    try {
        expect(await executeNoorCartPurchase({ cartId: 'cart-1', jwt: 'jwt' })).toEqual({ success: true, awaitingPayment: true });
        expect(purchaseCourseCart).toHaveBeenCalledTimes(1);
        const call = fetch.mock.calls.find(([url]) => url === '/api/payment/request');
        expect(JSON.parse(call[1].body)).toEqual({ paymentType: 'course_cart', cartId: 'cart-1' });
        expect(submit).toHaveBeenCalledTimes(1);
    } finally { storage.mockRestore(); submit.mockRestore(); document.body.innerHTML = ''; }
});

test('پاسخ درحال پردازش به نتیجه خواندنی می‌رود و توکن تازه نمی‌خواهد', async () => {
    jest.clearAllMocks();
    invalidatePaymentConnection();
    global.fetch = jest.fn(async url => ({ ok: true, json: async () => url.startsWith('/api/check-vpn')
        ? { success: true, isVpn: false } : { success: true, alreadyProcessing: true, data: { status: 'AwaitingTopUp' } } }));
    const router = { push: jest.fn() };
    await executeNoorCartPurchase({ cartId: 'cart-1', jwt: 'jwt', router, payOnline: true });
    expect(router.push).toHaveBeenCalledWith('/checkout/result?source=noor&cartId=cart-1');
    expect(purchaseCourseCart).not.toHaveBeenCalled();
});

describe('گیت مسدودسازی خرید مجدد در سرویس تسویه', () => {
  const ownedCourse = { id: 101, documentId: 'doc-101', slug: 'owned-course', title: 'دوره خریداری‌شده', type: 'course' };
  const mockSession = { user: { id: 1, courses: [{ documentId: 'doc-101' }] } };

  test('executeOnlinePayment در صورت مالکیت قبلی خطا می‌دهد و درخواست ارسال نمی‌کند', async () => {
    global.fetch = jest.fn();
    await expect(executeOnlinePayment({
      items: [ownedCourse],
      finalTotalPrice: 500,
      session: mockSession,
    })).rejects.toThrow('قبلاً توسط شما خریداری شده است');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('executeNoorCoursePurchase در صورت احراز مالکیت دوره متوقف می‌شود', async () => {
    await expect(executeNoorCoursePurchase({
      items: [ownedCourse],
      jwt: 'token',
      session: mockSession,
    })).rejects.toThrow('شما قبلاً این دوره آموزشی را خریداری کرده‌اید');
  });

  test('executeNoorCartPurchase در صورت وجود دوره خریداری‌شده در سبد متوقف می‌شود', async () => {
    await expect(executeNoorCartPurchase({
      cartId: 'cart-owned',
      jwt: 'token',
      items: [ownedCourse],
      session: mockSession,
    })).rejects.toThrow('قبلاً توسط شما خریداری شده است');
  });
});
