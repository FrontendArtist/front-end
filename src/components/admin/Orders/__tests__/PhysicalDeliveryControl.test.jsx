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
jest.mock('../../Shared/AdminButton', () => ({ children, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled}>{children}</button>
));

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
  it('ارسال‌شده و سپس تحویل‌شده را فقط از route سروری ثبت می‌کند', async () => {
    mockStatus('Preparing');
    render(<PhysicalDeliveryControl purchaseId={PID} cartId={CART} />);
    expect(await screen.findByText('در حال آماده‌سازی')).toBeInTheDocument();

    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { purchaseId: PID, deliveryStatus: 'Shipped' } }) });
    fireEvent.click(screen.getByText('ثبت ارسال‌شده'));
    await waitFor(() => expect(screen.getAllByText('ارسال‌شده').length).toBeGreaterThan(0));
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/admin/physical-purchases/${PID}/delivery-status`,
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ status: 'Shipped' }) })
    );
    // توکن بای‌مانی در درخواست مرورگر نیست
    expect(JSON.stringify(global.fetch.mock.calls[0][1])).not.toContain('admin-jwt');
    expect(screen.queryByText('ثبت ارسال‌شده')).not.toBeInTheDocument();

    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { purchaseId: PID, deliveryStatus: 'Delivered' } }) });
    fireEvent.click(screen.getByText('ثبت تحویل‌شده'));
    await waitFor(() => expect(screen.queryByText('ثبت تحویل‌شده')).not.toBeInTheDocument());
    expect(screen.getByText('تحویل‌شده', { selector: 'strong' })).toBeInTheDocument();
  });

  it('وضعیت فعلی از رسید سفارش ادمین با شناسهٔ cart خوانده می‌شود', async () => {
    mockStatus('Shipped');
    render(<PhysicalDeliveryControl purchaseId={PID} cartId={CART} />);
    await screen.findByText('ارسال‌شده', { selector: 'strong' });
    expect(getAdminCourseOrderReceipt).toHaveBeenCalledWith(expect.objectContaining({ orderId: `cart:${CART}` }));
    expect(screen.queryByText('ثبت ارسال‌شده')).not.toBeInTheDocument();
  });

  it('پیام دامنهٔ ۴۰۰ به ادمین نشان داده می‌شود', async () => {
    mockStatus('Preparing');
    render(<PhysicalDeliveryControl purchaseId={PID} cartId={null} />);
    await screen.findByText('در حال آماده‌سازی');
    global.fetch.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ success: false, error: 'پرش از آماده‌سازی به تحویل مجاز نیست.' }) });
    fireEvent.click(screen.getByText('ثبت تحویل‌شده'));
    expect(await screen.findByRole('alert')).toHaveTextContent('پرش از آماده‌سازی به تحویل مجاز نیست.');
    expect(getAdminCourseOrderReceipt).toHaveBeenCalledWith(expect.objectContaining({ orderId: `purchase:${PID}` }));
  });

  it('خطای ۴۰۳ به ادمین نشان داده می‌شود', async () => {
    mockStatus('Preparing');
    render(<PhysicalDeliveryControl purchaseId={PID} cartId={CART} />);
    await screen.findByText('در حال آماده‌سازی');
    global.fetch.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ success: false, error: 'ادمین مجوز مدیریت دوره‌ها و کالاها (Courses.Manage) را ندارد.' }) });
    fireEvent.click(screen.getByText('ثبت ارسال‌شده'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Courses.Manage');
  });

  it('شکست خواندن وضعیت مانع ثبت نمی‌شود', async () => {
    getAdminCourseOrderReceipt.mockResolvedValue({ success: false, error: 'x' });
    render(<PhysicalDeliveryControl purchaseId={PID} cartId={CART} />);
    expect(await screen.findByText('نامشخص')).toBeInTheDocument();
    expect(screen.getByText('ثبت ارسال‌شده')).toBeEnabled();
  });
});
