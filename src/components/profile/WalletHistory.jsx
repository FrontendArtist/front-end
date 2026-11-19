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

/**
 * ادمین می‌تواند هم نور هدیه و هم نور عادی با همین نوع ثبت کند؛
 * برچسب «هدیه» فقط وقتی درست است که کل مبلغ از سهم هدیه باشد.
 */
export function resolveTypeLabel(item) {
    if (item.type === 'AdminGrant') {
        const amount = Number(item.amountNoor || 0);
        const gift = Number(item.giftAmountNoor || 0);
        return gift !== 0 && gift === amount ? 'نور هدیه' : 'افزایش اعتبار توسط مدیر';
    }
    return TYPE_LABELS[item.type] || 'تراکنش';
}

export default function WalletHistory() {
    const { data: session, status } = useSession();
    const jwt = status === 'authenticated' ? session?.user?.jwt : null;

    const [page, setPage] = useState(1);
    const [balance, setBalance] = useState(null);
    const [balanceFailed, setBalanceFailed] = useState(false);
    const [items, setItems] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
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
                setBalanceFailed(false);
            } else {
                setBalanceFailed(true);
            }

            if (txRes.success) {
                setItems(previous => (targetPage === 1 ? txRes.items : [...previous, ...txRes.items]));
                setTotalCount(txRes.totalCount);
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

    const hasMore = items.length < totalCount;
    const isFirstLoad = isLoading && items.length === 0;

    return (
        <div className={styles.wallet}>
            <h2 className={styles.wallet__title}>کیف پول</h2>

            <section className={styles.wallet__balance} aria-label="موجودی کیف پول">
                <span className={styles.wallet__balanceLabel}>موجودی فعلی</span>
                {balance ? (
                    <>
                        <strong className={styles.wallet__balanceValue} data-testid="wallet-total">
                            {formatNoor(balance.total)}
                            <span className={styles.wallet__unit}> نور</span>
                        </strong>
                        {balance.gift > 0 && (
                            <span className={styles.wallet__hint} data-testid="wallet-gift">
                                {`شامل ${formatNoor(balance.gift)} نور هدیه (فقط برای خرید)`}
                            </span>
                        )}
                    </>
                ) : balanceFailed ? (
                    <span className={styles.wallet__balanceError} role="status">
                        موجودی در دسترس نیست؛ صفحه را دوباره بارگذاری کنید.
                    </span>
                ) : (
                    <strong className={styles.wallet__balanceValue} data-testid="wallet-total">—</strong>
                )}
            </section>

            <h3 className={styles.wallet__sectionTitle}>گردش حساب</h3>

            {isFirstLoad ? (
                <div className={styles.wallet__loading}>در حال بارگذاری…</div>
            ) : error && items.length === 0 ? (
                <div className={styles.wallet__error} role="alert">{error}</div>
            ) : items.length === 0 ? (
                <div className={styles.wallet__empty}>هنوز تراکنشی در کیف پول شما ثبت نشده است.</div>
            ) : (
                <>
                    <ul className={styles.wallet__list}>
                        {items.map(item => {
                            const amount = Number(item.amountNoor || 0);
                            const gift = Number(item.giftAmountNoor || 0);
                            const isCredit = amount > 0;
                            return (
                                <li key={item.transactionId} className={styles.wallet__row}>
                                    <span
                                        className={`${styles.wallet__icon} ${isCredit ? styles.wallet__iconCredit : styles.wallet__iconDebit}`}
                                        aria-hidden="true"
                                    >
                                        {isCredit ? '↓' : '↑'}
                                    </span>
                                    <div className={styles.wallet__rowInfo}>
                                        <span className={styles.wallet__type}>{resolveTypeLabel(item)}</span>
                                        <span className={styles.wallet__meta}>
                                            {formatDate(item.createdAtUtc)}
                                            {gift !== 0 && gift !== amount && ` · شامل ${formatNoor(gift)} نور هدیه`}
                                            {item.orderId && (
                                                <>
                                                    {' · '}
                                                    <Link
                                                        href={`/profile/orders/${encodeURIComponent(item.orderId)}`}
                                                        className={styles.wallet__link}
                                                    >
                                                        مشاهدهٔ سفارش
                                                    </Link>
                                                </>
                                            )}
                                        </span>
                                    </div>
                                    <span className={`${styles.wallet__amount} ${isCredit ? styles.wallet__credit : styles.wallet__debit}`}>
                                        <span dir="ltr">{`${isCredit ? '+' : '−'}${formatNoor(amount)}`}</span>
                                        <span className={styles.wallet__unit}>نور</span>
                                    </span>
                                </li>
                            );
                        })}
                    </ul>

                    {error && <div className={styles.wallet__error} role="alert">{error}</div>}

                    {hasMore && (
                        <div className={styles.wallet__more}>
                            <button type="button" onClick={() => setPage(p => p + 1)} disabled={isLoading}>
                                {isLoading ? 'در حال بارگذاری…' : 'نمایش بیشتر'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
