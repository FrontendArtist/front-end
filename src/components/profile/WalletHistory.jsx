'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { getWalletBalanceWithByeMoney, getWalletTransactionsWithByeMoney } from '@/lib/byeMoneyApi';
import { syncByeMoneyUser } from '@/lib/byeMoneySync';
import styles from './WalletHistory.module.scss';

const PAGE_SIZE = 20;

const TYPE_LABELS = {
    TopUp: 'شارژ کیف پول',
    Purchase: 'خرید',
    Refund: 'برگشت وجه سفارش',
    AdminGrant: 'نور هدیه',
    WelcomeGift: 'هدیهٔ خوش‌آمد',
    Withdrawal: 'خروج نور',
    WithdrawalReversal: 'جبران خروج نور',
};

export function formatNoor(value) {
    return Math.abs(Number(value || 0)).toLocaleString('fa-IR', { maximumFractionDigits: 4 });
}

export function formatDate(value) {
    if (!value) return '';
    // زمان بای‌مانی UTC است؛ اگر منطقهٔ زمانی در رشته نبود، UTC فرض می‌شود.
    const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
    const date = new Date(hasZone ? value : `${value}Z`);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function WalletHistory() {
    const { data: session, status } = useSession();
    const jwt = status === 'authenticated' ? session?.user?.jwt : null;

    const [page, setPage] = useState(1);
    const [balance, setBalance] = useState(null);
    const [result, setResult] = useState({ items: [], totalCount: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async (targetPage) => {
        if (!jwt) return;
        setIsLoading(true);
        setError('');
        try {
            // کاربر تازه باید پیش از پرسش کیف پول در بای‌مانی ساخته شده باشد.
            await syncByeMoneyUser(jwt);
            const [balanceRes, txRes] = await Promise.all([
                getWalletBalanceWithByeMoney({ jwt }),
                getWalletTransactionsWithByeMoney({ jwt, page: targetPage, pageSize: PAGE_SIZE }),
            ]);

            if (balanceRes.success) {
                setBalance({ total: balanceRes.balance, gift: balanceRes.giftBalance ?? 0 });
            }

            if (txRes.success) {
                setResult({ items: txRes.items, totalCount: txRes.totalCount });
            } else {
                setError(txRes.error || 'دریافت گردش کیف پول ناموفق بود.');
            }
        } catch {
            setError('دریافت گردش کیف پول ناموفق بود.');
        } finally {
            setIsLoading(false);
        }
    }, [jwt]);

    useEffect(() => {
        load(page);
    }, [load, page]);

    const totalPages = Math.max(1, Math.ceil(result.totalCount / PAGE_SIZE));

    return (
        <div className={styles.wallet}>
            <h2 className={styles.wallet__title}>کیف پول</h2>

            <div className={styles.wallet__balance}>
                <div>
                    <span className={styles.wallet__balanceLabel}>موجودی کل</span>
                    <strong data-testid="wallet-total">{balance ? `${formatNoor(balance.total)} نور` : '—'}</strong>
                </div>
                {balance && balance.gift > 0 && (
                    <div>
                        <span className={styles.wallet__balanceLabel}>از این مقدار نور هدیه</span>
                        <strong data-testid="wallet-gift">{`${formatNoor(balance.gift)} نور`}</strong>
                        <small className={styles.wallet__hint}>نور هدیه فقط برای خرید قابل استفاده است.</small>
                    </div>
                )}
            </div>

            <h3 className={styles.wallet__sectionTitle}>گردش حساب</h3>

            {isLoading ? (
                <div className={styles.wallet__loading}>در حال بارگذاری…</div>
            ) : error ? (
                <div className={styles.wallet__error} role="alert">{error}</div>
            ) : result.items.length === 0 ? (
                <div className={styles.wallet__empty}>هنوز تراکنشی در کیف پول شما ثبت نشده است.</div>
            ) : (
                <>
                    <ul className={styles.wallet__list}>
                        {result.items.map(item => {
                            const amount = Number(item.amountNoor || 0);
                            const gift = Number(item.giftAmountNoor || 0);
                            const isCredit = amount > 0;
                            return (
                                <li key={item.transactionId} className={styles.wallet__row}>
                                    <div className={styles.wallet__rowInfo}>
                                        <span className={styles.wallet__type}>{TYPE_LABELS[item.type] || 'تراکنش'}</span>
                                        <span className={styles.wallet__date}>{formatDate(item.createdAtUtc)}</span>
                                        {item.orderId && (
                                            <Link
                                                href={`/profile/orders/${encodeURIComponent(item.orderId)}`}
                                                className={styles.wallet__link}
                                            >
                                                مشاهدهٔ سفارش
                                            </Link>
                                        )}
                                    </div>
                                    <div className={styles.wallet__amountBox}>
                                        <span
                                            className={isCredit ? styles.wallet__credit : styles.wallet__debit}
                                            dir="ltr"
                                        >
                                            {`${isCredit ? '+' : '−'}${formatNoor(amount)}`}
                                        </span>
                                        <span className={styles.wallet__unit}>نور</span>
                                        {gift !== 0 && (
                                            <small className={styles.wallet__hint}>
                                                {`شامل ${formatNoor(gift)} نور هدیه`}
                                            </small>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>

                    {totalPages > 1 && (
                        <div className={styles.wallet__pager}>
                            <button type="button" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
                                قبلی
                            </button>
                            <span>{`صفحهٔ ${page.toLocaleString('fa-IR')} از ${totalPages.toLocaleString('fa-IR')}`}</span>
                            <button type="button" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                                بعدی
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
