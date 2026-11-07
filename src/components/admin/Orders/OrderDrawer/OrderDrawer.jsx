'use client';

/**
 * @file src/components/admin/Orders/OrderDrawer/OrderDrawer.jsx
 * @description کشوی جزئیات سفارش بای‌مانی با سه تب: خلاصه / اقلام و ارسال / خط زمانی (ADMIN-ORDERS-REDESIGN)
 *
 * داده و کامپوننت‌های عملیاتی همان پنل قبلی‌اند (useOrderTracking، OrderItemsList با کنترل ارسال و لغو کالا،
 * PendingRestockNotice و Timeline)؛ اینجا فقط چیدمان عوض شده و تکرارها حذف شده‌اند:
 * شناسهٔ کامل فقط با دکمهٔ کپی، و وضعیت ارسال فقط یک‌بار در سرصفحه (از روی اقلام).
 * فقط‌مشاهده است جز وضعیت ارسال و لغو کالا (TASK-ADMIN-ORDER-OPS-REVIEW).
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    X, Copy, Link2, RefreshCw, User, Phone, Receipt, Package, History, MapPin, AlertTriangle, ChevronLeft,
} from 'lucide-react';
import {
    useOrderTracking, OrderItemsList, OrderWarnings, Timeline, formatTime,
} from '../ByeMoneyOrderPanel';
import PendingRestockNotice from '../PendingRestockNotice';
import AdminBadge from '../../Shared/AdminBadge';
import { canShowReceipt, getFinancialStatusConfig } from '@/lib/admin/orderTracking';
import { shortOrderNumber, getItemsShippingState } from '@/lib/admin/orderDisplay';
import styles from './OrderDrawer.module.scss';

const fa = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('fa-IR'));

const SOURCE_LABELS = {
    Cart: 'سبد خرید',
    TopUpCheckout: 'شارژ و خرید',
    DirectPurchase: 'خرید مستقیم',
    Purchase: 'خرید مستقیم',
};

const TABS = [
    { key: 'summary', label: 'خلاصه', icon: Receipt },
    { key: 'items', label: 'اقلام و ارسال', icon: Package },
    { key: 'timeline', label: 'خط زمانی', icon: History },
];

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(String(text));
        return true;
    } catch {
        return false;
    }
}

function Field({ label, children, ltr = false }) {
    return (
        <div className={styles.field}>
            <dt>{label}</dt>
            <dd dir={ltr ? 'ltr' : undefined}>{children}</dd>
        </div>
    );
}

function AmountRow({ label, value, tone }) {
    return (
        <div className={`${styles.amounts__row} ${tone ? styles[`amounts__row--${tone}`] : ''}`}>
            <span>{label}</span>
            <span className={styles.amounts__value}>{value}</span>
        </div>
    );
}

function SummaryTab({ order, data, isPaid, restockPending, onGoItems }) {
    const { order: detail, receipt, buyer } = data;
    const summary = receipt?.cartSummary;
    const discount = (summary?.itemDiscountInNoor || 0) + (summary?.couponDiscountInNoor || 0);
    const refunded = (detail.items || []).reduce(
        (s, i) => s + (Number(i.refundedRegularInNoor) || 0) + (Number(i.refundedGiftInNoor) || 0),
        0
    );
    const paid = isPaid && receipt ? receipt.finalAmountInNoor : detail.finalAmountInNoor;
    const buyerName = order.buyerName || buyer?.displayName || 'نام ثبت نشده';

    return (
        <div className={styles.stack}>
            {restockPending && (
                <button type="button" className={styles.inlineAlert} onClick={onGoItems}>
                    <AlertTriangle size={16} aria-hidden="true" />
                    <span>موجودی لغو این سفارش برنگشته و نیاز به اصلاح دستی دارد.</span>
                    <span className={styles.inlineAlert__cta}>
                        مشاهده <ChevronLeft size={14} aria-hidden="true" />
                    </span>
                </button>
            )}

            <section className={styles.card} aria-label="خریدار">
                <div className={styles.buyer}>
                    <span className={styles.buyer__avatar} aria-hidden="true"><User size={18} /></span>
                    <div className={styles.buyer__info}>
                        <strong>{buyerName}</strong>
                        {order.buyerPhone && (
                            <span className={styles.buyer__phone} dir="ltr">
                                <Phone size={12} aria-hidden="true" /> {order.buyerPhone}
                            </span>
                        )}
                    </div>
                </div>
            </section>

            <section className={styles.card} aria-label="مشخصات سفارش">
                <dl className={styles.fields}>
                    <Field label="تاریخ ثبت">{formatTime(detail.createdAtUtc)}</Field>
                    {isPaid && receipt?.purchasedAtUtc && <Field label="زمان پرداخت">{formatTime(receipt.purchasedAtUtc)}</Field>}
                    <Field label="نوع">{SOURCE_LABELS[detail.sourceType] || detail.sourceType || '—'}</Field>
                    <Field label="تعداد اقلام">{fa(detail.items?.length ?? detail.itemCount)}</Field>
                    {receipt?.couponCode && <Field label="کد تخفیف" ltr>{receipt.couponCode}</Field>}
                </dl>
            </section>

            <section className={styles.card} aria-label="مبلغ">
                <h3 className={styles.card__title}>مبلغ</h3>
                <div className={styles.amounts} data-testid="order-receipt">
                    {summary && <AmountRow label="جمع قیمت اقلام" value={`${fa(summary.originalTotalInNoor)} نور`} />}
                    {discount > 0 && <AmountRow label="تخفیف" value={`− ${fa(discount)} نور`} tone="muted" />}
                    {summary?.shippingAmountInNoor > 0 && <AmountRow label="هزینهٔ ارسال" value={`${fa(summary.shippingAmountInNoor)} نور`} />}
                    <AmountRow label={isPaid ? 'مبلغ پرداختی' : 'مبلغ نهایی'} value={`${fa(paid)} نور`} tone="strong" />
                    {refunded > 0 && (
                        <>
                            <AmountRow label="برگشتی به نور (لغو کالا)" value={`− ${fa(refunded)} نور`} tone="refund" />
                            <AmountRow label="خالص" value={`${fa(Math.max(0, Number(paid || 0) - refunded))} نور`} tone="net" />
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}

function ItemsTab({ data, isPaid, onReload, onItemStatus, onRestockCleared }) {
    const { order: detail, shippingAddress } = data;
    return (
        <div className={styles.stack}>
            {detail.cartId && (
                <PendingRestockNotice cartId={detail.cartId} items={detail.items} onCleared={onRestockCleared} />
            )}
            <OrderItemsList detail={detail} isPaid={isPaid} onReload={onReload} onItemStatus={onItemStatus} />
            {shippingAddress && (
                <section className={styles.card} data-testid="shipping-address" aria-label="آدرس تحویل">
                    <h3 className={styles.card__title}><MapPin size={15} aria-hidden="true" /> آدرس تحویل</h3>
                    <p className={styles.address__who}>
                        {shippingAddress.recipientName}
                        {shippingAddress.recipientPhone && <span dir="ltr"> · {shippingAddress.recipientPhone}</span>}
                    </p>
                    <p className={styles.address__line}>
                        {[shippingAddress.province, shippingAddress.city, shippingAddress.fullAddress].filter(Boolean).join('، ')}
                    </p>
                    {shippingAddress.postalCode && (
                        <p className={styles.address__postal}>کد پستی: <span dir="ltr">{shippingAddress.postalCode}</span></p>
                    )}
                </section>
            )}
        </div>
    );
}

function DrawerSkeleton() {
    return (
        <div className={styles.skeleton} aria-busy="true" aria-label="در حال دریافت جزئیات سفارش">
            <span /><span /><span className={styles['skeleton--short']} /><span />
        </div>
    );
}

/**
 * @param {{ order: { orderId: string, buyerName?: string, buyerPhone?: string, financialStatus?: string },
 *   restockPending?: boolean, onClose: () => void, onToast?: (msg: string, tone?: string) => void,
 *   onChanged?: () => void, onRestockCleared?: () => void, shareUrl?: string }} props
 */
