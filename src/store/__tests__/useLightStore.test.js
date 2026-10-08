import { getSession } from 'next-auth/react';
import { getWalletBalanceWithByeMoney } from '@/lib/byeMoneyApi';
import { useLightStore } from '../useLightStore';

jest.mock('next-auth/react', () => ({ getSession: jest.fn() }));
jest.mock('@/lib/byeMoneyApi', () => ({ getWalletBalanceWithByeMoney: jest.fn() }));

describe('موجودی معتبر نور', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useLightStore.getState().reset();
    });

    test('موجودی را با JWT از بای‌مانی می‌گیرد و درخواست تکراری نمی‌فرستد', async () => {
        getWalletBalanceWithByeMoney.mockResolvedValue({ success: true, balance: 120.5 });
        await expect(useLightStore.getState().fetchLightBalance(false, 'user-jwt')).resolves.toBe(120.5);
        await expect(useLightStore.getState().fetchLightBalance()).resolves.toBe(120.5);
        expect(getWalletBalanceWithByeMoney).toHaveBeenCalledTimes(1);
        expect(getWalletBalanceWithByeMoney).toHaveBeenCalledWith({ jwt: 'user-jwt' });
        expect(getSession).not.toHaveBeenCalled();
    });

    test('پس از شارژ، تازه‌سازی موجودی قبلی را با نتیجه سرور جایگزین می‌کند', async () => {
        useLightStore.getState().setLightBalance(100);
        getWalletBalanceWithByeMoney.mockResolvedValue({ success: true, balance: 130 });
        await expect(useLightStore.getState().refreshLightBalance('user-jwt')).resolves.toBe(130);
        expect(useLightStore.getState().isLoading).toBe(false);
    });

    test('در نشست نامعتبر، موجودی قبلی به‌عنوان موجودی کاربر نمایش داده نمی‌شود', async () => {
        useLightStore.getState().setLightBalance(100);
        getWalletBalanceWithByeMoney.mockResolvedValue({ unauthorized: true });
        await expect(useLightStore.getState().refreshLightBalance('expired-jwt')).resolves.toBeNull();
        expect(useLightStore.getState().lightBalance).toBeNull();
    });

    test('شکست شبکه موجودی ساختگی تولید نمی‌کند و تلاش بعدی ممکن است', async () => {
        getWalletBalanceWithByeMoney.mockRejectedValueOnce(new Error('network'))
            .mockResolvedValueOnce({ success: true, balance: 50 });
        await expect(useLightStore.getState().fetchLightBalance(false, 'jwt')).resolves.toBeNull();
        await expect(useLightStore.getState().fetchLightBalance(false, 'jwt')).resolves.toBe(50);
    });
});
