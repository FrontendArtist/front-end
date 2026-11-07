import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PermissionsProvider } from '@/context/PermissionsContext';
import CourseOrderSettlements from '../CourseOrderSettlements';

const TOKEN1 = '1'.repeat(64);
const TOKEN2 = '2'.repeat(64);
const order = {
  orderId: 'cart:0df2e95e-906e-4e9a-aa25-e03fe83edb07', sourceType: 'Cart', buyerExternalUserId: 'buyer1', buyerName: 'علی رضایی', buyerPhone: '09120000000',
  orderCreatedAtUtc: '2026-11-01T10:00:00Z', regularNetAmountInNoor: 70, giftNetAmountInNoor: 30, netAmountInNoor: 100,
};
const preview = (orderCount, token) => ({
  orderCount, totalRegularNetAmountInNoor: 700, totalGiftNetAmountInNoor: 300, totalNetAmountInNoor: 1000,
  previewToken: token, orders: { items: orderCount ? [order] : [], page: 1, pageSize: 20, totalCount: orderCount },
});
const periods = { items: [], page: 1, pageSize: 20, totalCount: 0 };
const ok = (data, status = 200) => Promise.resolve({ ok: true, status, json: () => Promise.resolve({ success: true, data }) });
const fail = (status, body) => Promise.resolve({ ok: false, status, json: () => Promise.resolve({ success: false, ...body }) });

function renderWith(permissions) {
  return render(
    <PermissionsProvider initialPermissions={permissions}>
      <CourseOrderSettlements />
    </PermissionsProvider>,
  );
}

/** پاسخ‌های پیش‌نمایش به ترتیب مصرف می‌شوند (آخری تکرار می‌شود)؛ پاسخ بستن ثابت است. */
function mockApi({ previews, close }) {
  const queue = [...previews];
  global.fetch = jest.fn((url, init) => {
    if (init?.method === 'POST') return close();
    if (url.includes('/preview')) return ok(queue.length > 1 ? queue.shift() : queue[0]);
    return ok(periods);
  });
}

const previewCalls = () => global.fetch.mock.calls.filter(([u]) => u.includes('/preview')).length;

describe('CourseOrderSettlements (I11-S)', () => {
  afterEach(() => jest.restoreAllMocks());

  test('shows count, regular/gift/total and the gift note; hides close button without Purchases.Settle', async () => {
    mockApi({ previews: [preview(1, TOKEN1)] });
    renderWith(['Purchases.View']);
    expect(await screen.findByText(/سفارش تسویه‌نشده/)).toBeInTheDocument();
    expect(screen.getAllByText('نور عادی').length).toBeGreaterThan(0);
    expect(screen.getAllByText('نور هدیه').length).toBeGreaterThan(0);
    expect(screen.getAllByText('جمع کل').length).toBeGreaterThan(0);
    expect(screen.getByText(/نور هدیه پشتوانهٔ ریالی ندارد/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'بستن دوره' })).not.toBeInTheDocument();
  });

  test('close button is disabled when there is nothing to settle', async () => {
    mockApi({ previews: [preview(0, TOKEN1)] });
    renderWith(['Purchases.View', 'Purchases.Settle']);
    expect(await screen.findByRole('button', { name: 'بستن دوره' })).toBeDisabled();
  });

  test('confirm dialog shows preview totals, posts the same previewToken and refreshes after success', async () => {
    mockApi({
      previews: [preview(1, TOKEN1), preview(0, TOKEN2)],
      close: () => ok({ periodId: 'p', orderCount: 1 }, 201),
    });
    renderWith(['Purchases.View', 'Purchases.Settle']);
    fireEvent.click(await screen.findByRole('button', { name: 'بستن دوره' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText((t) => t.startsWith((1000).toLocaleString('fa-IR')))).toBeInTheDocument();
    expect(within(dialog).getByText((t) => t.startsWith((700).toLocaleString('fa-IR')))).toBeInTheDocument();
    expect(within(dialog).getByText((t) => t.startsWith((300).toLocaleString('fa-IR')))).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('عنوان (اختیاری)'), { target: { value: 'آبان' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'تأیید و بستن دوره' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const post = global.fetch.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(post[1].body)).toEqual({ title: 'آبان', note: '', previewToken: TOKEN1 });
    expect(await screen.findByText(/دورهٔ تسویه با/)).toBeInTheDocument();
    await waitFor(() => expect(previewCalls()).toBe(2));
  });

  test('409 shows the ByeMoney message and refetches the preview', async () => {
    mockApi({
      previews: [preview(1, TOKEN1), preview(2, TOKEN2)],
      close: () => fail(409, { code: 'SETTLEMENT_ALREADY_SETTLED', error: 'ادمین دیگری دوره را بسته است.' }),
    });
    renderWith(['Purchases.View', 'Purchases.Settle']);
    fireEvent.click(await screen.findByRole('button', { name: 'بستن دوره' }));
    fireEvent.click(screen.getByRole('button', { name: 'تأیید و بستن دوره' }));
    expect(await screen.findByText('ادمین دیگری دوره را بسته است.')).toBeInTheDocument();
    await waitFor(() => expect(previewCalls()).toBe(2));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('403 from ByeMoney shows a message instead of breaking the page', async () => {
    global.fetch = jest.fn((url) => (url.includes('/preview')
      ? fail(403, { error: 'مجوز مشاهدهٔ تسویهٔ سفارش‌ها (Purchases.View) را ندارید.' })
      : ok(periods)));
    renderWith(['Purchases.Settle']);
    expect(await screen.findByText(/Purchases\.View/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'بستن دوره' })).not.toBeInTheDocument();
  });
});

describe('CourseOrderSettlements rows', () => {
  afterEach(() => jest.restoreAllMocks());

  test('shows buyer name and phone, short order number, and date before time; never the raw buyer id', async () => {
    mockApi({ previews: [preview(1, TOKEN1)] });
    renderWith(['Purchases.View']);
    expect(await screen.findByText('علی رضایی')).toBeInTheDocument();
    expect(screen.getByText('09120000000')).toBeInTheDocument();
    expect(screen.getByText('#0DF2E95E')).toBeInTheDocument();
    expect(screen.queryByText('buyer1')).not.toBeInTheDocument();
    const time = screen.getByText(/^ساعت /);
    expect(time.previousElementSibling).toHaveTextContent(/۱۴۰۵/);
  });
});
