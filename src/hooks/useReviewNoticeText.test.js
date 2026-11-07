import { renderHook, waitFor } from '@testing-library/react';
import useReviewNoticeText from './useReviewNoticeText';
import { buildReviewNoticeText } from '@/lib/reviewNotice';

const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

const ok = body => ({ ok: true, json: async () => body });

test('پیش‌فرض ۳۰ است و بدون enabled چیزی خوانده نمی‌شود', () => {
    global.fetch = jest.fn();
    const { result } = renderHook(() => useReviewNoticeText(false));
    expect(result.current).toBe(buildReviewNoticeText(30));
    expect(result.current).toContain('حدود ۳۰ دقیقه');
    expect(global.fetch).not.toHaveBeenCalled();
});

test('مقدار غیر ۳۰ از route سروری خوانده و با ارقام فارسی نمایش داده می‌شود', async () => {
    global.fetch = jest.fn().mockResolvedValue(ok({ noCallbackMinutes: 45 }));
    const { result } = renderHook(() => useReviewNoticeText(true));
    await waitFor(() => expect(result.current).toContain('حدود ۴۵ دقیقه'));
    expect(global.fetch).toHaveBeenCalledWith('/api/gateway-reviews/threshold', expect.anything());
});

test.each([
    ['پاسخ ناموفق', () => Promise.resolve({ ok: false, json: async () => ({}) })],
    ['خطای شبکه', () => Promise.reject(new Error('down'))],
    ['مقدار نامعتبر', () => Promise.resolve(ok({ noCallbackMinutes: 0 }))],
])('%s به پیش‌فرض ۳۰ برمی‌گردد', async (_n, impl) => {
    global.fetch = jest.fn().mockImplementation(impl);
    const { result } = renderHook(() => useReviewNoticeText(true));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(result.current).toContain('حدود ۳۰ دقیقه');
});
