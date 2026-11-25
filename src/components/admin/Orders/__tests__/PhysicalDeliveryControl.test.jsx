import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PhysicalDeliveryControl, { CartShipmentControl } from '../PhysicalDeliveryControl';
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

describe('PhysicalDeliveryControl (کنترل ارسال سطر کالا)', () => {
  it('در آماده‌سازی فقط ثبت دستی در سطر کالا می‌ماند و ساخت مرسوله به سطح سبد منتقل شده است', async () => {
    mockStatus('Preparing');
    render(<PhysicalDeliveryControl purchaseId={PID} cartId={CART} />);
    expect(await screen.findByText('منتظر ارسال')).toBeInTheDocument();

    expect(screen.getByTestId('register-manual-tracking')).toHaveTextContent('ثبت کد رهگیری دستی');
    expect(screen.queryByTestId('create-provider-shipment')).not.toBeInTheDocument();
    expect(screen.queryByTestId('collection-type-fieldset')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delivery-status-select')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /پیشبرد به: ارسال‌شده/ })).not.toBeInTheDocument();
  });

  it('ثبت کد رهگیری دستی فقط با کد به delivery-status می‌رود و نشان را Shipped می‌کند', async () => {
    mockStatus('Preparing');
    render(<PhysicalDeliveryControl purchaseId={PID} cartId={CART} />);
    await screen.findByText('منتظر ارسال');

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
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/admin/physical-purchases/${PID}/delivery-status`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          status: 'Shipped',
          trackingCode: 'PTX-8846884',
          trackingProvider: 'Manual',
        }),
      })
    );
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

  it.each([400, 409])('پیام خطای %i هنگام پیشبرد به تحویل‌شده نشان داده می‌شود', async (statusCode) => {
    mockStatus('Shipped');
    render(<PhysicalDeliveryControl purchaseId={PID} cartId={null} />);
    await screen.findByText('ارسال‌شده');

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: statusCode,
      json: async () => ({ success: false, error: 'انتقال مجاز نیست.' }),
    });

    fireEvent.change(screen.getByTestId('delivery-status-select'), { target: { value: 'Delivered' } });

    expect(await screen.findByRole('alert')).toHaveTextContent('انتقال از «ارسال‌شده» به «تحویل‌شده» مجاز نیست.');
    expect(getAdminCourseOrderReceipt).toHaveBeenCalledWith(expect.objectContaining({ orderId: `purchase:${PID}` }));
  });

  it('شکست خواندن وضعیت مانع ثبت کد رهگیری دستی نمی‌شود', async () => {
    getAdminCourseOrderReceipt.mockResolvedValue({ success: false, error: 'x' });
    render(<PhysicalDeliveryControl purchaseId={PID} cartId={CART} />);
    expect(await screen.findByText('نامشخص')).toBeInTheDocument();
    expect(screen.getByTestId('register-manual-tracking')).toBeEnabled();
  });
});

describe('CartShipmentControl (ساخت مرسوله در سطح سبد خرید)', () => {
  it('ارسال با پستکس boxTypeId را به route سبد می‌فرستد و با Shipped رفرش می‌کند', async () => {
    const onShipmentCreated = jest.fn();
    render(<CartShipmentControl cartId={CART} onShipmentCreated={onShipmentCreated} />);

    fireEvent.change(screen.getByTestId('box-type-select'), { target: { value: '5' } });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        cartId: CART,
        deliveryStatus: 'Shipped',
        trackingCode: 'IR-POST-100',
        trackingProvider: 'PostEx',
        providerParcelId: '1319906676294',
        outcome: 'Created',
      }),
    });

    fireEvent.click(screen.getByTestId('create-provider-shipment'));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/admin/carts/${CART}/shipments`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          provider: 'PostEx',
          boxTypeId: 5,
        }),
      })
    );
    expect(await screen.findByTestId('delivery-message-ok')).toHaveTextContent('مرسوله ثبت و وضعیت به «ارسال‌شده» تغییر کرد.');
    expect(onShipmentCreated).toHaveBeenCalled();
  });

  it('اگر پستکس Preparing و warning برگرداند، پیام نشان داده می‌شود و رفرش فراخوانی می‌شود', async () => {
    const onShipmentCreated = jest.fn();
    render(<CartShipmentControl cartId={CART} onShipmentCreated={onShipmentCreated} />);

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        cartId: CART,
        deliveryStatus: 'Preparing',
        providerParcelId: '1319906676294',
        outcome: 'AwaitingTrackingCode',
        warning: 'کد پستی هنوز نیامده.',
      }),
    });

    fireEvent.click(screen.getByTestId('create-provider-shipment'));

    expect(await screen.findByTestId('delivery-message-alert')).toHaveTextContent('کد پستی هنوز نیامده.');
    expect(onShipmentCreated).toHaveBeenCalled();
  });

  it('خطای سروری (error pass-through) در پیام خطا منعکس می‌شود', async () => {
    const onShipmentCreated = jest.fn();
    render(<CartShipmentControl cartId={CART} onShipmentCreated={onShipmentCreated} />);

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'آدرس گیرنده ناقص است.',
      }),
    });

    fireEvent.click(screen.getByTestId('create-provider-shipment'));

    expect(await screen.findByTestId('delivery-message-alert')).toHaveTextContent('آدرس گیرنده ناقص است.');
    expect(onShipmentCreated).not.toHaveBeenCalled();
  });

  it('فراخوانی PhysicalDeliveryControl با cartId و بدون purchaseId به CartShipmentControl منتقل می‌شود', () => {
    render(<PhysicalDeliveryControl cartId={CART} />);
    expect(screen.getByTestId('cart-shipment-control')).toBeInTheDocument();
    expect(screen.getByTestId('create-provider-shipment')).toHaveTextContent('ارسال با واسط پستی');
  });
});
