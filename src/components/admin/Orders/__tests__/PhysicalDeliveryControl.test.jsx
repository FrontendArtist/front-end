import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PhysicalDeliveryControl from '../PhysicalDeliveryControl';
import { getAdminCourseOrderReceipt } from '@/lib/byeMoneyApi';

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { jwt: 'admin-jwt' } } }),
}));
jest.mock('@/lib/byeMoneyApi', () => ({
  CourseOrderId: { for: (s, id) => `${s === 'Cart' ? 'cart' : 'purchase'}:${id}` },
  getAdminCourseOrderReceipt: jest.fn(),
}));

const PID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CART = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

const mockStatus = (physicalDeliveryStatus) =>
  getAdminCourseOrderReceipt.mockResolvedValue({
    success: true,
    data: { items: [{ purchaseId: PID, physicalDeliveryStatus }] },
  });

beforeEach(() => {
  getAdminCourseOrderReceipt.mockReset();
  global.fetch = jest.fn();
});

describe('PhysicalDeliveryControl', () => {
  it('ارسال‌شده و سپس تحویل‌شده را فقط از طریق دراپ‌داون و route سروری ثبت می‌کند', async () => {
    mockStatus('Preparing');
    render(<PhysicalDeliveryControl purchaseId={PID} cartId={CART} />);
    expect(await screen.findByText('در حال آماده‌سازی')).toBeInTheDocument();

    const select = screen.getByTestId('delivery-status-select');
    // در وضعیت Preparing، گزینه تحویل‌شده غیرفعال است
    expect(screen.getByRole('option', { name: /تحویل‌شده/ })).toBeDisabled();

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { purchaseId: PID, deliveryStatus: 'Shipped' } }),
    });

    fireEvent.change(select, { target: { value: 'Shipped' } });

    await waitFor(() => expect(screen.getAllByText('ارسال‌شده').length).toBeGreaterThan(0));
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/admin/physical-purchases/${PID}/delivery-status`,
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ status: 'Shipped' }) })
    );
    // توکن بای‌مانی در درخواست مرورگر نیست
    expect(JSON.stringify(global.fetch.mock.calls[0][1])).not.toContain('admin-jwt');

    // در وضعیت Shipped، گزینه بازگشت به Preparing غیرفعال است
    expect(screen.getByRole('option', { name: /در حال آماده‌سازی/ })).toBeDisabled();

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { purchaseId: PID, deliveryStatus: 'Delivered' } }),
    });

    fireEvent.change(select, { target: { value: 'Delivered' } });

    await waitFor(() => expect(screen.getByText('تحویل کالا نهایی شده است.')).toBeInTheDocument());
    expect(screen.getByText('تحویل‌شده')).toBeInTheDocument();
  });

  it('وضعیت فعلی از رسید سفارش ادمین با شناسهٔ cart خوانده می‌شود', async () => {
    mockStatus('Shipped');
    render(<PhysicalDeliveryControl purchaseId={PID} cartId={CART} />);
    await screen.findByText('ارسال‌شده');
    expect(getAdminCourseOrderReceipt).toHaveBeenCalledWith(expect.objectContaining({ orderId: `cart:${CART}` }));
    expect(screen.getByRole('option', { name: /در حال آماده‌سازی/ })).toBeDisabled();
  });

  it('پیام خطای ۴۰۰ به ادمین نشان داده می‌شود', async () => {
    mockStatus('Preparing');
    render(<PhysicalDeliveryControl purchaseId={PID} cartId={null} />);
    await screen.findByText('در حال آماده‌سازی');

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ success: false, error: 'پرش از آماده‌سازی به تحویل مجاز نیست.' }),
    });

    const select = screen.getByTestId('delivery-status-select');
    fireEvent.change(select, { target: { value: 'Shipped' } });

    expect(await screen.findByRole('alert')).toHaveTextContent('انتقال از «در حال آماده‌سازی» به «ارسال‌شده» مجاز نیست.');
    expect(getAdminCourseOrderReceipt).toHaveBeenCalledWith(expect.objectContaining({ orderId: `purchase:${PID}` }));
  });

  it('خطای ۴۰۳ به ادمین نشان داده می‌شود', async () => {
    mockStatus('Preparing');
    render(<PhysicalDeliveryControl purchaseId={PID} cartId={CART} />);
    await screen.findByText('در حال آماده‌سازی');

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ success: false, error: 'ادمین مجوز مدیریت دوره‌ها و کالاها (Courses.Manage) را ندارد.' }),
    });

    const select = screen.getByTestId('delivery-status-select');
    fireEvent.change(select, { target: { value: 'Shipped' } });

    expect(await screen.findByRole('alert')).toHaveTextContent('Courses.Manage');
  });

  it('شکست خواندن وضعیت مانع ثبت نمی‌شود', async () => {
    getAdminCourseOrderReceipt.mockResolvedValue({ success: false, error: 'x' });
    render(<PhysicalDeliveryControl purchaseId={PID} cartId={CART} />);
    expect(await screen.findByText('نامشخص')).toBeInTheDocument();
    expect(screen.getByTestId('delivery-status-select')).toBeEnabled();
  });
});
