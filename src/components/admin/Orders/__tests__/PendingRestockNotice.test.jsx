import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

import '@testing-library/jest-dom';
import PendingRestockNotice from '../PendingRestockNotice';

const CART = '0df2e95e-906e-4e9a-aa25-e03fe83edb07';
const OP = '11111111-1111-1111-1111-111111111111';
const restock = {
  operationId: OP,
  cartId: CART,
  attempts: 20,
  maxAttempts: 20,
  abandoned: true,
  lastErrorCode: 'CART_CONFLICT',
  items: [{ purchaseId: 'p1', quantity: 3 }],
};
const items = [{ purchaseId: 'p1', title: 'کتاب هندسه' }];

function mockFetch(actionResponse) {
  global.fetch = jest.fn((url, init) => {
    if (init?.method === 'POST') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(actionResponse) });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: [restock, { ...restock, operationId: 'x', cartId: 'other' }] }),
    });
  });
}

describe('PendingRestockNotice (BND-05)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('نام کالا، تعداد و علت را به زبان ساده نشان می‌دهد و فقط سبد همین سفارش را', async () => {
    mockFetch({});
    render(<PendingRestockNotice cartId={CART} items={items} />);
    expect(await screen.findByText('کتاب هندسه (۳ عدد)')).toBeInTheDocument();
    expect(screen.getByText(/کالا حذف یا عوض شده/)).toBeInTheDocument();
    expect(screen.getAllByTestId('pending-restock-notice')).toHaveLength(1);
  });

  test('تلاش دوباره موفق، اعلان را می‌بندد و onCleared را صدا می‌زند', async () => {
    mockFetch({ data: { operationId: OP, pending: false } });
    const onCleared = jest.fn();
    render(<PendingRestockNotice cartId={CART} items={items} onCleared={onCleared} />);
    fireEvent.click(await screen.findByRole('button', { name: 'تلاش دوباره' }));
    await waitFor(() => expect(onCleared).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('pending-restock-notice')).not.toBeInTheDocument();
  });

  test('تلاش دوباره ناموفق، اعلان را نگه می‌دارد و پیام می‌دهد', async () => {
    mockFetch({ data: { operationId: OP, pending: true, lastErrorCode: 'CART_CONFLICT' } });
    render(<PendingRestockNotice cartId={CART} items={items} />);
    fireEvent.click(await screen.findByRole('button', { name: 'تلاش دوباره' }));
    expect(await screen.findByText(/تلاش دوباره هم ناموفق بود: سایت کالا را پیدا نکرد/)).toBeInTheDocument();
    expect(screen.getByTestId('pending-restock-notice')).toBeInTheDocument();
  });

  test('بستن دستی فقط پس از تأیید ادمین به سرور می‌رود', async () => {
    mockFetch({ data: { operationId: OP, pending: false } });
    jest.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const onCleared = jest.fn();
    render(<PendingRestockNotice cartId={CART} items={items} onCleared={onCleared} />);
    const button = await screen.findByRole('button', { name: 'موجودی را دستی اصلاح کردم' });

    fireEvent.click(button);
    expect(onCleared).not.toHaveBeenCalled();
    expect(global.fetch.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);

    fireEvent.click(button);
    await waitFor(() => expect(onCleared).toHaveBeenCalledTimes(1));
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/admin/physical-purchases/restocks/${OP}/resolve`,
      { method: 'POST' },
    );
  });

  test('سفارش بدون عملیات رهاشده چیزی نشان نمی‌دهد', async () => {
    mockFetch({});
    const { container } = render(<PendingRestockNotice cartId="not-this-cart" items={items} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
