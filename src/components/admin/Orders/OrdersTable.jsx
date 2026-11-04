'use client';

/**
 * @file src/components/admin/Orders/OrdersTable.jsx
 * @description جدول سفارش‌ها – Client Component
 *
 * 🎯 مسئولیت‌ها:
 *   - نمایش جدول سفارش‌ها با ستون‌های: شناسه، کاربر، روش پرداخت، وضعیت سفارش، مبلغ، تاریخ، عملیات.
 *   - ردیف کشویی (Expandable Row) برای هر سفارش با تمام جزئیات خریدار و اقلام و لینک مشاهده رسید.
 *   - مدیریت state محلی برای آپدیت optimistic (بدون reload صفحه).
 *   - کنترل باز/بسته شدن مودال‌های ReceiptModal و StatusUpdateModal.
 *
 * @param {{ initialOrders: object[], initialMeta: object }} props
 */

import { useState, useMemo, useRef, useEffect, useCallback, Fragment } from 'react';
import { ArrowUpDown, RotateCcw, Folder, CreditCard, CheckCircle2, ArrowLeft, Trash2, ChevronDown, AlertTriangle } from 'lucide-react';
import ReceiptModal from './ReceiptModal';
import StatusUpdateModal from './StatusUpdateModal';
import SettlementModal from './SettlementModal';
import SettlementArchiveModal from './SettlementArchiveModal';
import BulkDeleteModal from './BulkDeleteModal';
import ByeMoneyOrderPanel from './ByeMoneyOrderPanel';
import { getFinancialStatusConfig } from '@/lib/admin/orderTracking';
import styles from './OrdersTable.module.scss';
import AdminSearch from '../Shared/AdminSearch';
import { AdminTableContainer, AdminTable, AdminToolbar } from '../Shared/AdminTable';
import AdminBadge from '../Shared/AdminBadge';
import AdminButton from '../Shared/AdminButton';
import AdminSelect from '../Shared/AdminSelect';
import AdminLazyLoad from '../Shared/AdminLazyLoad';
import { fetchAdminOrders } from '@/lib/client/admin/ordersClient';

// ── ابزارهای نمایش ──────────────────────────────────────────────────────────

/** برچسب‌های فارسی وضعیت سفارش */
const ORDER_STATUS_CONFIG = {
    'pending': { label: 'در انتظار پرداخت', variant: 'warning' },
    'paid': { label: 'پرداخت شده', variant: 'success' },
    'shipped': { label: 'ارسال شده', variant: 'info' },
    'delivered': { label: 'تحویل شده', variant: 'success' },
    'canceled': { label: 'لغو شده', variant: 'error' },
};

const SOURCE_OPTIONS = [
    { value: 'all', label: 'همه منابع' },
    { value: 'byemoney', label: 'بای‌مانی' },
    { value: 'strapi', label: 'قدیمی (استراپی)' },
];

/** وضعیت ارسال سفارش بای‌مانی در ستون جدول؛ NotStarted یعنی چیزی برای ارسال نیست */
const DELIVERY_COLUMN_CONFIG = {
    Pending: { label: 'در انتظار ارسال', variant: 'warning' },
    PartiallyDelivered: { label: 'تحویل ناقص', variant: 'info' },
    Delivered: { label: 'تحویل شده', variant: 'success' },
};

/** برچسب‌های روش پرداخت */
const PAYMENT_METHOD_LABELS = {
    card_to_card: 'کارت‌به‌کارت',
    online: 'آنلاین',
    free: 'رایگان',
    cash: 'نقدی',
    noor: 'نور (بای‌مانی)',
};

/** برچسب‌های نوع قلم */
const ITEM_TYPE_LABELS = {
    'order.course-order-item': { icon: '🎓', label: 'دوره / فصل آموزشی' },
    'order.product-order-item': { icon: '📦', label: 'محصول فیزیکی' },
};

const formatPrice = (p) =>
    p !== undefined && p !== null
        ? new Intl.NumberFormat('fa-IR').format(Number(p)) + ' تومان'
        : '—';

const formatPriceRaw = (p) =>
    p !== undefined && p !== null
        ? new Intl.NumberFormat('fa-IR').format(Number(p))
        : '۰';

const formatDate = (d) => {
    if (!d) return '—';
    try {
        return new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(d));
    } catch {
        return '—';
    }
};

const formatDateShort = (d) => {
    if (!d) return '—';
    try {
        return new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(new Date(d));
    } catch {
        return '—';
    }
};

/**
 * تابع کمکی برای نمایش هوشمند نام خریدار:
 * اگر fullName نام پیش‌فرض مثل «کاربر (...)» باشد، از نام صاحب کارت یا نام واقعی کاربر استفاده می‌شود.
 */
function getBuyerDisplayName(order) {
    if (!order) return '—';
    const isGeneric = (str) => {
        if (!str || typeof str !== 'string') return true;
        const s = str.trim();
        return s.startsWith('کاربر (') || s === 'کاربر فروشگاه' || /^\d+$/.test(s);
    };

    if (order.fullName && !isGeneric(order.fullName)) {
        return order.fullName;
    }
    if (order.cardHolderName && !isGeneric(order.cardHolderName)) {
        return order.cardHolderName;
    }
    if (order.user?.username && !isGeneric(order.user.username)) {
        return order.user.username;
    }
    return order.fullName || order.user?.username || '—';
}

// ── توابع کمکی برای تشخیص وضعیت سفارش ───────────────────────────────────────
const isWaitingReceipt = (o) =>
    (o.paymentMethod === 'card_to_card' && o.paymentStatus === 'pending_verification') ||
    (Boolean(o.receiptImageUrl) && o.orderStatus === 'pending');

const isPendingNoReceipt = (o) =>
    o.orderStatus === 'pending' && !o.receiptImageUrl && o.paymentStatus !== 'pending_verification';

const isPaidOrder = (o) =>
    ['paid', 'shipped', 'delivered'].includes(o.orderStatus) || o.paymentStatus === 'paid';

const isCanceledOrder = (o) =>
    o.orderStatus === 'canceled';

