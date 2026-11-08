import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PermissionsProvider } from '@/context/PermissionsContext';
import CreateNoorWithdrawalModal from '../CreateNoorWithdrawalModal';
import NoorWithdrawalsList from '../NoorWithdrawalsList';

const USER = { id: 1, documentId: 'doc-1', firstName: 'علی', lastName: 'رضایی' };
const CARD = '6037997212345678';

let fetchCalls;
let responder;

const withPerms = (ui, perms = ['Noor.Withdraw']) => (
    <PermissionsProvider initialPermissions={perms}>{ui}</PermissionsProvider>
);

const fill = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

const fillBase = () => {
    fill(/مبلغ واریز/, '۵۰۰۰۰۰');
    fill(/نام صاحب حساب/, 'علی رضایی');
    fill(/شمارهٔ کارت/, CARD);
    fill(/توضیحات/, 'علت آزمون');
};

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'ثبت خروج نور' }));
const posts = () => fetchCalls.filter((c) => c.url === '/api/admin/noor-withdrawals' && c.init?.method === 'POST');
const selectRefund = () => fireEvent.change(screen.getByLabelText('نوع خروج'), { target: { value: 'DuplicatePaymentRefund' } });
const openCombo = async () => { fireEvent.click(await screen.findByRole('combobox', { name: 'شارژ تأییدشده' })); };

const TOPUPS = [
    { id: 'topup-1', clientReferenceCode: 'TP-9', amountNoor: 40, amountRial: 4000000, rialPerNoor: 100000, confirmedAtUtc: '2026-11-01T10:00:00Z', hasActiveRefund: false },
    { id: 'topup-2', clientReferenceCode: 'TP-7', amountNoor: 10, amountRial: 1000000, rialPerNoor: 100000, confirmedAtUtc: '2026-10-01T10:00:00Z', hasActiveRefund: true },
];

beforeEach(() => {
    let n = 0;
    if (!global.crypto) global.crypto = {};
    global.crypto.randomUUID = jest.fn(() => `uuid-${++n}`);
    fetchCalls = [];
    responder = (url) => {
        if (url.includes('conversion-rate')) return { status: 200, body: { success: true, rialPerNoor: 100000 } };
        if (url.includes('batch-balances')) return { status: 200, body: { success: true, balances: { 'doc-1': 3 } } };
        if (url.includes('refundable-topups')) return { status: 200, body: { success: true, data: TOPUPS } };
        return { status: 200, body: { success: true, data: { id: 'w1', amountNoor: 5, amountRial: 500000 } } };
    };
    global.fetch = jest.fn(async (url, init) => {
        fetchCalls.push({ url, init });
        const { status, body } = responder(url, init);
        return { ok: status < 300, status, json: async () => body };
    });
});

