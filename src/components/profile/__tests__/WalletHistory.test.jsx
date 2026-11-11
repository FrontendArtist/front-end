import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import WalletHistory from '../WalletHistory';
import { useSession } from 'next-auth/react';
import { getWalletBalanceWithByeMoney, getWalletTransactionsWithByeMoney } from '@/lib/byeMoneyApi';
import { syncByeMoneyUser } from '@/lib/byeMoneySync';

jest.mock('next-auth/react');
jest.mock('@/lib/byeMoneyApi');
jest.mock('@/lib/byeMoneySync');
jest.mock('next/link', () => {
    return ({ children, href, className }) => (
        <a href={href} className={className}>{children}</a>
    );
});

const purchase = {
    transactionId: 'tx-purchase',
    type: 'Purchase',
    amountNoor: -50,
    giftAmountNoor: -30,
    createdAtUtc: '2026-11-10T08:00:00Z',
    orderId: 'cart:11111111-1111-1111-1111-111111111111',
    topUpId: null,
};

const topUp = {
    transactionId: 'tx-topup',
    type: 'TopUp',
    amountNoor: 100,
    giftAmountNoor: 0,
    createdAtUtc: '2026-11-09T08:00:00Z',
    orderId: null,
    topUpId: 'topup-1',
};

describe('WalletHistory', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useSession.mockReturnValue({ status: 'authenticated', data: { user: { jwt: 'user-jwt' } } });
        syncByeMoneyUser.mockResolvedValue(undefined);
        getWalletBalanceWithByeMoney.mockResolvedValue({ success: true, balance: 50, giftBalance: 0 });
    });

    it('shows balance and signed transactions with order link and gift share', async () => {
        getWalletTransactionsWithByeMoney.mockResolvedValue({
            success: true, items: [purchase, topUp], page: 1, pageSize: 20, totalCount: 2,
        });

        render(<WalletHistory />);

        expect(await screen.findByText('خرید')).toBeInTheDocument();
        expect(screen.getByText('شارژ کیف پول')).toBeInTheDocument();
        expect(screen.getByText('−۵۰')).toBeInTheDocument();
        expect(screen.getByText('+۱۰۰')).toBeInTheDocument();
        expect(screen.getByText('شامل ۳۰ نور هدیه')).toBeInTheDocument();
        expect(screen.getByTestId('wallet-total')).toHaveTextContent('۵۰ نور');
        expect(screen.queryByTestId('wallet-gift')).not.toBeInTheDocument();

        const links = screen.getAllByText('مشاهدهٔ سفارش');
        expect(links).toHaveLength(1);
        expect(links[0]).toHaveAttribute(
            'href', '/profile/orders/cart%3A11111111-1111-1111-1111-111111111111');

        expect(syncByeMoneyUser).toHaveBeenCalledWith('user-jwt');
        expect(getWalletTransactionsWithByeMoney).toHaveBeenCalledWith({ jwt: 'user-jwt', page: 1, pageSize: 20 });
    });

    it('shows gift balance separately when present', async () => {
        getWalletBalanceWithByeMoney.mockResolvedValue({ success: true, balance: 80, giftBalance: 20 });
        getWalletTransactionsWithByeMoney.mockResolvedValue({
            success: true, items: [topUp], page: 1, pageSize: 20, totalCount: 1,
        });

        render(<WalletHistory />);

        expect(await screen.findByTestId('wallet-gift')).toHaveTextContent('۲۰ نور');
    });

    it('shows empty state', async () => {
        getWalletTransactionsWithByeMoney.mockResolvedValue({
            success: true, items: [], page: 1, pageSize: 20, totalCount: 0,
        });

        render(<WalletHistory />);

        expect(await screen.findByText('هنوز تراکنشی در کیف پول شما ثبت نشده است.')).toBeInTheDocument();
    });

    it('shows error state', async () => {
        getWalletTransactionsWithByeMoney.mockResolvedValue({
            success: false, items: [], totalCount: 0, error: 'خطای آزمایشی',
        });

        render(<WalletHistory />);

        expect(await screen.findByRole('alert')).toHaveTextContent('خطای آزمایشی');
    });

    it('requests the next page', async () => {
        getWalletTransactionsWithByeMoney.mockResolvedValue({
            success: true, items: [topUp], page: 1, pageSize: 20, totalCount: 45,
        });

        render(<WalletHistory />);

        fireEvent.click(await screen.findByText('بعدی'));

        await waitFor(() => expect(getWalletTransactionsWithByeMoney)
            .toHaveBeenLastCalledWith({ jwt: 'user-jwt', page: 2, pageSize: 20 }));
    });

    it('does not call ByeMoney without a session token', () => {
        useSession.mockReturnValue({ status: 'unauthenticated', data: null });

        render(<WalletHistory />);

        expect(getWalletTransactionsWithByeMoney).not.toHaveBeenCalled();
    });
});