export default function OrderDrawer({ order, restockPending = false, onClose, onToast, onChanged, onRestockCleared, shareUrl }) {
    const [tab, setTab] = useState('summary');
    const [mounted, setMounted] = useState(false);
    const closeRef = useRef(null);
    const { state, reload, setItemDeliveryStatus } = useOrderTracking(order);
    const notify = (msg, tone) => onToast && onToast(msg, tone);

    useEffect(() => setMounted(true), []);

    // Esc بستن، قفل اسکرول صفحه و فوکوس روی دکمهٔ بستن
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    // سفارش دیگری باز شد: از تب خلاصه شروع شود
    useEffect(() => setTab('summary'), [order.orderId]);

    const data = state.data;
    const detail = data?.order;
    const isPaid = canShowReceipt(detail);
    const fin = getFinancialStatusConfig(detail?.financialStatus || order.financialStatus);
    const shipping = detail ? getItemsShippingState(detail.items) : null;

    const handleItemStatus = (purchaseId, status) => {
        setItemDeliveryStatus(purchaseId, status);
        onChanged && onChanged();
    };
    const handleReload = () => {
        reload();
        onChanged && onChanged();
    };

    if (!mounted) return null;

    return createPortal(
        <div className={styles.backdrop} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="order-drawer-title">
                <header className={styles.header}>
                    <div className={styles.header__top}>
                        <div className={styles.header__titles}>
                            <span className={styles.header__eyebrow}>جزئیات سفارش</span>
                            <h2 id="order-drawer-title" className={styles.header__title} dir="ltr">
                                #{shortOrderNumber(order.orderId)}
                            </h2>
                        </div>
                        <div className={styles.header__actions}>
                            <button type="button" className={styles.iconBtn} title="کپی شناسهٔ کامل" aria-label="کپی شناسهٔ کامل"
                                onClick={async () => notify((await copyText(order.orderId)) ? 'شناسهٔ سفارش کپی شد.' : 'کپی ناموفق بود.', 'success')}>
                                <Copy size={16} />
                            </button>
                            {shareUrl && (
                                <button type="button" className={styles.iconBtn} title="کپی لینک این سفارش" aria-label="کپی لینک این سفارش"
                                    onClick={async () => notify((await copyText(shareUrl)) ? 'لینک سفارش کپی شد.' : 'کپی ناموفق بود.', 'success')}>
                                    <Link2 size={16} />
                                </button>
                            )}
                            <button type="button" className={styles.iconBtn} title="دریافت دوباره از سرور" aria-label="تازه‌سازی"
                                onClick={reload} disabled={state.loading}>
                                <RefreshCw size={16} className={state.loading ? styles.spin : undefined} />
                            </button>
                            <button type="button" ref={closeRef} className={`${styles.iconBtn} ${styles['iconBtn--close']}`}
                                onClick={onClose} aria-label="بستن جزئیات">
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                    <div className={styles.header__badges}>
                        <AdminBadge text={fin.label} variant={fin.variant} />
                        {shipping && <AdminBadge text={shipping.label} variant={shipping.variant} />}
                        {restockPending && <AdminBadge text="موجودی برنگشته" variant="warning" />}
                    </div>

                    <nav className={styles.tabs} role="tablist" aria-label="بخش‌های جزئیات سفارش">
                        {TABS.map(({ key, label, icon: Icon }) => {
                            const count = key === 'items' ? detail?.items?.length : key === 'timeline' ? data?.timeline?.length : null;
                            return (
                                <button key={key} type="button" role="tab" aria-selected={tab === key}
                                    className={`${styles.tab} ${tab === key ? styles['tab--active'] : ''}`}
                                    onClick={() => setTab(key)}>
                                    <Icon size={15} aria-hidden="true" />
                                    <span>{label}</span>
                                    {count > 0 && <span className={styles.tab__count}>{fa(count)}</span>}
                                </button>
                            );
                        })}
                    </nav>
                </header>

                <div className={styles.body} role="tabpanel">
                    {state.loading && <DrawerSkeleton />}

                    {!state.loading && (state.error || !data) && (
                        <div className={styles.errorBox} role="alert">
                            <AlertTriangle size={20} aria-hidden="true" />
                            <p>{state.error || 'جزئیات سفارش در دسترس نیست.'}</p>
                            <button type="button" className={styles.retryBtn} onClick={reload}>تلاش مجدد</button>
                        </div>
                    )}

                    {!state.loading && data && (
                        <>
                            <OrderWarnings warnings={data.warnings} />
                            {tab === 'summary' && (
                                <SummaryTab order={order} data={data} isPaid={isPaid} restockPending={restockPending}
                                    onGoItems={() => setTab('items')} />
                            )}
                            {tab === 'items' && (
                                <ItemsTab data={data} isPaid={isPaid} onReload={() => { handleReload(); notify('لغو کالا ثبت شد.'); }}
                                    onItemStatus={handleItemStatus}
                                    onRestockCleared={() => { onRestockCleared && onRestockCleared(); notify('برگشت موجودی ثبت شد.'); }} />
                            )}
                            {tab === 'timeline' && (
                                <div className={styles.card}>
                                    <Timeline events={data.timeline || []} visibleCount={Infinity} />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </aside>
        </div>,
        document.body
    );
}
