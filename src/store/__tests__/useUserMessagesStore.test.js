import { useUserMessagesStore } from '../useUserMessagesStore';
import { getMyMessages } from '@/lib/messagesApi';

jest.mock('@/lib/messagesApi', () => ({
    getMyMessages: jest.fn(),
}));

describe('useUserMessagesStore (HF11)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useUserMessagesStore.getState().setMessagesUser(null);
    });

    test('تغییر کاربر باید پیام‌های کاربر قبلی را پاک کند و پیام‌های کاربر جدید را بگیرد', async () => {
        getMyMessages
            .mockResolvedValueOnce({ data: [{ id: 1, subject: 'پیام کاربر اول' }] })
            .mockResolvedValueOnce({ data: [{ id: 2, subject: 'پیام کاربر دوم' }] });

        await useUserMessagesStore.getState().fetchMessages('token-1', 101);
        expect(useUserMessagesStore.getState().messages).toHaveLength(1);
        expect(useUserMessagesStore.getState().messages[0].id).toBe(1);

        await useUserMessagesStore.getState().fetchMessages('token-2', 202);
        expect(useUserMessagesStore.getState().userId).toBe('202');
        expect(useUserMessagesStore.getState().messages).toHaveLength(1);
        expect(useUserMessagesStore.getState().messages[0].id).toBe(2);
    });

    test('پاسخ دیرهنگام حساب اول نباید پیام‌های حساب دوم را بازنویسی کند', async () => {
        let resolveFirst;
        getMyMessages
            .mockImplementationOnce(
                () =>
                    new Promise((resolve) => {
                        resolveFirst = resolve;
                    })
            )
            .mockResolvedValueOnce({ data: [{ id: 2, subject: 'پیام کاربر دوم' }] });

        const firstPromise = useUserMessagesStore.getState().fetchMessages('token-1', 101);
        const secondPromise = useUserMessagesStore.getState().fetchMessages('token-2', 202);

        await secondPromise;
        resolveFirst({ data: [{ id: 1, subject: 'پیام دیرهنگام کاربر اول' }] });
        await firstPromise;

        expect(useUserMessagesStore.getState().userId).toBe('202');
        expect(useUserMessagesStore.getState().messages).toEqual([{ id: 2, subject: 'پیام کاربر دوم' }]);
    });
});
