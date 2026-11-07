import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AbandonedRestocksAlert from '../AbandonedRestocksAlert';

const row = (over) => ({
  operationId: 'op-1',
  cartId: 'cart-1',
  attempts: 20,
  maxAttempts: 20,
  abandoned: true,
  lastErrorCode: 'CART_CONFLICT',
  items: [{ purchaseId: 'p1', quantity: 2 }],
  ...over,
});

describe('AbandonedRestocksAlert (BND-05)', () => {
  test('فقط تعداد سفارش‌ها را در یک خط نشان می‌دهد، بدون شناسه و کد فنی', () => {
    render(<AbandonedRestocksAlert restocks={[row({ cartId: '0df2e95e-906e-4e9a-aa25-e03fe83edb07' }), row({ operationId: 'op-2', cartId: 'cart-2' })]} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('۲ سفارش لغوشده');
    expect(alert).toHaveTextContent('0DF2E95E');
    expect(alert).not.toHaveTextContent('CART_CONFLICT');
  });

  test('دو عملیات یک سبد یک سفارش شمرده می‌شود', () => {
    render(<AbandonedRestocksAlert restocks={[row(), row({ operationId: 'op-2' })]} />);
    expect(screen.getByRole('alert')).toHaveTextContent('۱ سفارش لغوشده');
  });

  test('عملیات در حال تلاش (غیررهاشده) نمایش داده نمی‌شود', () => {
    const { container } = render(
      <AbandonedRestocksAlert restocks={[row({ abandoned: false, attempts: 2 })]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  test('بدون ردیف چیزی نمایش داده نمی‌شود', () => {
    const { container } = render(<AbandonedRestocksAlert restocks={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('شکست دریافت فهرست «نامشخص» نشان می‌دهد، نه سکوت', () => {
    render(<AbandonedRestocksAlert restocks={undefined} error="ادمین مجوز Noor.Inject را ندارد." />);
    expect(screen.getByRole('alert')).toHaveTextContent('نامشخص');
  });
});
