import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CartShipmentControl from '../CartShipmentControl';

const CART = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

beforeEach(() => {
  global.fetch = jest.fn();
});

describe('CartShipmentControl (ساخت مرسوله در سطح سبد)', () => {
  it('فیلدهای collectionType و سایز جعبه (boxTypeId) ۱ تا ۱۲ را رندر می‌کند', () => {
    render(<CartShipmentControl cartId={CART} />);

    expect(screen.getByTestId('cart-shipment-control')).toBeInTheDocument();
    expect(screen.getByTestId('collection-type-fieldset')).toBeInTheDocument();
    expect(screen.getByTestId('collection-type-courier_drop_off')).toBeChecked();
    expect(screen.getByTestId('collection-type-pick_up')).not.toBeChecked();

    const boxSelect = screen.getByTestId('box-type-select');
    expect(boxSelect).toBeInTheDocument();
    expect(boxSelect.value).toBe('');
    expect(screen.getByRole('option', { name: /پیش‌فرض/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /جعبه استاندارد 1\b/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /جعبه استاندارد 12\b/ })).toBeInTheDocument();
  });

  it('ساخت مرسوله با پیش‌فرض‌ها درخواست را به route سروری سبد می‌فرستد و با Shipped پیام موفق می‌دهد', async () => {
    const onShipmentCreated = jest.fn();
    render(<CartShipmentControl cartId={CART} onShipmentCreated={onShipmentCreated} />);

    fireEvent.click(screen.getByTestId('collection-type-pick_up'));

    const mockResponse = {
      cartId: CART,
      deliveryStatus: 'Shipped',
      trackingCode: 'IR-POST-999',
      trackingProvider: 'PostEx',
      providerParcelId: '1319906676294',
      outcome: 'Created',
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    fireEvent.click(screen.getByTestId('create-provider-shipment'));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/admin/carts/${CART}/shipments`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'PostEx',
          collectionType: 'pick_up',
        }),
      })
    );

    expect(await screen.findByTestId('delivery-message-ok')).toHaveTextContent('مرسوله ثبت و وضعیت به «ارسال‌شده» تغییر کرد.');
    expect(onShipmentCreated).toHaveBeenCalledWith(mockResponse);
  });

  it('اورراید اختیاری boxTypeId را به بدنهٔ درخواست اضافه می‌کند', async () => {
    const onShipmentCreated = jest.fn();
    render(<CartShipmentControl cartId={CART} onShipmentCreated={onShipmentCreated} />);

    fireEvent.click(screen.getByTestId('collection-type-courier_drop_off'));
    fireEvent.change(screen.getByTestId('box-type-select'), { target: { value: '5' } });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        cartId: CART,
        deliveryStatus: 'Shipped',
        providerParcelId: '1319906676294',
        outcome: 'Created',
      }),
    });

    fireEvent.click(screen.getByTestId('create-provider-shipment'));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/admin/carts/${CART}/shipments`,
      expect.objectContaining({
        body: JSON.stringify({
          provider: 'PostEx',
          collectionType: 'courier_drop_off',
          boxTypeId: 5,
        }),
      })
    );
  });

  it('در حالت AwaitingTrackingCode یا اخطار، پیام اخطار نمایش داده شده و رفرش سفارش صدا زده می‌شود', async () => {
    const onShipmentCreated = jest.fn();
    render(<CartShipmentControl cartId={CART} onShipmentCreated={onShipmentCreated} />);

    const mockResponse = {
      cartId: CART,
      deliveryStatus: 'Preparing',
      outcome: 'AwaitingTrackingCode',
      warning: 'کد پستی هنوز نیامده.',
      providerParcelId: '1319906676294',
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    fireEvent.click(screen.getByTestId('create-provider-shipment'));

    expect(await screen.findByTestId('delivery-message-alert')).toHaveTextContent('کد پستی هنوز نیامده.');
    expect(onShipmentCreated).toHaveBeenCalledWith(mockResponse);
  });

  it('خطای سرور (error pass-through) را در پیام خطا نمایش می‌دهد و رفرش را صدا نمی‌زند', async () => {
    const onShipmentCreated = jest.fn();
    render(<CartShipmentControl cartId={CART} onShipmentCreated={onShipmentCreated} />);

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: 'هیچ قلم فیزیکی آماده برای ارسال یافت نشد.',
      }),
    });

    fireEvent.click(screen.getByTestId('create-provider-shipment'));

    expect(await screen.findByTestId('delivery-message-alert')).toHaveTextContent('هیچ قلم فیزیکی آماده برای ارسال یافت نشد.');
    expect(onShipmentCreated).not.toHaveBeenCalled();
  });

  it('خطای ارتباط با سرور را مدیریت می‌کند', async () => {
    render(<CartShipmentControl cartId={CART} />);

    global.fetch.mockRejectedValueOnce(new Error('Network error'));
    fireEvent.click(screen.getByTestId('create-provider-shipment'));

    expect(await screen.findByTestId('delivery-message-alert')).toHaveTextContent('خطا در ارتباط با سرور.');
  });
});
