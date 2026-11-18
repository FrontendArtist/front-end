import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PhysicalDeliveryControl from '../PhysicalDeliveryControl';
import { getAdminOrderReceipt as getAdminCourseOrderReceipt } from '@/lib/admin/adminByeMoneyClient';

jest.mock('@/lib/byeMoneyApi', () => ({
  CourseOrderId: { for: (s, id) => `${s === 'Cart' ? 'cart' : 'purchase'}:${id}` },
}));
jest.mock('@/lib/admin/adminByeMoneyClient', () => ({ getAdminOrderReceipt: jest.fn() }));

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
  it('در آماده‌سازی فقط ارسال پستکس و ثبت دستی می‌ماند و پیشبرد بی‌کد نیست', async () => {
    mockStatus('Preparing');
    render(<PhysicalDeliveryControl purchaseId={PID} cartId={CART} />);
    expect(await screen.findByText('در حال آماده‌سازی')).toBeInTheDocument();

    expect(screen.getByTestId('create-provider-shipment')).toHaveTextContent('ارسال با پستکس');
    expect(screen.getByTestId('register-manual-tracking')).toHaveTextContent('ثبت کد رهگیری دستی');
    expect(screen.queryByTestId('delivery-status-select')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /پیشبرد به: ارسال‌شده/ })).not.toBeInTheDocument();
  });

  it('ارسال با پستکس collectionType را به route سروری می‌فرستد و با Shipped نشان را عوض می‌کند', async () => {
    mockStatus('Preparing');
    render(<PhysicalDeliveryControl purchaseId={PID} cartId={CART} />);
    await screen.findByText('در حال آماده‌سازی');

    fireEvent.click(screen.getByTestId('collection-type-courier_drop_off'));

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          purchaseId: PID,
          deliveryStatus: 'Shipped',
          trackingCode: 'IR-POST-100',
          trackingProvider: 'PostEx',
          providerParcelId: '1319906676294',
          outcome: 'Created',
        },
      }),
    });

    fireEvent.click(screen.getByTestId('create-provider-shipment'));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/admin/physical-purchases/${PID}/shipments`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ provider: 'PostEx', collectionType: 'courier_drop_off' }),
      })
    );
    expect(JSON.stringify(global.fetch.mock.calls[0][1])).not.toContain('admin-jwt');
    expect(await screen.findByText('ارسال‌شده')).toBeInTheDocument();
  });

  it('اگر پستکس Preparing و warning برگرداند، پیام نشان داده می‌شود و نشان عوض نمی‌شود', async () => {
    mockStatus('Preparing');
    render(<PhysicalDeliveryControl purchaseId={PID} cartId={CART} />);
    await screen.findByText('در حال آماده‌سازی');

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          purchaseId: PID,
          deliveryStatus: 'Preparing',
          providerParcelId: '1319906676294',
          outcome: 'AwaitingTrackingCode',
          warning: 'کد پستی هنوز نیامده.',
        },
      }),
    });

    fireEvent.click(screen.getByTestId('create-provider-shipment'));

    expect(await screen.findByTestId('delivery-message-alert')).toHaveTextContent('کد پستی هنوز نیامده.');
    expect(screen.getByText('در حال آماده‌سازی')).toBeInTheDocument();
    expect(screen.queryByText('ارسال‌شده')).not.toBeInTheDocument();
  });

  it('ثبت کد رهگیری دستی فقط با کد به delivery-status می‌رود و نشان را Shipped می‌کند', async () => {
    mockStatus('Preparing');
    render(<PhysicalDeliveryControl purchaseId={PID} cartId={CART} />);
    await screen.findByText('در حال آماده‌سازی');

    fireEvent.change(screen.getByTestId('tracking-code-input'), { target: { value: ' PTX-8846884 ' } });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { purchaseId: PID, deliveryStatus: 'Shipped', trackingCode: 'PTX-8846884' },
      }),
    });

    fireEvent.click(screen.getByTestId('register-manual-tracking'));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
      status: 'Shipped',
      trackingCode: 'PTX-8846884',
      trackingProvider: 'Manual',
    });
    expect(await screen.findByText('ارسال‌شده')).toBeInTheDocument();
  });

  it('پس از ارسال، پیشبرد به تحویل‌شده می‌ماند', async () => {
    mockStatus('Shipped');
    render(<PhysicalDeliveryControl purchaseId={PID} cartId={CART} />);
    expect(await screen.findByText('ارسال‌شده')).toBeInTheDocument();

    const select = screen.getByTestId('delivery-status-select');
    expect(screen.getByRole('option', { name: /تحویل‌شده/ })).toBeEnabled();

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { purchaseId: PID, deliveryStatus: 'Delivered' } }),
    });

    fireEvent.change(select, { target: { value: 'Delivered' } });

    await waitFor(() => expect(screen.getByText('تحویل‌شده')).toBeInTheDocument());
    expect(screen.queryByTestId('delivery-status-select')).not.toBeInTheDocument();
    expect(getAdminCourseOrderReceipt).toHaveBeenCalledWith(expect.objectContaining({ orderId: `cart:${CART}` }));
  });

  it('پیام خطای ۴۰۰ هنگام پیشبرد به تحویل‌شده نشان داده می‌شود', async () => {
    mockStatus('Shipped');
    render(<PhysicalDeliveryControl purchaseId={PID} cartId={null} />);
    await screen.findByText('ارسال‌شده');

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ success: false, error: 'انتقال مجاز نیست.' }),
    });

    fireEvent.change(screen.getByTestId('delivery-status-select'), { target: { value: 'Delivered' } });

    expect(await screen.findByRole('alert')).toHaveTextContent('انتقال از «ارسال‌شده» به «تحویل‌شده» مجاز نیست.');
    expect(getAdminCourseOrderReceipt).toHaveBeenCalledWith(expect.objectContaining({ orderId: `purchase:${PID}` }));
  });

  it('شکست خواندن وضعیت مانع کارهای آماده‌سازی نمی‌شود', async () => {
    getAdminCourseOrderReceipt.mockResolvedValue({ success: false, error: 'x' });
    render(<PhysicalDeliveryControl purchaseId={PID} cartId={CART} />);
    expect(await screen.findByText('نامشخص')).toBeInTheDocument();
    expect(screen.getByTestId('create-provider-shipment')).toBeEnabled();
    expect(screen.getByTestId('register-manual-tracking')).toBeEnabled();
  });
});
