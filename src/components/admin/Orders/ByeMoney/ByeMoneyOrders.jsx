'use client';

/**
 * @file src/components/admin/Orders/ByeMoney/ByeMoneyOrders.jsx
 * @description صفحهٔ «سفارش‌ها»: فقط سفارش‌های بای‌مانی (ADMIN-ORDERS-REDESIGN)
 *
 * - تب‌ها: نیاز به اقدام / همه / پرداخت‌شده / در انتظار / ناموفق، با شمارنده
 * - تب، جستجو، فیلتر «موجودی برنگشته» و سفارش باز در query string (?tab&q&view&order) تا رفرش،
 *   دکمهٔ بازگشت و اشتراک لینک کار کنند. آدرس با history.pushState عوض می‌شود (بدون رندر دوبارهٔ سرور).
 * - جدول شش‌ستونه و جزئیات در کشوی کناری (OrderDrawer)
 * - هشدار قطعی بای‌مانی و موجودی برنگشته در یک خط کوتاه بالای جدول؛ پیام‌های موفقیت با toast
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
    Plus, Search, X, ChevronLeft, AlertTriangle, PackageX, CheckCircle2, Inbox, RotateCcw, Info, Filter,
} from 'lucide-react';
import { usePermissions } from '@/context/PermissionsContext';
import { ADMIN_PERMISSIONS } from '@/config/adminPermissions';
import { getFinancialStatusConfig } from '@/lib/admin/orderTracking';
import { getRowShippingBadge, shortOrderNumber, faNumber, splitDateTime } from '@/lib/admin/orderDisplay';
import AdminBadge from '../../Shared/AdminBadge';
import { useAdminToast, AdminToastViewport } from '../../Shared/AdminToast';
import OrderDrawer from '../OrderDrawer/OrderDrawer';
import styles from './ByeMoneyOrders.module.scss';

const PAGE_SIZE = 20;
const DEFAULT_TAB = 'action';

const TABS = [
    { key: 'action', label: 'نیاز به اقدام' },
    { key: 'all', label: 'همه' },
    { key: 'paid', label: 'پرداخت‌شده' },
    { key: 'pending', label: 'در انتظار' },
    { key: 'canceled', label: 'ناموفق' },
];

const TAB_HINTS = {
    action: 'سفارش‌های پرداخت‌شده‌ای که کالای ارسال‌نشده دارند، و سفارش‌هایی که موجودی لغوشان برنگشته.',
    pending: 'در انتظار پرداخت، در حال پردازش و نیازمند بررسی.',
    canceled: 'پرداخت ناموفق یا منقضی.',
};

function readParams(sp) {
    const tab = sp.get('tab');
    return {
        tab: TABS.some((t) => t.key === tab) ? tab : DEFAULT_TAB,
        q: (sp.get('q') || '').trim(),
        view: sp.get('view') === 'restock' ? 'restock' : null,
        order: sp.get('order') || null,
    };
}

/** تغییر query string بدون رندر دوبارهٔ سرور؛ مقادیر پیش‌فرض از آدرس حذف می‌شوند */
function writeParams(patch, { replace = false } = {}) {
    const params = new URLSearchParams(window.location.search);
    Object.entries(patch).forEach(([k, v]) => {
        if (v === null || v === undefined || v === '' || (k === 'tab' && v === DEFAULT_TAB)) params.delete(k);
        else params.set(k, v);
    });
    const qs = params.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
    window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
}