/**
 * دکمه کپی متن با فیدبک بصری
 */
function CopyButton({ text, label = 'کپی' }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e) => {
        e.stopPropagation();
        if (!text) return;
        try {
            navigator.clipboard.writeText(String(text));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
        }
    };

    return (
        <button
            type="button"
            className={`${styles.copyBtn} ${copied ? styles.copyBtnSuccess : ''}`}
            onClick={handleCopy}
            title={copied ? 'کپی شد!' : `کپی ${label}`}
        >
            {copied ? '✓ کپی شد' : 'کپی'}
        </button>
    );
}

/**
 * OrderExpandedRow – ردیف کشویی با جزئیات کامل و غیرتکراری سفارش
 */
function OrderExpandedRow({ order, colSpan, onOpenReceipt, onOpenStatus, onAttemptSummary, onPhysicalCancelled }) {
    const isPaid = isPaidOrder(order);
    const isCanceled = isCanceledOrder(order);
    const isByeMoney = Boolean(order.isByeMoney || order.source === 'byemoney');

    // تشخیص وجود محصول فیزیکی در سبد خرید (دوره‌ها و شارژ نور نیاز به آدرس ارسال ندارند)
    const hasPhysicalProduct = Boolean(
        order.items &&
        Array.isArray(order.items) &&
        order.items.some((item) => {
            if (item.slug === 'light-topup' || item.type === 'light_topup') return false;
            if (item.__component === 'order.product-order-item') return true;
            if (item.productId && Number(item.productId) > 0 && !item.courseId && !item.chapterId) return true;
            if (item.type === 'product') return true;
            return false;
        })
    );

    return (
        <tr className={styles.expanded_row}>
            <td colSpan={colSpan} className={styles.expanded_cell}>
                <div className={styles.expanded_content}>

                    {isByeMoney ? (
                        <ByeMoneyOrderPanel order={order} onSummary={onAttemptSummary} onPhysicalCancelled={onPhysicalCancelled} />
                    ) : (
                        <>
                            <div className={styles.expanded_section} style={{ gridColumn: '1 / -1', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span className={styles.expanded_field__label}>مدیریت سفارش</span>
                                <AdminButton variant="default" onClick={() => onOpenStatus && onOpenStatus(order)} title="تغییر وضعیت سفارش">
                                    تغییر وضعیت
                                </AdminButton>
                            </div>
                            {/* ── سفارش‌های سنتی استراپی: جزئیات پرداخت ── */}
                            <div className={`${styles.expanded_section} ${styles.expanded_section_online}`}>
                                <h4 className={styles.expanded_section__title}>
                                    💳 جزئیات پرداخت
                                </h4>
                                <div className={styles.onlinePayDetails}>
                                    <div className={styles.onlinePayStatusRow}>
                                        <span className={styles.expanded_field__label}>نتیجه تراکنش:</span>
                                        {isPaid ? (
                                            <span className={styles.onlinePayBadgeSuccess}>
                                                ✅ پرداخت موفق و تایید شده
                                            </span>
                                        ) : isCanceled ? (
                                            <span className={styles.onlinePayBadgeFailed}>
                                                ❌ سفارش لغو شده
                                            </span>
                                        ) : isWaitingReceipt(order) ? (
                                            <span className={styles.onlinePayBadgePending}>
                                                ⏳ در انتظار تایید فیش
                                            </span>
                                        ) : (
                                            <span className={styles.onlinePayBadgePending}>
                                                ⏳ در انتظار پرداخت
                                            </span>
                                        )}
                                    </div>

                                    {order.paymentMethod === 'online' && (
                                        <>
                                            {order.securePan && (
                                                <div className={styles.expanded_field}>
                                                    <span className={styles.expanded_field__label}>شماره کارت واریزکننده</span>
                                                    <span className={styles.expanded_field__value} dir="ltr">
                                                        💳 {order.securePan}
                                                    </span>
                                                </div>
                                            )}

                                            {order.refNum && (
                                                <div className={styles.expanded_field}>
                                                    <span className={styles.expanded_field__label}>رسید دیجیتال بانک (RefNum)</span>
                                                    <div className={styles.copyableField}>
                                                        <span className={styles.expanded_field__value} dir="ltr">
                                                            {order.refNum}
                                                        </span>
                                                        <CopyButton text={order.refNum} label="رسید دیجیتال" />
                                                    </div>
                                                </div>
                                            )}

                                            {(order.traceNo || order.trackingNumber) && (
                                                <div className={styles.expanded_field}>
                                                    <span className={styles.expanded_field__label}>کد پیگیری تراکنش (TraceNo)</span>
                                                    <div className={styles.copyableField}>
                                                        <span className={styles.expanded_field__value} dir="ltr">
                                                            {order.traceNo || order.trackingNumber}
                                                        </span>
                                                        <CopyButton text={order.traceNo || order.trackingNumber} label="کد پیگیری" />
                                                    </div>
                                                </div>
                                            )}

                                            {order.rrn && (
                                                <div className={styles.expanded_field}>
                                                    <span className={styles.expanded_field__label}>شماره مرجع شاپرک (RRN)</span>
                                                    <span className={styles.expanded_field__value} dir="ltr">{order.rrn}</span>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {order.paymentMethod === 'card_to_card' && (
                                        <>
                                            {order.cardHolderName && (
                                                <div className={styles.expanded_field}>
                                                    <span className={styles.expanded_field__label}>نام صاحب کارت</span>
                                                    <span className={styles.expanded_field__value}>💳 {order.cardHolderName}</span>
                                                </div>
                                            )}
                                            {order.receiptImageUrl && (
                                                <div className={styles.expanded_field}>
                                                    <span className={styles.expanded_field__label}>تصویر فیش</span>
                                                    <span className={styles.expanded_field__value}>
                                                        <button
                                                            type="button"
                                                            className={styles.receipt_link}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (onOpenReceipt) onOpenReceipt(order);
                                                            }}
                                                            title="مشاهده تصویر رسید پرداخت"
                                                        >
                                                            🧾 مشاهده فیش واریز
                                                        </button>
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {order.paymentDate && (
                                        <div className={styles.expanded_field}>
                                            <span className={styles.expanded_field__label}>تاریخ و ساعت پرداخت</span>
                                            <span className={styles.expanded_field__value}>
                                                {formatDate(order.paymentDate)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── آدرس ارسال (فقط برای محصول فیزیکی) ── */}
                            {hasPhysicalProduct && (order.address || order.postalCode) && (
                                <div className={styles.expanded_section}>
                                    <h4 className={styles.expanded_section__title}>📍 آدرس ارسال مرسوله</h4>
                                    <div className={styles.expanded_grid}>
                                        <div className={`${styles.expanded_field} ${styles['expanded_field--full']}`}>
                                            <span className={styles.expanded_field__label}>آدرس کامل</span>
                                            <span className={styles.expanded_field__value}>{order.address || '—'}</span>
                                        </div>
                                        {order.postalCode && order.postalCode !== '0000000000' && (
                                            <div className={styles.expanded_field}>
                                                <span className={styles.expanded_field__label}>کد پستی</span>
                                                <span className={styles.expanded_field__value} dir="ltr">{order.postalCode}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── اقلام سفارش ── */}
                            <div className={styles.expanded_section}>
                                <h4 className={styles.expanded_section__title}>🛒 اقلام سفارش</h4>
                                {order.items && order.items.length > 0 ? (
                                    <div className={styles.items_list}>
                                        {order.items.map((item, idx) => {
                                            const typeConfig = ITEM_TYPE_LABELS[item.__component] || { icon: '📌', label: 'قلم' };
                                            return (
                                                <div key={idx} className={styles.item_card}>
                                                    <div className={styles.item_card__main}>
                                                        <span className={styles.item_card__icon}>{typeConfig.icon}</span>
                                                    <div className={styles.item_card__info}>
                                                        <span className={styles.item_card__title}>{item.title || '—'}</span>
                                                        <span className={styles.item_card__type}>{typeConfig.label}</span>
                                                        {item.chapterId && (
                                                            <span className={styles.item_card__meta}>شناسه فصل: {item.chapterId}</span>
                                                        )}
                                                        {item.quantity && Number(item.quantity) > 1 && (
                                                            <span className={styles.item_card__meta}>تعداد: {item.quantity}</span>
                                                        )}
                                                    </div>
                                                    <span className={styles.item_card__price}>
                                                        {formatPrice(item.price)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div className={styles.items_total}>
                                            <span>جمع کل</span>
                                            <strong>{formatPrice(order.totalPrice)}</strong>
                                        </div>
                                    </div>
                                ) : (
                                    <p className={styles.expanded_empty}>اطلاعات اقلام در دسترس نیست.</p>
                                )}
                            </div>
                        </>
                    )}

                    {/* ── بخش یادداشت: فقط در صورت وجود محتوای واقعی ── */}
                    {order.notes && order.notes.trim() && (
                        <div className={styles.expanded_section}>
                            <h4 className={styles.expanded_section__title}>📝 یادداشت</h4>
                            <div className={styles.expanded_notes_card}>
                                <pre className={styles.expanded_notes__text}>{order.notes}</pre>
                            </div>
                        </div>
                    )}

                </div>
            </td>
        </tr>
    );
}

// ── OrdersTable ──────────────────────────────────────────────────────────────

export default function OrdersTable({
    initialOrders = [],
    initialMeta = null,
    initialStats = null,
    settlementStats = null,
    initialByemoneyWarning = false,
}) {
    // ── State ──────────────────────────────────────────────────────────────────
    const [orders, setOrders] = useState(initialOrders);
    const [receiptModalOrder, setReceiptModal] = useState(null);
    const [statusModalOrder, setStatusModal] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [filterType, setFilterType] = useState('all'); // 'all' | 'pending' | 'paid' | 'online' | 'canceled' | 'expired' | 'review'
    const [sourceFilter, setSourceFilter] = useState('all'); // 'all' | 'byemoney' | 'strapi'
    const [isStatusSorted, setIsStatusSorted] = useState(false); // اولویت‌بندی هوشمند وضعیت در سرور
    const [expandedId, setExpandedId] = useState(null); // شناسه ردیف باز
    const [isInitialLoading, setIsInitialLoading] = useState(false);
    const [byemoneyWarning, setByemoneyWarning] = useState(initialByemoneyWarning);

    // ── Settlement & Bulk Delete State ─────────────────────────────────────────
    const [periodFilter, setPeriodFilter] = useState('current'); // 'current' | 'all'
    const [activeSettlement, setActiveSettlement] = useState(null); // پوشه انتخاب‌شده آرشیو
    const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [bulkDeleteTarget, setBulkDeleteTarget] = useState(null); // null | 'canceled' | 'pending'
    const [settlementSuccessMessage, setSettlementSuccessMessage] = useState(null);
    const [statsInfo, setStatsInfo] = useState(settlementStats);
    const [isSettlementPanelOpen, setIsSettlementPanelOpen] = useState(false); // باز/بسته بودن پنل تسویه

    // ── Pagination & Lazy Loading State ──────────────────────────────────────
    const initialTotal = initialMeta?.pagination?.total ?? (initialOrders?.length || 0);
    const [totalOrders, setTotalOrders] = useState(initialTotal);
    const [hasMore, setHasMore] = useState(
        initialMeta?.pagination
            ? ((initialMeta.pagination.start ?? 0) + (initialMeta.pagination.limit ?? initialOrders.length) < initialMeta.pagination.total) ||
              (initialMeta.pagination.page && initialMeta.pagination.page < initialMeta.pagination.pageCount)
            : initialOrders.length < initialTotal
    );
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const sentinelRef = useRef(null);
    const isFirstMount = useRef(true);



    // ── بارگذاری داده‌ها از سرور هنگام تغییر تب، جستجو، مرتب‌سازی یا دوره تسویه ───
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }

        let isCancelled = false;
        async function reloadOrders() {
            setIsInitialLoading(true);
            setLoadError(null);

            try {
                const data = await fetchAdminOrders({
                    start: 0,
                    limit: 20,
                    status: filterType,
                    statusPriority: isStatusSorted,
                    search: appliedSearch,
                    period: activeSettlement ? undefined : periodFilter,
                    settlementId: activeSettlement ? (activeSettlement.id || activeSettlement.documentId) : undefined,
                    source: sourceFilter,
                });

                if (!isCancelled && data?.orders) {
                    setOrders(data.orders);
                    const newTotal = data.meta?.pagination?.total ?? data.orders.length;
                    setTotalOrders(newTotal);
                    setHasMore(data.orders.length < newTotal);
                    if (typeof data.byemoneyWarning !== 'undefined') {
                        setByemoneyWarning(Boolean(data.byemoneyWarning));
                    }
                }
            } catch (err) {
                if (!isCancelled) {
                    console.error('[OrdersTable] Error fetching orders:', err);
                    setLoadError('خطا در دریافت سفارش‌ها از سرور');
                }
            } finally {
                if (!isCancelled) {
                    setIsInitialLoading(false);
                }
            }
        }

        reloadOrders();
        return () => {
            isCancelled = true;
        };
    }, [filterType, isStatusSorted, appliedSearch, periodFilter, activeSettlement, sourceFilter]);

    // ── متد دریافت صفحات بعدی (Lazy Loading: ۲۰ تا ۲۰ تا) ────────────────────
    const loadMoreOrders = useCallback(async () => {
        if (isLoadingMore || !hasMore || isInitialLoading) return;

        setIsLoadingMore(true);
        setLoadError(null);

        try {
            const data = await fetchAdminOrders({
                start: orders.length,
                limit: 20,
                status: filterType,
                statusPriority: isStatusSorted,
                search: appliedSearch,
                period: activeSettlement ? undefined : periodFilter,
                settlementId: activeSettlement ? (activeSettlement.id || activeSettlement.documentId) : undefined,
                source: sourceFilter,
            });

            if (data?.orders && Array.isArray(data.orders)) {
                setOrders((prev) => {
                    const existingIds = new Set(prev.map((o) => o.id));
                    const newUniqueOrders = data.orders.filter((o) => !existingIds.has(o.id));
                    return [...prev, ...newUniqueOrders];
                });

                const pagination = data.meta?.pagination;
                const newTotal = pagination?.total ?? totalOrders;
                setTotalOrders(newTotal);

                if (typeof data.byemoneyWarning !== 'undefined') {
                    setByemoneyWarning(Boolean(data.byemoneyWarning));
                }

                if (data.orders.length < 20 || orders.length + data.orders.length >= newTotal) {
                    setHasMore(false);
                }
            } else {
                setHasMore(false);
            }
        } catch (err) {
            console.error('[OrdersTable] Error loading more orders:', err);
            setLoadError('خطا در دریافت سفارش‌های بیشتر');
        } finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, hasMore, isInitialLoading, orders.length, totalOrders, filterType, isStatusSorted, appliedSearch, periodFilter, activeSettlement, sourceFilter]);

    // ── اتصال به اسکرول با IntersectionObserver ──────────────────────────────
    useEffect(() => {
        if (!hasMore || isLoadingMore || isInitialLoading) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    loadMoreOrders();
                }
            },
            {
                rootMargin: '250px',
                threshold: 0.1,
            }
        );

        const currentSentinel = sentinelRef.current;
        if (currentSentinel) {
            observer.observe(currentSentinel);
        }

        return () => {
            if (currentSentinel) {
                observer.unobserve(currentSentinel);
            }
        };
    }, [hasMore, isLoadingMore, isInitialLoading, loadMoreOrders]);

    // ── شمارنده‌های آماری برای تب‌های فیلتر ──────────────────────────────────
    const counts = useMemo(() => {
        if (initialStats && periodFilter === 'current' && !activeSettlement) {
            return {
                pending: initialStats.pending ?? 0,
                paid: initialStats.paid ?? 0,
                canceled: initialStats.canceled ?? 0,
                online: initialStats.online ?? orders.filter((o) => o.paymentMethod === 'online').length,
                expired: initialStats.expired ?? 0,
                review: initialStats.review ?? 0,
            };
        }
        return {
            pending: orders.filter((o) => o.orderStatus === 'pending').length,
            paid: orders.filter(isPaidOrder).length,
            canceled: orders.filter(isCanceledOrder).length,
            online: orders.filter((o) => o.paymentMethod === 'online').length,
            expired: orders.filter((o) => o.orderStatus === 'expired').length,
            review: orders.filter((o) => o.orderStatus === 'review').length,
        };
    }, [initialStats, orders, periodFilter, activeSettlement]);

    const statusOptions = useMemo(() => {
        const n = (v) => new Intl.NumberFormat('fa-IR').format(v ?? 0);
        return [
            { value: 'all', label: `همه (${n(totalOrders || orders.length)})` },
            { value: 'pending', label: `در انتظار پرداخت (${n(counts.pending)})` },
            { value: 'paid', label: `پرداخت شده (${n(counts.paid)})` },
            { value: 'online', label: `پرداخت آنلاین (${n(counts.online)})` },
            { value: 'canceled', label: `ناموفق / لغو شده (${n(counts.canceled)})` },
            { value: 'expired', label: `منقضی (${n(counts.expired)})` },
            { value: 'review', label: `نیازمند بررسی (${n(counts.review)})` },
        ];
    }, [counts, totalOrders, orders.length]);

    // حذف گروهی فقط سفارش‌های استرپی را پاک می‌کند؛ شمارندهٔ آن نباید سفارش‌های بای‌مانی را بشمارد
    const bulkDeleteCounts = useMemo(() => {
        const strapiCounts = statsInfo?.strapiStatusCounts;
        if (strapiCounts && periodFilter === 'current' && !activeSettlement) {
            return { pending: strapiCounts.pending ?? 0, canceled: strapiCounts.canceled ?? 0 };
        }
        const strapiOrders = orders.filter((o) => !o.isByeMoney);
        return {
            pending: strapiOrders.filter((o) => o.orderStatus === 'pending').length,
            canceled: strapiOrders.filter(isCanceledOrder).length,
        };
    }, [statsInfo, orders, periodFilter, activeSettlement]);

    const cleanupOptions = useMemo(() => {
        const n = (v) => new Intl.NumberFormat('fa-IR').format(v ?? 0);
        const opts = [];
        if (bulkDeleteCounts.canceled > 0) opts.push({ value: 'canceled', label: `حذف لغو شده‌ها (${n(bulkDeleteCounts.canceled)})` });
        if (bulkDeleteCounts.pending > 0) opts.push({ value: 'pending', label: `حذف در انتظارها (${n(bulkDeleteCounts.pending)})` });
        return opts;
    }, [bulkDeleteCounts]);

    // ── محاسبات دوره تسویه مالی ──────────────────────────────────────────────
    const settlementsCount = statsInfo?.settlementsCount ?? 0;

    const currentEligibleOrdersCount = useMemo(() => {
        if (activeSettlement) return activeSettlement.ordersCount || 0;
        if (periodFilter === 'current') {
            const confirmedCount = orders.filter(isPaidOrder).length;
            const statsCount = statsInfo?.currentPeriod?.statusCounts?.paid;
            return statsCount !== undefined && statsCount !== null ? statsCount : confirmedCount;
        }
        return orders.filter(isPaidOrder).length;
    }, [orders, periodFilter, activeSettlement, statsInfo]);

    const currentPeriodRevenue = useMemo(() => {
        if (activeSettlement) return activeSettlement.totalAmount || 0;
        if (periodFilter === 'current' && statsInfo?.currentPeriod?.totalRevenue !== undefined && statsInfo?.currentPeriod?.totalRevenue !== null) {
            return statsInfo.currentPeriod.totalRevenue;
        }
        const confirmedStatuses = ['paid', 'shipped', 'delivered'];
        return orders.reduce((sum, order) => {
            const oStatus = (order.orderStatus || '').trim().toLowerCase();
            const pStatus = (order.paymentStatus || '').trim().toLowerCase();
            if (pStatus === 'paid' || confirmedStatuses.includes(oStatus)) {
                return sum + Number(order.totalPrice || 0);
            }
            return sum;
        }, 0);
    }, [orders, statsInfo, activeSettlement, periodFilter]);

    function handleSettlementSuccess(newSettlement) {
        setSettlementSuccessMessage(
            `دوره تسویه با موفقیت بسته شد و ${new Intl.NumberFormat('fa-IR').format(newSettlement.ordersCount)} سفارش به ارزش ${new Intl.NumberFormat('fa-IR').format(newSettlement.totalAmount)} تومان در آرشیو ثبت شد.`
        );

        // صفر کردن سفارش‌های دوره جاری در UI
        setOrders([]);
        setTotalOrders(0);
        setHasMore(false);
        setStatsInfo((prev) => ({
            ...prev,
            totalOrders: 0,
            totalRevenue: 0,
            currentPeriod: {
                totalOrders: 0,
                totalRevenue: 0,
                statusCounts: { pending: 0, paid: 0, canceled: 0 },
            },
            settlementsCount: (prev?.settlementsCount || 0) + 1,
        }));

        setTimeout(() => {
            setSettlementSuccessMessage(null);
        }, 8000);
    }

    function handleBulkDeleteSuccess(res) {
        setSettlementSuccessMessage(res.message);
        setOrders((prev) =>
            prev.filter((o) => {
                if (o.isByeMoney) return true;
                const status = (o.orderStatus || '').trim().toLowerCase();
                return status !== bulkDeleteTarget;
            })
        );
        const deletedCount = res.deletedCount || 0;
        setTotalOrders((prev) => Math.max(0, prev - deletedCount));
        setStatsInfo((prev) => {
            if (!prev) return prev;
            const currentPeriod = prev.currentPeriod ? { ...prev.currentPeriod } : {};
            const statusCounts = currentPeriod.statusCounts ? { ...currentPeriod.statusCounts } : {};
            if (bulkDeleteTarget === 'canceled') statusCounts.canceled = 0;
            if (bulkDeleteTarget === 'pending') statusCounts.pending = 0;
            currentPeriod.statusCounts = statusCounts;
            currentPeriod.totalOrders = Math.max(0, (currentPeriod.totalOrders || 0) - deletedCount);
            return {
                ...prev,
                totalOrders: Math.max(0, (prev.totalOrders || 0) - deletedCount),
                currentPeriod,
            };
        });
        setTimeout(() => {
            setSettlementSuccessMessage(null);
        }, 8000);
    }

    function handleOrderUpdate(orderId, changes) {
        setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, ...changes } : o))
        );
    }

    function toggleExpand(orderId) {
        setExpandedId((prev) => (prev === orderId ? null : orderId));
    }

    const COL_SPAN = 9; // تعداد ستون‌های جدول
    const headers = [
        <div key="expand-col" style={{ width: 16 }}></div>,
        'شناسه',
        'کاربر',
        'روش پرداخت',
        <button
            key="status-sort-btn"
            type="button"
            className={`${styles.sort_header_btn} ${isStatusSorted ? styles['sort_header_btn--active'] : ''}`}
            onClick={() => setIsStatusSorted((prev) => !prev)}
            title={
                isStatusSorted
                    ? 'مرتب‌سازی اولویت وضعیت فعال است (کلیک برای بازنشانی)'
                    : 'مرتب‌سازی اولویت وضعیت در کل دیتابیس: فیش‌های در انتظار پرداخت در بالا'
            }
        >
            <span>وضعیت سفارش</span>
            <ArrowUpDown
                size={14}
                className={`${styles.sort_header_icon} ${isStatusSorted ? styles['sort_header_icon--active'] : ''}`}
            />
            {isStatusSorted && <span className={styles.sort_active_dot} />}
        </button>,
        'وضعیت ارسال',
        'مبلغ',
        'تاریخ',
        'عملیات',
    ];

    return (
        <AdminTableContainer>
            {/* ── پیام موفقیت تسویه ───────────────────────────────────── */}
            {settlementSuccessMessage && (
                <div className={styles.settlementSuccessAlert}>
                    <div className={styles.settlementSuccessAlert__content}>
                        <CheckCircle2 size={20} />
                        <span>{settlementSuccessMessage}</span>
                    </div>
                    <button
                        type="button"
                        className={styles.settlementSuccessAlert__close}
                        onClick={() => setSettlementSuccessMessage(null)}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* ── بنر مشاهده پوشه آرشیو دوره یا ویجت دوره جاری ─────────── */}
            {activeSettlement ? (
                <div className={styles.settlementBannerArchive}>
                    <div className={styles.settlementBannerArchive__info}>
                        <span style={{ fontSize: '1.4rem' }}>📁</span>
                        <div>
                            <strong>در حال مشاهده پوشه آرشیو: {activeSettlement.title}</strong>
                            <p>
                                تعداد: {new Intl.NumberFormat('fa-IR').format(activeSettlement.ordersCount)} سفارش |
                                مبلغ کل تسویه: {new Intl.NumberFormat('fa-IR').format(activeSettlement.totalAmount)} تومان |
                                تاریخ بسته‌شدن: {formatDate(activeSettlement.settledAt)}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className={styles.settlementBannerArchive__btn}
                        onClick={() => {
                            setActiveSettlement(null);
                            setPeriodFilter('current');
                        }}
                    >
                        <ArrowLeft size={16} />
                        <span>بازگشت به سفارش‌های دوره جاری</span>
                    </button>
                </div>
            ) : (
                <div className={styles.settlementPanel} style={{ marginBottom: '8px' }}>
                    {/* ── هدر قابل کلیک برای collapse/expand ────────────── */}
                    <button
                        type="button"
                        className={styles.settlementPanel__toggle}
                        onClick={() => setIsSettlementPanelOpen((prev) => !prev)}
                        title={isSettlementPanelOpen ? 'بستن پنل تسویه' : 'باز کردن پنل تسویه'}
                    >
                        <div className={styles.settlementPanel__badge}>
                            <span className={styles.settlementPanel__dot} />
                            <span>
                                {periodFilter === 'current'
                                    ? 'دوره مالی جاری'
                                    : 'نمایش کل تاریخچه سفارش‌ها'}
                            </span>
                        </div>
                        <ChevronDown
                            size={16}
                            className={`${styles.settlementPanel__chevron} ${isSettlementPanelOpen ? styles['settlementPanel__chevron--open'] : ''}`}
                        />
                    </button>

                    {/* ── محتوای قابل collapse ───────────────────────────── */}
                    {isSettlementPanelOpen && (
                        <div className={styles.settlementPanel__body}>
                            <div className={styles.settlementPanel__numbers}>
                                <div className={styles.settlementStatItem}>
                                    <span className={styles.settlementStatItem__label}>میزان درآمد:</span>
                                    <strong className={styles.settlementStatItem__valueSuccess}>
                                        {new Intl.NumberFormat('fa-IR').format(currentPeriodRevenue)} تومان
                                    </strong>
                                </div>
                                {statsInfo?.byemoney?.revenueNoor !== null && statsInfo?.byemoney?.revenueNoor !== undefined && (
                                    <div className={styles.settlementStatItem}>
                                        <span className={styles.settlementStatItem__label}>درآمد بای‌مانی (فقط پرداخت‌شده):</span>
                                        <strong className={styles.settlementStatItem__valueSuccess}>
                                            {new Intl.NumberFormat('fa-IR').format(statsInfo.byemoney.revenueNoor)} نور
                                        </strong>
                                    </div>
                                )}
                                <div className={styles.settlementStatItem}>
                                    <span className={styles.settlementStatItem__label}>تعداد سفارش ها :</span>
                                    <strong className={styles.settlementStatItem__value}>
                                        {new Intl.NumberFormat('fa-IR').format(currentEligibleOrdersCount)} سفارش
                                    </strong>
                                </div>
                            </div>

                            <div className={styles.settlementPanel__actions}>
                                {/* سوییچ دوره جاری vs تمام تاریخچه */}
                                <div className={styles.periodSwitch}>
                                    <button
                                        type="button"
                                        className={`${styles.periodSwitch__btn} ${periodFilter === 'current' ? styles['periodSwitch__btn--active'] : ''}`}
                                        onClick={() => setPeriodFilter('current')}
                                    >
                                        دوره جاری
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.periodSwitch__btn} ${periodFilter === 'all' ? styles['periodSwitch__btn--active'] : ''}`}
                                        onClick={() => setPeriodFilter('all')}
                                    >
                                        همه تاریخچه
                                    </button>
                                </div>

                                {/* دکمه پوشه آرشیو */}
                                <button
                                    type="button"
                                    className={styles.archiveBtn}
                                    onClick={() => setIsArchiveModalOpen(true)}
                                    title="مشاهده دوره‌های تسویه‌شده گذشته"
                                >
                                    <Folder size={16} />
                                    <span>📁 آرشیو دوره‌ها</span>
                                    {settlementsCount > 0 && (
                                        <span className={styles.archiveBtn__badge}>
                                            {new Intl.NumberFormat('fa-IR').format(settlementsCount)}
                                        </span>
                                    )}
                                </button>

                                {/* دکمه بستن دوره مالی */}
                                <button
                                    type="button"
                                    className={styles.settleActionBtn}
                                    onClick={() => setIsSettlementModalOpen(true)}
                                >
                                    <CreditCard size={16} />
                                    <span>بستن دوره و تسویه</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── هشدار قطعی بای‌مانی ────────────────────────────────────────── */}
            {byemoneyWarning && (
                <div className={styles.byemoneyWarningAlert}>
                    <div className={styles.byemoneyWarningAlert__content}>
                        <AlertTriangle size={18} />
                        <span>به دلیل اختلال موقت در ارتباط با سرویس مالی بای‌مانی، برخی از خریدهای اخیر ممکن است در این فهرست نمایش داده نشوند. سفارش‌های موجود از سامانه اصلی نمایش داده شده‌اند.</span>
                    </div>
                    <button
                        type="button"
                        className={styles.byemoneyWarningAlert__close}
                        onClick={() => setByemoneyWarning(false)}
                        aria-label="بستن هشدار"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* ── نوار ابزار: تب‌های فیلتر وضعیت و جستجو ─────────────── */}
            <AdminToolbar>
                <div className={styles.filterTabs}>
                    <AdminSelect
                        value={filterType}
                        onChange={setFilterType}
                        options={statusOptions}
                        ariaLabel="فیلتر وضعیت سفارش"
                    />
                    {cleanupOptions.length > 0 && (
                        <AdminSelect
                            value=""
                            onChange={(val) => setBulkDeleteTarget(val)}
                            options={cleanupOptions}
                            placeholder="پاکسازی گروهی"
                            icon={<Trash2 size={14} />}
                            ariaLabel="پاکسازی گروهی سفارش‌ها"
                        />
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <AdminSelect
                        value={sourceFilter}
                        onChange={setSourceFilter}
                        options={SOURCE_OPTIONS}
                        ariaLabel="فیلتر منبع سفارش"
                    />

                    <AdminSearch
                        placeholder="جستجو بر اساس شماره سفارش، کاربر یا موبایل..."
                        value={searchQuery}
                        onChange={(e) => {
                            const val = e.target.value;
                            setSearchQuery(val);
                            if (!val.trim() && appliedSearch) {
                                setAppliedSearch('');
                            }
                        }}
                        onSubmit={() => {
                            setAppliedSearch(searchQuery.trim());
                        }}
                    />
                    <span className={styles.toolbar__count}>
                        {appliedSearch || filterType !== 'all' || sourceFilter !== 'all' || isStatusSorted
                            ? `${new Intl.NumberFormat('fa-IR').format(totalOrders)} سفارش یافته‌شده`
                            : `نمایش ${new Intl.NumberFormat('fa-IR').format(orders.length)} از ${new Intl.NumberFormat('fa-IR').format(totalOrders)} سفارش`}
                    </span>
                </div>
            </AdminToolbar>

            {/* ── جدول سفارش‌ها ────────────────────────────────────────── */}
            {isInitialLoading ? (
                <div className={styles.emptyFiltered} style={{ opacity: 0.8 }}>
                    <p>در حال بارگذاری و مرتب‌سازی سفارش‌ها از سرور...</p>
                </div>
            ) : orders.length === 0 ? (
                <div className={styles.emptyFiltered}>
                    <p>هیچ سفارشی مطابق با فیلترها و جستجوی انتخابی یافت نشد.</p>
                    <AdminButton
                        variant="default"
                        onClick={() => {
                            setSearchQuery('');
                            setAppliedSearch('');
                            setFilterType('all');
                            setSourceFilter('all');
                            setIsStatusSorted(false);
                        }}
                    >
                        <RotateCcw size={14} style={{ marginLeft: '4px' }} />
                        بازنشانی فیلترها
                    </AdminButton>
                </div>
            ) : (
                <AdminTable headers={headers}>
                    {orders.map((order) => {
                        const isOnline = order.paymentMethod === 'online';
                        const isByeMoneyRow = Boolean(order.isByeMoney || order.source === 'byemoney');
                        let ordConf = isByeMoneyRow
                            ? getFinancialStatusConfig(order.financialStatus)
                            : (ORDER_STATUS_CONFIG[order.orderStatus?.trim()] || ORDER_STATUS_CONFIG[order.orderStatus] || ORDER_STATUS_CONFIG.pending);
                        if (isOnline) {
                            if (isPaidOrder(order)) {
                                ordConf = { label: 'پرداخت آنلاین موفق', variant: 'success' };
                            } else if (order.orderStatus === 'pending') {
                                ordConf = { label: 'در انتظار پرداخت آنلاین', variant: 'warning' };
                            }
                        }

                        const isCardToCard = order.paymentMethod === 'card_to_card';
                        const needsReceiptApproval =
                            isCardToCard && order.paymentStatus === 'pending_verification';
                        const isExpanded = expandedId === order.id;

                        return (
                            <Fragment key={order.id}>
                                <tr
                                    className={`${styles.table__row} ${isExpanded ? styles['table__row--expanded'] : ''}`}
                                    onClick={() => toggleExpand(order.id)}
                                    onKeyDown={(e) => {
                                        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                                            e.preventDefault();
                                            toggleExpand(order.id);
                                        }
                                    }}
                                    tabIndex={0}
                                    aria-expanded={isExpanded}
                                >
                                    {/* دکمه toggle */}
                                    <td className={styles.expand_toggle_cell}>
                                        <span
                                            className={`${styles.expand_toggle} ${isExpanded ? styles['expand_toggle--open'] : ''}`}
                                            title={isExpanded ? 'بستن جزئیات' : 'مشاهده جزئیات سفارش'}
                                            aria-label={isExpanded ? 'بستن جزئیات' : 'مشاهده جزئیات'}
                                        >
                                            ▶
                                        </span>
                                    </td>

                                    {/* شناسه */}
                                    <td className={styles.table__id}>{order.orderNumber}</td>

                                    {/* کاربر */}
                                    <td>
                                        {(() => {
                                            const buyerName = getBuyerDisplayName(order);
                                            const buyerPhone = order.phone || order.user?.phoneNumber;
                                            return (
                                                <div className={styles.user_cell}>
                                                    <span className={styles.user_cell__name}>
                                                        {buyerName}
                                                    </span>
                                                    {buyerPhone && buyerPhone !== '00000000000' && (
                                                        <span className={styles.user_cell__phone} dir="ltr">
                                                            {buyerPhone}
                                                        </span>
                                                    )}
                                                    {order.cardHolderName && order.cardHolderName !== buyerName && (
                                                        <span className={styles.user_cell__card}>
                                                            💳 {order.cardHolderName}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </td>

                                    {/* روش پرداخت */}
                                    <td>
                                        <span className={styles.method_label}>
                                            {PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}
                                        </span>
                                    </td>

                                    {/* وضعیت سفارش */}
                                    <td>
                                        <div className={styles.status_cell}>
                                            <AdminBadge
                                                text={ordConf.label}
                                                variant={ordConf.variant}
                                            />
                                            {isByeMoneyRow && order.attemptSummary && (
                                                <AdminBadge
                                                    text={order.attemptSummary.label}
                                                    variant={order.attemptSummary.tone}
                                                />
                                            )}
                                            {order.trackingNumber && (
                                                <span className={styles.tracking_code}>
                                                    🚚 {order.trackingNumber}
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* وضعیت ارسال */}
                                    <td>
                                        {isByeMoneyRow && isPaidOrder(order) && (order.physicalCancelled || order.deliveryStatus === 'Cancelled') ? (
                                            <AdminBadge text="کالا لغو شده" variant="error" />
                                        ) : isByeMoneyRow && isPaidOrder(order) && DELIVERY_COLUMN_CONFIG[order.deliveryStatus] ? (
                                            <AdminBadge
                                                text={DELIVERY_COLUMN_CONFIG[order.deliveryStatus].label}
                                                variant={DELIVERY_COLUMN_CONFIG[order.deliveryStatus].variant}
                                            />
                                        ) : (
                                            <span className={styles.expanded_empty}>—</span>
                                        )}
                                    </td>

                                    {/* مبلغ */}
                                    <td className={styles.table__amount}>
                                        {order.isByeMoney || order.source === 'byemoney' ? (
                                            Number(order.refundedAmountInNoor) > 0 ? (
                                                <span title="مبلغ پرداخت‌شده و برگشتی لغو کالا">
                                                    <span className={styles.amount__struck}>{formatPriceRaw(order.totalPrice)}</span>
                                                    {' '}
                                                    <span data-testid="order-net-amount">
                                                        {formatPriceRaw(Math.max(0, Number(order.totalPrice || 0) - Number(order.refundedAmountInNoor)))} نور
                                                    </span>
                                                    <span className={styles.amount__refund} data-testid="order-refunded-amount">
                                                        برگشتی: {formatPriceRaw(order.refundedAmountInNoor)} نور
                                                    </span>
                                                </span>
                                            ) : (
                                                <span title="پرداخت با نور">{formatPriceRaw(order.totalPrice)} نور</span>
                                            )
                                        ) : (
                                            formatPrice(order.totalPrice)
                                        )}
                                    </td>

                                    {/* تاریخ */}
                                    <td className={styles.table__date}>
                                        {formatDateShort(order.createdAt)}
                                    </td>

                                    {/* عملیات */}
                                    <td>
                                        <div className={styles.actions}>
                                            {isByeMoneyRow ? (
                                                <span className={styles.expanded_empty} title="برای مشاهده جزئیات روی ردیف کلیک کنید">—</span>
                                            ) : (
                                                <>
                                                    {!needsReceiptApproval && <span className={styles.expanded_empty}>—</span>}
                                                    {needsReceiptApproval && (
                                                        <AdminButton
                                                            variant="edit"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setReceiptModal(order);
                                                            }}
                                                            title="مشاهده و تأیید رسید پرداخت"
                                                        >
                                                            رسید
                                                        </AdminButton>
                                                    )}

                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>

                                {/* ردیف کشویی جزئیات */}
                                {isExpanded && (
                                    <OrderExpandedRow
                                        key={`expanded-${order.id}`}
                                        order={order}
                                        colSpan={COL_SPAN}
                                        onOpenReceipt={(ord) => setReceiptModal(ord)}
                                        onOpenStatus={(ord) => setStatusModal(ord)}
                                        onAttemptSummary={(summary) => handleOrderUpdate(order.id, { attemptSummary: summary })}
                                        onPhysicalCancelled={(cancelled) => handleOrderUpdate(order.id, { physicalCancelled: cancelled })}
                                    />
                                )}
                            </Fragment>
                        );
                    })}
                </AdminTable>
            )}

            {/* ── بخش Lazy Loading و نشانگر بارگذاری ─────────────────── */}
            <AdminLazyLoad
                hasMore={hasMore}
                isLoading={isLoadingMore}
                loadError={loadError}
                onLoadMore={loadMoreOrders}
                total={totalOrders}
                currentCount={orders.length}
                sentinelRef={sentinelRef}
                itemLabel="سفارش"
            />

            {/* ── مودال رسید ──────────────────────────────────────────────── */}
            {receiptModalOrder && (
                <ReceiptModal
                    order={receiptModalOrder}
                    onClose={() => setReceiptModal(null)}
                    onUpdate={handleOrderUpdate}
                />
            )}

            {/* ── مودال وضعیت ─────────────────────────────────────────────── */}
            {statusModalOrder && (
                <StatusUpdateModal
                    order={statusModalOrder}
                    onClose={() => setStatusModal(null)}
                    onUpdate={handleOrderUpdate}
                />
            )}

            {/* ── مودال بستن دوره مالی و تسویه ─────────────────────────────── */}
            <SettlementModal
                isOpen={isSettlementModalOpen}
                onClose={() => setIsSettlementModalOpen(false)}
                onSuccess={handleSettlementSuccess}
                pendingRevenue={currentPeriodRevenue}
                eligibleCount={currentEligibleOrdersCount}
            />

            {/* ── مودال پوشه‌های آرشیو دوره‌ها ──────────────────────────────── */}
            <SettlementArchiveModal
                isOpen={isArchiveModalOpen}
                onClose={() => setIsArchiveModalOpen(false)}
                activeSettlementId={activeSettlement?.id || activeSettlement?.documentId || null}
                onSelectSettlement={(settlement) => {
                    setActiveSettlement(settlement);
                    setFilterType('all');
                }}
            />

            {/* ── مودال حذف گروهی سفارش‌ها ─────────────────────────────── */}
            <BulkDeleteModal
                isOpen={Boolean(bulkDeleteTarget)}
                status={bulkDeleteTarget || 'canceled'}
                count={bulkDeleteTarget === 'canceled' ? (bulkDeleteCounts.canceled || 0) : (bulkDeleteCounts.pending || 0)}
                onClose={() => setBulkDeleteTarget(null)}
                onSuccess={handleBulkDeleteSuccess}
            />
        </AdminTableContainer>
    );
}
