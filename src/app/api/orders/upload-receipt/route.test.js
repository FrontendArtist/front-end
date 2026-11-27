import { POST } from './route';
import { getServerSession } from 'next-auth';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/auth', () => ({ authOptions: {}, lightAuthOptions: {} }));
jest.mock('@/lib/api', () => ({ STRAPI_API_URL: 'http://strapi.test' }));
jest.mock('next/server', () => ({
    NextResponse: {
        json: (body, init) => ({ body, status: init?.status || 200 }),
    },
}));

function makeFile(name = 'receipt.jpg', type = 'image/jpeg', sizeBytes = 128) {
    const content = new Uint8Array(sizeBytes);
    const file = new File([content], name, { type });
    if (typeof file.arrayBuffer !== 'function') {
        file.arrayBuffer = async () => content.buffer;
    }
    return file;
}

function makeRequest(fields) {
    return {
        formData: async () => ({
            get: (key) => (Object.prototype.hasOwnProperty.call(fields, key) ? fields[key] : null),
        }),
    };
}

const jsonRes = (data, status = 200) => ({
    ok: status < 400,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
});

describe('POST /api/orders/upload-receipt — امنیت و اعتبارسنجی', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        process.env.STRAPI_API_TOKEN = 'test-strapi-token';
        getServerSession.mockResolvedValue({ user: { id: 10, phoneNumber: '09120000010' } });
        global.fetch = jest.fn();
    });

    afterAll(() => {
        global.fetch = originalFetch;
    });

    it('کاربر واردنشده ۴۰۱ می‌گیرد', async () => {
        getServerSession.mockResolvedValue(null);
        const res = await POST(makeRequest({ orderId: 'ord1', cardHolderName: 'علی', file: makeFile() }));
        expect(res.status).toBe(401);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('شناسه سفارش نامعتبر ۴۰۰ برمی‌گرداند و درخواستی به استراپی نمی‌زند', async () => {
        const res = await POST(makeRequest({
            orderId: '../admin?x=1',
            cardHolderName: 'علی',
            file: makeFile(),
        }));
        expect(res.status).toBe(400);
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('سفارش ناموجود ۴۰۴ برمی‌گرداند و فایلی آپلود نمی‌شود', async () => {
        global.fetch.mockResolvedValueOnce(jsonRes({ data: null }, 404));
        const res = await POST(makeRequest({
            orderId: 'missing-order-1',
            cardHolderName: 'علی',
            file: makeFile(),
        }));
        expect(res.status).toBe(404);
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch.mock.calls[0][0]).toBe('http://strapi.test/api/orders/missing-order-1?populate[0]=user');
    });

    it('IDOR: سفارش متعلق به کاربر دیگر ۴۰۳ می‌گیرد و به /api/upload نمی‌رسد', async () => {
        global.fetch.mockResolvedValueOnce(jsonRes({
            data: {
                documentId: 'other-order',
                paymentMethod: 'card_to_card',
                orderStatus: 'pending',
                paymentStatus: 'pending_payment',
                user: { id: 999 },
            },
        }));

        const res = await POST(makeRequest({
            orderId: 'other-order',
            cardHolderName: 'مهاجم',
            file: makeFile(),
        }));
        expect(res.status).toBe(403);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('IDOR روی سفارش بدون رابطه user: شماره موبایل متفاوت ۴۰۳ می‌گیرد', async () => {
        global.fetch.mockResolvedValueOnce(jsonRes({
            data: {
                documentId: 'legacy-no-user',
                paymentMethod: 'card_to_card',
                orderStatus: 'pending',
                paymentStatus: 'pending_payment',
                phone: '09129999999',
                user: null,
            },
        }));

        const res = await POST(makeRequest({
            orderId: 'legacy-no-user',
            cardHolderName: 'کاربر',
            file: makeFile(),
        }));
        expect(res.status).toBe(403);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('سفارش قدیمی بدون رابطه user اما با شماره موبایل منطبق مجاز به آپلود است', async () => {
        global.fetch
            .mockResolvedValueOnce(jsonRes({
                data: {
                    documentId: 'legacy-phone-match',
                    paymentMethod: 'card_to_card',
                    orderStatus: 'pending',
                    paymentStatus: 'pending_payment',
                    phone: '09120000010',
                    fullName: 'کاربر فروشگاه',
                    user: null,
                },
            }))
            .mockResolvedValueOnce(jsonRes([{ id: 77 }]))
            .mockResolvedValueOnce(jsonRes({
                data: { documentId: 'legacy-phone-match', paymentStatus: 'pending_verification' },
            }));

        const res = await POST(makeRequest({
            orderId: 'legacy-phone-match',
            cardHolderName: 'علی رضایی',
            file: makeFile(),
        }));
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it.each([
        ['paid online', { paymentMethod: 'online', orderStatus: 'paid', paymentStatus: 'paid' }],
        ['free order', { paymentMethod: 'free', orderStatus: 'paid', paymentStatus: 'paid' }],
        ['shipped', { paymentMethod: 'card_to_card', orderStatus: 'shipped', paymentStatus: 'paid' }],
        ['delivered', { paymentMethod: 'card_to_card', orderStatus: 'delivered', paymentStatus: 'paid' }],
        ['pending_verification', { paymentMethod: 'card_to_card', orderStatus: 'pending', paymentStatus: 'pending_verification' }],
        ['canceled', { paymentMethod: 'card_to_card', orderStatus: 'canceled', paymentStatus: 'pending_payment' }],
        ['failed', { paymentMethod: 'card_to_card', orderStatus: 'pending', paymentStatus: 'failed' }],
    ])('وضعیت یا روش غیرمجاز (%s) پیش از آپلود با ۴۰۰ رد می‌شود', async (_label, orderOverrides) => {
        global.fetch.mockResolvedValueOnce(jsonRes({
            data: {
                documentId: 'ord-guard',
                user: { id: 10 },
                ...orderOverrides,
            },
        }));

        const res = await POST(makeRequest({
            orderId: 'ord-guard',
            cardHolderName: 'علی',
            file: makeFile(),
        }));
        expect(res.status).toBe(400);
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('سناریوی موفق ۲۰۰: بدون درخواست تکراری GET، فایل را آپلود و سفارش را به‌روزرسانی می‌کند', async () => {
        global.fetch
            .mockResolvedValueOnce(jsonRes({
                data: {
                    documentId: 'ord-valid-1',
                    paymentMethod: 'card_to_card',
                    orderStatus: 'pending',
                    paymentStatus: 'pending_payment',
                    fullName: 'کاربر (09120000010)',
                    user: { id: 10, firstName: '', lastName: '' },
                },
            }))
            .mockResolvedValueOnce(jsonRes([{ id: 55 }]))
            .mockResolvedValueOnce(jsonRes({ id: 10 }))
            .mockResolvedValueOnce(jsonRes({
                data: { documentId: 'ord-valid-1', paymentStatus: 'pending_verification' },
            }));

        const res = await POST(makeRequest({
            orderId: 'ord-valid-1',
            cardHolderName: 'سارا محمدی',
            file: makeFile('slip.png', 'image/png'),
        }));

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            success: true,
            message: 'فیش واریزی با موفقیت ثبت شد. پرداخت شما در انتظار تأیید توسط فروشگاه است.',
            order: {
                documentId: 'ord-valid-1',
                paymentStatus: 'pending_verification',
            },
        });
        expect(global.fetch).toHaveBeenCalledTimes(4);
        expect(global.fetch.mock.calls[1][0]).toBe('http://strapi.test/api/upload');
        expect(global.fetch.mock.calls[2][0]).toBe('http://strapi.test/api/users/10');
        expect(global.fetch.mock.calls[3][0]).toBe('http://strapi.test/api/orders/ord-valid-1');
    });
});