async function fetchOrders({ tab, q, view, start = 0, counts = false }) {
    const params = new URLSearchParams({ tab, start: String(start), limit: String(PAGE_SIZE) });
    if (q) params.set('q', q);
    if (view) params.set('view', view);
    if (counts) params.set('counts', '1');
    const res = await fetch(`/api/admin/course-orders?${params.toString()}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'خطا در دریافت سفارش‌ها');
    return json;
}

// ── اجزای کوچک ────────────────────────────────────────────────────────────

function Amount({ order }) {
    const total = Number(order.totalPrice || 0);
    const refunded = Number(order.refundedAmountInNoor) || 0;
    if (order.totalPrice === null || order.totalPrice === undefined) return <span className={styles.muted}>—</span>;
    if (refunded <= 0) {
        return <span className={styles.amount}>{faNumber(total)} <small>نور</small></span>;
    }
    return (
        <span className={styles.amountStack} title="مبلغ پرداخت‌شده منهای برگشتی لغو کالا">
            <span className={styles.amount} data-testid="order-net-amount">{faNumber(Math.max(0, total - refunded))} <small>نور</small></span>
            <span className={styles.amountRefund} data-testid="order-refunded-amount">
                <s>{faNumber(total)}</s> · برگشتی {faNumber(refunded)}
            </span>
        </span>
    );
}

function DateCell({ value }) {
    const dt = splitDateTime(value);
    if (!dt) return <span className={styles.muted}>—</span>;
    return (
        <span className={styles.date}>
            <span>{dt.date}</span>
            <span className={styles.date__time}>{dt.time}</span>
        </span>
    );
}

function SkeletonRows() {
    return Array.from({ length: 6 }, (_, i) => (
        <tr key={i} className={styles.skeletonRow} aria-hidden="true">
            {Array.from({ length: 6 }, (__, j) => <td key={j}><span /></td>)}
        </tr>
    ));
}

function EmptyState({ tab, q, view, onClearSearch, onClearView }) {
    if (q) {
        return (
            <div className={styles.empty}>
                <Search size={28} aria-hidden="true" />
                <p>سفارشی برای «{q}» پیدا نشد.</p>
                <button type="button" className={styles.ghostBtn} onClick={onClearSearch}>پاک‌کردن جستجو</button>
            </div>
        );
    }
    if (view === 'restock') {
        return (
            <div className={`${styles.empty} ${styles['empty--ok']}`}>
                <CheckCircle2 size={28} aria-hidden="true" />
                <p>سفارشی با موجودی برنگشته نمانده است.</p>
                <button type="button" className={styles.ghostBtn} onClick={onClearView}>بازگشت به فهرست</button>
            </div>
        );
    }
    if (tab === 'action') {
        return (
            <div className={`${styles.empty} ${styles['empty--ok']}`}>
                <CheckCircle2 size={28} aria-hidden="true" />
                <p>همه‌چیز مرتب است؛ سفارشی منتظر اقدام نیست.</p>
            </div>
        );
    }
    return (
        <div className={styles.empty}>
            <Inbox size={28} aria-hidden="true" />
            <p>سفارشی در این بخش نیست.</p>
        </div>
    );
}

// ── کامپوننت اصلی ─────────────────────────────────────────────────────────

/**
 * @param {{ initialData: object, initialKey: string }} props
 *   initialData: خروجی getByeMoneyAdminOrders همراه counts برای همان فیلترهای آدرس
 */
export default function ByeMoneyOrders({ initialData, initialKey }) {
    const searchParams = useSearchParams();
    const { tab, q, view, order: openOrderId } = readParams(searchParams);
    const filterKey = `${tab}|${q}|${view || ''}`;

    const { hasPermission } = usePermissions();
    const canCreateManual = hasPermission(ADMIN_PERMISSIONS.COURSES_MANAGE);
    const { toasts, toast, dismiss } = useAdminToast();

    const [data, setData] = useState(initialData);
    const [counts, setCounts] = useState(initialData.counts || null);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [searchInput, setSearchInput] = useState(q);
    const [clearedRestock, setClearedRestock] = useState(() => new Set());

    const loadedKey = useRef(initialKey);
    const lastQ = useRef(q);
    const drawerDirty = useRef(false);
    const openedByPush = useRef(false);
    const sentinelRef = useRef(null);
    const selectedRowRef = useRef(null);

    // جستجوی آدرس (مثلاً با دکمهٔ بازگشت) با ورودی هماهنگ می‌ماند
    useEffect(() => setSearchInput(q), [q]);

    const reload = useCallback(async ({ silent = false, withCounts = true } = {}) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const json = await fetchOrders({ tab, q, view, counts: withCounts });
            setData(json);
            if (json.counts) setCounts(json.counts);
            loadedKey.current = filterKey;
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [tab, q, view, filterKey]);

    // تغییر فیلتر: شمارنده‌ها فقط وقتی جستجو عوض شده دوباره خوانده می‌شوند
    useEffect(() => {
        if (loadedKey.current === filterKey) return;
        const withCounts = lastQ.current !== q;
        lastQ.current = q;
        reload({ withCounts });
    }, [filterKey, q, reload]);

    const loadMore = useCallback(async () => {
        if (loadingMore || loading || !data.hasMore) return;
        setLoadingMore(true);
        try {
            const json = await fetchOrders({ tab, q, view, start: data.orders.length });
            setData((prev) => {
                const ids = new Set(prev.orders.map((o) => o.orderId));
                return { ...json, orders: [...prev.orders, ...json.orders.filter((o) => !ids.has(o.orderId))] };
            });
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, loading, data, tab, q, view, toast]);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el || !data.hasMore) return undefined;
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) loadMore();
        }, { rootMargin: '240px' });
        observer.observe(el);
        return () => observer.disconnect();
    }, [data.hasMore, loadMore]);

    // ── موجودی برنگشته ────────────────────────────────────────────────────
    const restockSet = useMemo(
        () => new Set((data.restockIds || []).map((id) => String(id).toLowerCase()).filter((id) => !clearedRestock.has(id))),
        [data.restockIds, clearedRestock]
    );
    const isRestock = (orderId) => restockSet.has(String(orderId).toLowerCase());

    // ── کشو ───────────────────────────────────────────────────────────────
    const openRow = useMemo(() => {
        if (!openOrderId) return null;
        return data.orders.find((o) => o.orderId === openOrderId) || { orderId: openOrderId };
    }, [openOrderId, data.orders]);

    const openDrawer = (row) => {
        openedByPush.current = true;
        writeParams({ order: row.orderId });
    };

    const closeDrawer = useCallback(() => {
        if (openedByPush.current) {
            openedByPush.current = false;
            window.history.back();
        } else {
            writeParams({ order: null }, { replace: true });
        }
        if (drawerDirty.current) {
            drawerDirty.current = false;
            reload({ silent: true });
        }
        // فوکوس به ردیفی که کشو را باز کرد برمی‌گردد
        requestAnimationFrame(() => selectedRowRef.current?.focus());
    }, [reload]);

    const shareUrl = openOrderId && typeof window !== 'undefined'
        ? `${window.location.origin}/admin/orders?order=${encodeURIComponent(openOrderId)}`
        : undefined;

    // ── فرمان‌های فیلتر ───────────────────────────────────────────────────
    const setTab = (key) => writeParams({ tab: key, view: null, order: null });
    const submitSearch = (e) => {
        e.preventDefault();
        writeParams({ q: searchInput.trim() || null, order: null });
    };
    const clearSearch = () => {
        setSearchInput('');
        writeParams({ q: null, order: null });
    };
    const showRestock = () => writeParams({ view: 'restock', order: null });
    const clearView = () => writeParams({ view: null, order: null });

    const restockCount = restockSet.size;
    const showAlertLine = data.warning || data.forbidden || data.restockError || (restockCount > 0 && view !== 'restock');

    const rows = data.orders || [];
    const isEmpty = !loading && !error && rows.length === 0;

    return (
        <div className={styles.page}>
            {/* ── سرصفحه ─────────────────────────────────────────────── */}
            <header className={styles.header}>
                <div>
                    <h1 className={styles.header__title}>سفارش‌ها</h1>
                    <p className={styles.header__subtitle}>سفارش‌های پرداخت با نور (بای‌مانی)</p>
                </div>
                {canCreateManual && (
                    <Link href="/admin/orders/new" className={styles.primaryBtn}>
                        <Plus size={16} aria-hidden="true" />
                        ثبت دستی
                    </Link>
                )}
            </header>

            {/* ── خط هشدار ───────────────────────────────────────────── */}
            {showAlertLine && (
                <div className={styles.alertLine} role="status">
                    {data.forbidden && (
                        <span className={`${styles.alertChip} ${styles['alertChip--error']}`}>
                            <AlertTriangle size={14} aria-hidden="true" />
                            مجوز مشاهدهٔ سفارش‌های بای‌مانی (Purchases.View) را ندارید.
                        </span>
                    )}
                    {data.warning && !data.forbidden && (
                        <button type="button" className={`${styles.alertChip} ${styles['alertChip--error']}`} onClick={() => reload()}>
                            <AlertTriangle size={14} aria-hidden="true" />
                            ارتباط با بای‌مانی کامل نبود؛ ممکن است بعضی سفارش‌ها نیامده باشند.
                            <span className={styles.alertChip__cta}>تلاش دوباره</span>
                        </button>
                    )}
                    {restockCount > 0 && view !== 'restock' && (
                        <button type="button" className={`${styles.alertChip} ${styles['alertChip--warning']}`} onClick={showRestock}>
                            <PackageX size={14} aria-hidden="true" />
                            {faNumber(restockCount)} سفارش لغوشده موجودی‌اش برنگشته
                            <span className={styles.alertChip__cta}>نمایش <ChevronLeft size={13} aria-hidden="true" /></span>
                        </button>
                    )}
                    {data.restockError && (
                        <span className={`${styles.alertChip} ${styles['alertChip--muted']}`}>
                            <Info size={14} aria-hidden="true" />
                            وضعیت برگشت موجودی لغوها نامشخص است.
                        </span>
                    )}
                </div>
            )}

            {/* ── نوار ابزار: تب‌ها و جستجو ─────────────────────────────── */}
            <div className={styles.toolbar}>
                <nav className={styles.tabs} role="tablist" aria-label="وضعیت سفارش">
                    {TABS.map(({ key, label }) => {
                        const active = !view && tab === key;
                        const count = counts?.[key];
                        return (
                            <button key={key} type="button" role="tab" aria-selected={active}
                                className={`${styles.tab} ${active ? styles['tab--active'] : ''} ${key === 'action' ? styles['tab--action'] : ''}`}
                                onClick={() => setTab(key)}>
                                {label}
                                {count !== null && count !== undefined && (
                                    <span className={`${styles.tab__count} ${key === 'action' && count > 0 ? styles['tab__count--hot'] : ''}`}>
                                        {faNumber(count)}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                <form className={styles.search} onSubmit={submitSearch} role="search">
                    <Search size={16} className={styles.search__icon} aria-hidden="true" />
                    <input
                        type="search"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="جستجوی خریدار: نام، نام کاربری یا موبایل"
                        aria-label="جستجوی خریدار"
                        className={styles.search__input}
                    />
                    {(searchInput || q) && (
                        <button type="button" className={styles.search__clear} onClick={clearSearch} aria-label="پاک‌کردن جستجو">
                            <X size={14} />
                        </button>
                    )}
                </form>
            </div>

            {/* ── زیرعنوان فیلتر جاری ───────────────────────────────────── */}
            <div className={styles.context}>
                {view === 'restock' ? (
                    <span className={styles.filterChip}>
                        <Filter size={13} aria-hidden="true" />
                        فقط سفارش‌های با موجودی برنگشته
                        <button type="button" onClick={clearView} aria-label="حذف فیلتر"><X size={13} /></button>
                    </span>
                ) : TAB_HINTS[tab] ? (
                    <span className={styles.hint}>{TAB_HINTS[tab]}</span>
                ) : <span />}
                {!loading && !error && (
                    <span className={styles.resultCount}>
                        {data.hasMore
                            ? `${faNumber(rows.length)} از ${faNumber(data.total)} سفارش`
                            : `${faNumber(rows.length)} سفارش`}
                    </span>
                )}
            </div>

            {tab === 'action' && !view && data.truncated && (
                <p className={styles.note}>
                    <Info size={14} aria-hidden="true" />
                    فقط ۱۰۰ سفارش اخیرِ منتظر ارسال بررسی شد؛ سفارش‌های قدیمی‌تر را از تب «پرداخت‌شده» ببینید.
                </p>
            )}

            {/* ── جدول ───────────────────────────────────────────────── */}
            {error ? (
                <div className={styles.errorBox} role="alert">
                    <AlertTriangle size={22} aria-hidden="true" />
                    <p>{error}</p>
                    <button type="button" className={styles.ghostBtn} onClick={() => reload()}>
                        <RotateCcw size={14} aria-hidden="true" /> تلاش دوباره
                    </button>
                </div>
            ) : isEmpty ? (
                <EmptyState tab={tab} q={q} view={view} onClearSearch={clearSearch} onClearView={clearView} />
            ) : (
                <div className={`${styles.tableWrap} ${loading && rows.length ? styles['tableWrap--busy'] : ''}`}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>شماره</th>
                                <th>خریدار</th>
                                <th>وضعیت</th>
                                <th>مبلغ</th>
                                <th>تاریخ</th>
                                <th aria-label="جزئیات" />
                            </tr>
                        </thead>
                        <tbody>
                            {loading && rows.length === 0 ? <SkeletonRows /> : rows.map((o) => {
                                const fin = getFinancialStatusConfig(o.financialStatus);
                                const ship = getRowShippingBadge(o);
                                const restock = isRestock(o.orderId);
                                const selected = openOrderId === o.orderId;
                                return (
                                    <tr
                                        key={o.orderId}
                                        className={`${styles.row} ${selected ? styles['row--selected'] : ''} ${restock ? styles['row--alert'] : ''}`}
                                        tabIndex={0}
                                        ref={selected ? selectedRowRef : undefined}
                                        onClick={(e) => { selectedRowRef.current = e.currentTarget; openDrawer(o); }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                selectedRowRef.current = e.currentTarget;
                                                openDrawer(o);
                                            }
                                        }}
                                        aria-label={`جزئیات سفارش ${shortOrderNumber(o.orderId)}`}
                                    >
                                        <td><span className={styles.orderNo} dir="ltr">#{o.orderNumber}</span></td>
                                        <td>
                                            <span className={styles.buyer}>
                                                <span className={styles.buyer__name}>{o.buyerName || 'نام ثبت نشده'}</span>
                                                {o.buyerPhone && <span className={styles.buyer__phone} dir="ltr">{o.buyerPhone}</span>}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={styles.badges}>
                                                <AdminBadge text={fin.label} variant={fin.variant} />
                                                {ship && <AdminBadge text={ship.label} variant={ship.variant} />}
                                                {restock && <AdminBadge text="موجودی برنگشته" variant="warning" />}
                                            </span>
                                        </td>
                                        <td><Amount order={o} /></td>
                                        <td><DateCell value={o.createdAt} /></td>
                                        <td className={styles.chevronCell}><ChevronLeft size={18} aria-hidden="true" /></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── بارگذاری بیشتر ───────────────────────────────────────── */}
            {data.hasMore && !error && (
                <div className={styles.more} ref={sentinelRef}>
                    <button type="button" className={styles.ghostBtn} onClick={loadMore} disabled={loadingMore}>
                        {loadingMore ? 'در حال بارگذاری…' : 'نمایش سفارش‌های بیشتر'}
                    </button>
                </div>
            )}

            {openRow && (
                <OrderDrawer
                    order={openRow}
                    restockPending={isRestock(openRow.orderId)}
                    shareUrl={shareUrl}
                    onClose={closeDrawer}
                    onToast={toast}
                    onChanged={() => { drawerDirty.current = true; }}
                    onRestockCleared={() => {
                        drawerDirty.current = true;
                        setClearedRestock((prev) => new Set(prev).add(String(openRow.orderId).toLowerCase()));
                    }}
                />
            )}

            <AdminToastViewport toasts={toasts} onDismiss={dismiss} />
        </div>
    );
}