describe('CreateNoorWithdrawalModal', () => {
    test('ارسال فقط به route سروری؛ amountNoor ارسال نمی‌شود و نور واقعی بعد از ثبت نشان داده می‌شود', async () => {
        const onSuccess = jest.fn();
        render(withPerms(<CreateNoorWithdrawalModal user={USER} onClose={jest.fn()} onSuccess={onSuccess} />));
        fillBase();
        submit();
        expect(await screen.findByTestId('deducted-noor')).toHaveTextContent('۵ نور');
        const { init } = posts()[0];
        expect(init.headers?.Authorization).toBeUndefined();
        expect(init.body.get('operationId')).toBe('uuid-1');
        expect(init.body.get('userExternalId')).toBe('doc-1');
        expect(init.body.get('kind')).toBe('AdminDiscretionary');
        expect(init.body.get('amountRial')).toBe('500000');
        expect(init.body.has('amountNoor')).toBe(false);
        expect(init.body.get('beneficiaryCardNumber')).toBe(CARD);
        expect(init.body.has('relatedTopUpId')).toBe(false);
        expect(onSuccess).not.toHaveBeenCalled();
        fireEvent.click(screen.getAllByRole('button', { name: 'بستن' })[1]);
        expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ amountNoor: 5 }));
    });

    test('مبلغ با جداکننده و به حروف نمایش داده می‌شود و معادل نور با نرخ فعلی زنده است', async () => {
        render(withPerms(<CreateNoorWithdrawalModal user={USER} onClose={jest.fn()} />));
        await screen.findByText(/موجودی نور عادی قابل خروج/);
        fill(/مبلغ واریز/, '۱۲۵۰۰۰۰');
        expect(screen.getByLabelText(/مبلغ واریز/).value).toBe('۱٬۲۵۰٬۰۰۰');
        expect(screen.getByText('یک میلیون و دویست و پنجاه هزار ریال')).toBeInTheDocument();
        expect(screen.getByLabelText(/معادل نور/)).toHaveValue('۱۲٫۵');
        expect(screen.getByLabelText(/معادل نور/)).toHaveAttribute('readonly');
    });

    test('موجودی نور عادی نمایش داده می‌شود و معادل بیشتر از آن هشدار می‌دهد', async () => {
        render(withPerms(<CreateNoorWithdrawalModal user={USER} onClose={jest.fn()} />));
        await screen.findByText(/موجودی نور عادی قابل خروج/);
        fill(/مبلغ واریز/, '۲۰۰۰۰۰');
        expect(screen.queryByText(/بیشتر است/)).not.toBeInTheDocument();
        fill(/مبلغ واریز/, '۵۰۰۰۰۰');
        expect(await screen.findByText(/از موجودی نور عادی کاربر/)).toBeInTheDocument();
    });

    test('بدون نرخ یا موجودی فرم کار می‌کند و پیام جایگزین نشان می‌دهد', async () => {
        const base = responder;
        responder = (url, init) => (url.includes('conversion-rate') || url.includes('batch-balances')
            ? { status: 403, body: { success: false } }
            : base(url, init));
        render(withPerms(<CreateNoorWithdrawalModal user={USER} onClose={jest.fn()} />));
        fill(/مبلغ واریز/, '۵۰۰۰۰۰');
        expect(screen.getByText(/نرخ فعلی در دسترس نیست/)).toBeInTheDocument();
        expect(screen.queryByText(/موجودی نور عادی قابل خروج/)).not.toBeInTheDocument();
    });

    test('یادآوری فقط نور عادی و هشدار واریز قبلی', () => {
        render(withPerms(<CreateNoorWithdrawalModal user={USER} onClose={jest.fn()} />));
        expect(screen.getByText(/فقط «نور عادی» قابل خروج است/)).toBeInTheDocument();
        expect(screen.queryByText(/بهتر است اول خروج ثبت/)).not.toBeInTheDocument();
        fireEvent.click(screen.getByLabelText('واریز قبلاً انجام شده'));
        expect(screen.getByText(/بهتر است اول خروج ثبت/)).toBeInTheDocument();
    });

    test('operationId در تلاش مجدد همان فرم ثابت و با تغییر محتوا تازه می‌شود', async () => {
        const base = responder;
        responder = (url, init) => (init?.method === 'POST' && url === '/api/admin/noor-withdrawals'
            ? { status: 502, body: { success: false, error: 'خطای شبکه' } }
            : base(url, init));
        render(withPerms(<CreateNoorWithdrawalModal user={USER} onClose={jest.fn()} />));
        fillBase();
        submit();
        await waitFor(() => expect(posts()).toHaveLength(1));
        await screen.findByText('خطای شبکه');
        submit();
        await waitFor(() => expect(posts()).toHaveLength(2));
        expect(posts()[1].init.body.get('operationId')).toBe(posts()[0].init.body.get('operationId'));
        fill(/توضیحات/, 'متن تغییر کرد');
        submit();
        await waitFor(() => expect(posts()).toHaveLength(3));
        expect(posts()[2].init.body.get('operationId')).not.toBe(posts()[0].init.body.get('operationId'));
    });

    test.each([
        ['NOOR_WITHDRAWAL_INSUFFICIENT_BALANCE', 'نور عادی کافی نیست.'],
        ['NOOR_WITHDRAWAL_AMOUNT_TOO_SMALL', 'مبلغ برای یک واحد نور کافی نیست.'],
        ['NOOR_WITHDRAWAL_RATE_UNAVAILABLE', 'نرخ تبدیل در دسترس نیست.'],
    ])('خطای %s همان پیام فارسی پاسخ را نشان می‌دهد', async (code, error) => {
        const base = responder;
        responder = (url, init) => (init?.method === 'POST' && url === '/api/admin/noor-withdrawals'
            ? { status: 400, body: { code, error } }
            : base(url, init));
        render(withPerms(<CreateNoorWithdrawalModal user={USER} onClose={jest.fn()} />));
        fillBase();
        submit();
        expect(await screen.findByText(error)).toBeInTheDocument();
    });

    test('بدون کارت و شبا ارسال نمی‌شود', async () => {
        render(withPerms(<CreateNoorWithdrawalModal user={USER} onClose={jest.fn()} />));
        fillBase();
        fill(/شمارهٔ کارت/, '');
        submit();
        expect(await screen.findByText('شمارهٔ کارت یا شبا (دست‌کم یکی) الزامی است.')).toBeInTheDocument();
        expect(posts()).toHaveLength(0);
    });

    test('واریز قبلی بدون فیش و شناسه رد می‌شود و با هر دو همراه فیش ارسال می‌شود', async () => {
        render(withPerms(<CreateNoorWithdrawalModal user={USER} onClose={jest.fn()} onSuccess={jest.fn()} />));
        fillBase();
        fireEvent.click(screen.getByLabelText('واریز قبلاً انجام شده'));
        submit();
        expect(await screen.findByText('شناسهٔ پرداخت الزامی است (حداکثر ۱۰۰ نویسه).')).toBeInTheDocument();
        fill(/شناسهٔ پرداخت/, 'REF-1');
        const png = new File(['x'], 'r.png', { type: 'image/png' });
        fireEvent.change(screen.getByLabelText(/فیش واریز/), { target: { files: [png] } });
        submit();
        await waitFor(() => expect(posts()).toHaveLength(1));
        expect(posts()[0].init.body.get('paymentReference')).toBe('REF-1');
        expect(posts()[0].init.body.get('receipt')).toBeTruthy();
    });

    describe('استرداد پرداخت تکراری', () => {
        test('شارژهای همین کاربر از route سروری گرفته می‌شود و ورود دستی/جست‌وجوی مجوزدار وجود ندارد', async () => {
            render(withPerms(<CreateNoorWithdrawalModal user={USER} onClose={jest.fn()} />, ['Noor.Withdraw', 'TopUp.Review']));
            selectRefund();
            await openCombo();
            expect(fetchCalls.some((c) => c.url === '/api/admin/noor-withdrawals/refundable-topups?userExternalId=doc-1')).toBe(true);
            expect(screen.queryByLabelText('شناسهٔ شارژ')).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /ورود دستی/ })).not.toBeInTheDocument();
            expect(fetchCalls.some((c) => c.url.includes('by-reference'))).toBe(false);
        });

        test('بدون شارژ ارسال نمی‌شود', async () => {
            render(withPerms(<CreateNoorWithdrawalModal user={USER} onClose={jest.fn()} />));
            selectRefund();
            await screen.findByRole('combobox', { name: 'شارژ تأییدشده' });
            fillBase();
            submit();
            expect(await screen.findByText(/انتخاب شارژ تأییدشدهٔ همان کاربر الزامی است/)).toBeInTheDocument();
            expect(posts()).toHaveLength(0);
        });

        test('شارژ با استرداد فعال غیرقابل انتخاب است و جست‌وجو با کد پیگیری فیلتر می‌کند', async () => {
            render(withPerms(<CreateNoorWithdrawalModal user={USER} onClose={jest.fn()} />));
            selectRefund();
            await openCombo();
            const blocked = (await screen.findByText('TP-7')).closest('button');
            expect(blocked).toBeDisabled();
            expect(screen.getByText('استرداد فعال دارد')).toBeInTheDocument();
            fill('جست‌وجو در شارژها با کد پیگیری', 'tp-9');
            expect(screen.queryByText('TP-7')).not.toBeInTheDocument();
            expect(screen.getByText('TP-9')).toBeInTheDocument();
            fill('جست‌وجو در شارژها با کد پیگیری', 'zzz');
            expect(screen.getByText('شارژی با این کد پیگیری پیدا نشد.')).toBeInTheDocument();
        });

        test('انتخاب شارژ: نرخ ثبت‌شده، سقف ریال و ارسال relatedTopUpId', async () => {
            render(withPerms(<CreateNoorWithdrawalModal user={USER} onClose={jest.fn()} onSuccess={jest.fn()} />));
            selectRefund();
            await openCombo();
            fireEvent.click(screen.getByText('TP-9').closest('button'));
            expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
            expect(screen.getByLabelText(/مبلغ واریز/).value).toBe('۴٬۰۰۰٬۰۰۰');
            expect(screen.getByLabelText(/معادل نور/)).toHaveValue('۴۰');
            expect(screen.getByRole('combobox', { name: 'شارژ تأییدشده' })).toHaveTextContent(/سقف مبلغ استرداد: ۴٬۰۰۰٬۰۰۰ ریال/);
            fillBase();
            fill(/مبلغ واریز/, '۴۰۰۰۰۰۱');
            submit();
            expect(await screen.findByText(/نمی‌تواند از مبلغ همان شارژ/)).toBeInTheDocument();
            expect(posts()).toHaveLength(0);
            fill(/مبلغ واریز/, '۲۰۰۰۰۰۰');
            submit();
            await waitFor(() => expect(posts()).toHaveLength(1));
            expect(posts()[0].init.body.get('relatedTopUpId')).toBe('topup-1');
            expect(posts()[0].init.body.get('kind')).toBe('DuplicatePaymentRefund');
            expect(posts()[0].init.body.get('amountRial')).toBe('2000000');
        });

        test('انتخاب بعدی مبلغ را عوض می‌کند و کلیک روی باکس لیست را دوباره باز می‌کند', async () => {
            const base = responder;
            responder = (url, init) => (url.includes('refundable-topups')
                ? { status: 200, body: { success: true, data: [TOPUPS[0], { ...TOPUPS[1], id: 'topup-3', clientReferenceCode: 'TP-3', hasActiveRefund: false, amountRial: 8000000, rialPerNoor: 10 }] } }
                : base(url, init));
            render(withPerms(<CreateNoorWithdrawalModal user={USER} onClose={jest.fn()} />));
            selectRefund();
            await openCombo();
            fireEvent.click(screen.getByText('TP-9').closest('button'));
            expect(screen.getByLabelText(/مبلغ واریز/).value).toBe('۴٬۰۰۰٬۰۰۰');
            await openCombo();
            fireEvent.click(screen.getByText('TP-3').closest('button'));
            expect(screen.getByLabelText(/مبلغ واریز/).value).toBe('۸٬۰۰۰٬۰۰۰');
            expect(screen.getByLabelText(/معادل نور/)).toHaveValue('۸۰۰٬۰۰۰');
            expect(screen.getByRole('combobox', { name: 'شارژ تأییدشده' })).toHaveTextContent('نرخ ثبت‌شدهٔ شارژ: ۱ نور = ۱۰ ریال');
        });

        test('خطای دریافت شارژها نمایش داده می‌شود', async () => {
            const base = responder;
            responder = (url, init) => (url.includes('refundable-topups')
                ? { status: 403, body: { success: false, error: 'مجوز ندارید' } }
                : base(url, init));
            render(withPerms(<CreateNoorWithdrawalModal user={USER} onClose={jest.fn()} />));
            selectRefund();
            expect(await screen.findByText('مجوز ندارید')).toBeInTheDocument();
        });
    });
});

