import { act, renderHook } from '@testing-library/react';
import usePaymentProcessing from './usePaymentProcessing';

const showPage = (persisted) => {
    const event = new Event('pageshow');
    Object.defineProperty(event, 'persisted', { value: persisted });
    act(() => window.dispatchEvent(event));
};

test('بازگشت از حافظهٔ مرورگر امکان پرداخت دوباره را فعال می‌کند', () => {
    const { result } = renderHook(() => usePaymentProcessing());
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
    showPage(true);
    expect(result.current[0]).toBe(false);
});

test('رویداد عادی صفحه درخواست در حال اجرا را آزاد نمی‌کند', () => {
    const { result } = renderHook(() => usePaymentProcessing());
    act(() => result.current[1](true));
    showPage(false);
    expect(result.current[0]).toBe(true);
});

test('شنونده هنگام خروج از صفحه حذف می‌شود', () => {
    const removeListener = jest.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => usePaymentProcessing());
    unmount();
    expect(removeListener).toHaveBeenCalledWith('pageshow', expect.any(Function));
    removeListener.mockRestore();
});