describe('NoorWithdrawalsList', () => {
    const row = (over) => ({
        id: 'w1', userExternalId: 'doc-1', kind: 'AdminDiscretionary', status: 'PendingPayment', amountNoor: 10, amountRial: 500000,
        beneficiaryName: 'علی', beneficiaryCardNumber: CARD, description: 'د', createdAtUtc: '2026-11-08T00:00:00Z',
        hasReceipt: false, ...over,
    });

    test('پیش‌فرض در انتظار پرداخت؛ اقدام‌ها با مجوز نمایش داده می‌شوند', async () => {
        responder = () => ({ status: 200, body: { success: true, data: [row()] } });
        render(withPerms(<NoorWithdrawalsList />));
        expect(await screen.findByRole('button', { name: 'پرداخت شد' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'پرداخت نشد' })).toBeInTheDocument();
        expect(fetchCalls[0].url).toBe('/api/admin/noor-withdrawals?status=PendingPayment');
    });

    test('بدون Noor.Withdraw اقدام نمایش داده نمی‌شود', async () => {
        responder = () => ({ status: 200, body: { success: true, data: [row()] } });
        render(withPerms(<NoorWithdrawalsList />, []));
        await screen.findByText('علی');
        expect(screen.queryByRole('button', { name: 'پرداخت شد' })).not.toBeInTheDocument();
    });

    test('رکورد پرداخت‌شده فقط فیش دارد و برگشت‌خورده هیچ اقدامی ندارد', async () => {
        responder = (url) => ({
            status: 200,
            body: { success: true, data: [url.includes('Reversed') ? row({ status: 'Reversed', reversalReason: 'علت' }) : row({ status: 'Paid', hasReceipt: true, paymentReference: 'R1' })] },
        });
        render(withPerms(<NoorWithdrawalsList />));
        fireEvent.change(screen.getByLabelText('وضعیت'), { target: { value: 'Paid' } });
        fireEvent.click(await screen.findByRole('button', { name: 'مشاهدهٔ فیش' }));
        expect(screen.getByAltText('فیش واریز')).toHaveAttribute('src', '/api/admin/noor-withdrawals/w1/receipt');
        fireEvent.click(screen.getAllByRole('button', { name: 'بستن' })[0]);
        expect(screen.queryByAltText('فیش واریز')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /پرداخت (شد|نشد)/ })).not.toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('وضعیت'), { target: { value: 'Reversed' } });
        await screen.findByText('علت: علت');
        expect(screen.queryByRole('button', { name: 'مشاهدهٔ فیش' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /پرداخت (شد|نشد)/ })).not.toBeInTheDocument();
    });

    test('«پرداخت شد» بدون فیش و شناسه ارسال نمی‌شود و با هر دو ارسال می‌شود', async () => {
        responder = (url, init) => (init?.method === 'POST'
            ? { status: 200, body: { success: true } }
            : { status: 200, body: { success: true, data: [row()] } });
        render(withPerms(<NoorWithdrawalsList />));
        fireEvent.click(await screen.findByRole('button', { name: 'پرداخت شد' }));
        fireEvent.click(screen.getByRole('button', { name: 'ثبت پرداخت' }));
        expect(await screen.findByText(/شناسهٔ پرداخت الزامی/)).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText(/شناسهٔ پرداخت/), { target: { value: 'R1' } });
        fireEvent.click(screen.getByRole('button', { name: 'ثبت پرداخت' }));
        expect(await screen.findByText('بارگذاری فیش الزامی است.')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText(/فیش واریز/), { target: { files: [new File(['x'], 'r.png', { type: 'image/png' })] } });
        fireEvent.click(screen.getByRole('button', { name: 'ثبت پرداخت' }));
        await waitFor(() => expect(fetchCalls.some((c) => c.url === '/api/admin/noor-withdrawals/w1/payment')).toBe(true));
        const post = fetchCalls.find((c) => c.url.endsWith('/payment'));
        expect(post.init.body.get('paymentReference')).toBe('R1');
        expect(post.init.body.get('receipt')).toBeTruthy();
    });

    test('«پرداخت نشد» علت می‌خواهد و JSON می‌فرستد', async () => {
        responder = (url, init) => (init?.method === 'POST'
            ? { status: 200, body: { success: true } }
            : { status: 200, body: { success: true, data: [row()] } });
        render(withPerms(<NoorWithdrawalsList />));
        fireEvent.click(await screen.findByRole('button', { name: 'پرداخت نشد' }));
        fireEvent.click(screen.getByRole('button', { name: /تأیید «پرداخت نشد»/ }));
        expect(await screen.findByText(/علت الزامی است/)).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText(/علت/), { target: { value: 'حساب اشتباه' } });
        fireEvent.click(screen.getByRole('button', { name: /تأیید «پرداخت نشد»/ }));
        await waitFor(() => expect(fetchCalls.some((c) => c.url.endsWith('/reverse'))).toBe(true));
        const post = fetchCalls.find((c) => c.url.endsWith('/reverse'));
        expect(JSON.parse(post.init.body)).toEqual({ reason: 'حساب اشتباه' });
    });

    test('خطای فهرست با پیام همان پاسخ', async () => {
        responder = () => ({ status: 403, body: { success: false, error: 'مجوز ندارید' } });
        render(withPerms(<NoorWithdrawalsList />));
        expect(await screen.findByText('مجوز ندارید')).toBeInTheDocument();
    });
});
