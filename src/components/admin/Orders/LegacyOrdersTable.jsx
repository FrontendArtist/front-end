'use client';

/**
 * @file src/components/admin/Orders/LegacyOrdersTable.jsx
 * @description جدول سفارش‌های قدیمی استرپی (تومانی) در /admin/orders/legacy – Client Component
 *
 * سفارش‌های بای‌مانی در صفحهٔ اصلی «سفارش‌ها» هستند (ADMIN-ORDERS-REDESIGN)؛ این جدول فقط منبع استرپی را
 * می‌خواند و همان رفتار قبلی را دارد: تأیید فیش، تغییر وضعیت، حذف گروهی، بستن دوره و آرشیو.
 *
 * 🎯 مسئولیت‌ها:
 *   - نمایش جدول سفارش‌ها با ستون‌های: شناسه، کاربر، روش پرداخت، وضعیت سفارش، مبلغ، تاریخ، عملیات.
 *   - ردیف کشویی (Expandable Row) برای هر سفارش با تمام جزئیات خریدار و اقلام و لینک مشاهده رسید.
 *   - مدیریت state محلی برای آپدیت optimistic (بدون reload صفحه).
 *   - کنترل مودال ReceiptModal.
 *
 * @param {{ initialOrders: object[], initialMeta: object }} props
 */

import { useState, useMemo, useRef, useEffect, useCallback, Fragment } from 'react';
import {
    ArrowUpDown, RotateCcw, Folder, CreditCard, CheckCircle2, ArrowLeft, Trash2, ChevronDown,
    ReceiptText, ShoppingBag, MapPin, StickyNote,
} from 'lucide-react';
import ReceiptModal from './ReceiptModal';
import SettlementModal from './SettlementModal';
import SettlementArchiveModal from './SettlementArchiveModal';
import BulkDeleteModal from './BulkDeleteModal';
import styles from './OrdersTable.module.scss';
import details from './LegacyOrderDetails.module.scss';
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

/** این جدول فقط سفارش‌های استرپی را می‌خواند */
const SOURCE = 'strapi';

/** برچسب‌های روش پرداخت */
const PAYMENT_METHOD_LABELS = {
    card_to_card: 'کارت‌به‌کارت',
    online: 'آنلاین',
    free: 'رایگان',
    cash: 'نقدی',
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
 * OrderExpandedRow – جزئیات سفارش قدیمی: نوار نتیجهٔ پرداخت بالا و کارت‌های پرداخت/اقلام/آدرس/یادداشت در سه ستون
 */
function OrderExpandedRow({ order, colSpan, onOpenReceipt }) {
    const isPaid = isPaidOrder(order);
    const isCanceled = isCanceledOrder(order);
    const result = isPaid
        ? { text: 'پرداخت موفق و تأییدشده', variant: 'success' }
        : isCanceled
            ? { text: 'سفارش لغو شده', variant: 'error' }
            : isWaitingReceipt(order)
                ? { text: 'در انتظار تأیید فیش', variant: 'warning' }
                : { text: 'در انتظار پرداخت', variant: 'warning' };

    // تشخیص وجود محصول فیزیکی در سبد خرید (دوره‌ها نیاز به آدرس ارسال ندارند)
    const hasPhysicalProduct = Boolean(
        Array.isArray(order.items) &&
        order.items.some((item) => {
            if (item.slug === 'light-topup' || item.type === 'light_topup') return false;
            if (item.__component === 'order.product-order-item') return true;
            if (item.productId && Number(item.productId) > 0 && !item.courseId && !item.chapterId) return true;
            return item.type === 'product';
        })
    );
    const showAddress = hasPhysicalProduct && (order.address || order.postalCode);
    const hasNotes = Boolean(order.notes && order.notes.trim());
    const traceNo = order.traceNo || order.trackingNumber;

    return (
        <tr className={styles.expanded_row}>
            <td colSpan={colSpan} className={styles.expanded_cell}>
                <div className={details.panel}>
                    {/* ── نوار مدیریت ── */}
                    <div className={details.bar}>
                        <div className={details.bar__info}>
                            <span className={details.bar__label}>نتیجهٔ پرداخت</span>
                            <AdminBadge text={result.text} variant={result.variant} />
                        </div>
                        <div className={details.bar__actions}>
                            {order.paymentMethod === 'card_to_card' && order.receiptImageUrl && (
                                <AdminButton variant="edit" onClick={(e) => { e.stopPropagation(); onOpenReceipt && onOpenReceipt(order); }}
                                    title="مشاهده تصویر رسید پرداخت">
                                    <ReceiptText size={14} aria-hidden="true" /> مشاهدهٔ فیش
                                </AdminButton>
                            )}
                        </div>
                    </div>

                    <div className={details.grid}>
                        {/* ── پرداخت ── */}
                        <section className={details.card}>
                            <h4 className={details.card__title}><CreditCard size={15} aria-hidden="true" /> پرداخت</h4>
                            <dl className={details.fields}>
                                <div className={details.field}>
                                    <dt>روش</dt>
                                    <dd>{PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod || '—'}</dd>
                                </div>
                                {order.paymentDate && (
                                    <div className={details.field}>
                                        <dt>تاریخ پرداخت</dt>
                                        <dd>{formatDate(order.paymentDate)}</dd>
                                    </div>
                                )}
                                {order.paymentMethod === 'card_to_card' && order.cardHolderName && (
                                    <div className={details.field}>
                                        <dt>صاحب کارت</dt>
                                        <dd>{order.cardHolderName}</dd>
                                    </div>
                                )}
                                {order.paymentMethod === 'online' && order.securePan && (
                                    <div className={details.field}>
                                        <dt>کارت واریزکننده</dt>
                                        <dd dir="ltr">{order.securePan}</dd>
                                    </div>
                                )}
                                {order.paymentMethod === 'online' && order.refNum && (
                                    <div className={`${details.field} ${details['field--wide']}`}>
                                        <dt>رسید دیجیتال (RefNum)</dt>
                                        <dd className={details.copyRow}>
                                            <span dir="ltr">{order.refNum}</span>
                                            <CopyButton text={order.refNum} label="رسید دیجیتال" />
                                        </dd>
                                    </div>
                                )}
                                {order.paymentMethod === 'online' && traceNo && (
                                    <div className={details.field}>
                                        <dt>کد پیگیری (TraceNo)</dt>
                                        <dd className={details.copyRow}>
                                            <span dir="ltr">{traceNo}</span>
                                            <CopyButton text={traceNo} label="کد پیگیری" />
                                        </dd>
                                    </div>
                                )}
                                {order.paymentMethod === 'online' && order.rrn && (
                                    <div className={details.field}>
                                        <dt>مرجع شاپرک (RRN)</dt>
                                        <dd dir="ltr">{order.rrn}</dd>
                                    </div>
                                )}
                            </dl>
                        </section>

                        {/* ── اقلام ── */}
                        <section className={details.card}>
                            <h4 className={details.card__title}><ShoppingBag size={15} aria-hidden="true" /> اقلام سفارش</h4>
                            {order.items && order.items.length > 0 ? (
                                <>
                                    <ul className={details.items}>
                                        {order.items.map((item, idx) => {
                                            const typeConfig = ITEM_TYPE_LABELS[item.__component] || { icon: '📌', label: 'قلم' };
                                            const qty = Number(item.quantity) > 1 ? Number(item.quantity) : null;
                                            return (
                                                <li key={idx} className={details.item}>
                                                    <span className={details.item__icon} aria-hidden="true">{typeConfig.icon}</span>
                                                    <span className={details.item__info}>
                                                        <span className={details.item__title}>{item.title || '—'}</span>
                                                        <span className={details.item__meta}>
                                                            {typeConfig.label}
                                                            {qty && ` · ${new Intl.NumberFormat('fa-IR').format(qty)} عدد`}
                                                        </span>
                                                    </span>
                                                    <span className={details.item__price}>{formatPrice(item.price)}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                    <div className={details.total}>
                                        <span>جمع کل</span>
                                        <strong>{formatPrice(order.totalPrice)}</strong>
                                    </div>
                                </>
                            ) : (
                                <p className={details.empty}>اطلاعات اقلام در دسترس نیست.</p>
                            )}
                        </section>

                        {/* ── آدرس ارسال (فقط برای محصول فیزیکی) ── */}
                        {showAddress && (
                            <section className={details.card}>
                                <h4 className={details.card__title}><MapPin size={15} aria-hidden="true" /> آدرس ارسال</h4>
                                <p className={details.address}>{order.address || '—'}</p>
                                {order.postalCode && order.postalCode !== '0000000000' && (
                                    <p className={details.postal}>کد پستی: <span dir="ltr">{order.postalCode}</span></p>
                                )}
                            </section>
                        )}

                        {/* ── یادداشت ── */}
                        {hasNotes && (
                            <section className={details.card}>
                                <h4 className={details.card__title}><StickyNote size={15} aria-hidden="true" /> یادداشت</h4>
                                <pre className={details.notes}>{order.notes}</pre>
                            </section>
                        )}
                    </div>
                </div>
            </td>
        </tr>
    );
}

// ── OrdersTable ──────────────────────────────────────────────────────────────

export default function LegacyOrdersTable({
    initialOrders = [],
    initialMeta = null,
    initialStats = null,
    settlementStats = null,
}) {
    // ── State ──────────────────────────────────────────────────────────────────
    const [orders, setOrders] = useState(initialOrders);
    const [receiptModalOrder, setReceiptModal] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    // فیلتر وضعیت در این صفحه لازم نیست (تصمیم کاربر)؛ همیشه همهٔ سفارش‌های قدیمی
    const filterType = 'all';
    const [isStatusSorted, setIsStatusSorted] = useState(false); // اولویت‌بندی هوشمند وضعیت در سرور
    const [expandedId, setExpandedId] = useState(null); // شناسه ردیف باز
    const [isInitialLoading, setIsInitialLoading] = useState(false);

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
                    source: SOURCE,
                });

                if (!isCancelled && data?.orders) {
                    setOrders(data.orders);
                    const newTotal = data.meta?.pagination?.total ?? data.orders.length;
                    setTotalOrders(newTotal);
                    setHasMore(data.orders.length < newTotal);
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
    }, [filterType, isStatusSorted, appliedSearch, periodFilter, activeSettlement]);

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
                source: SOURCE,
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
    }, [isLoadingMore, hasMore, isInitialLoading, orders.length, totalOrders, filterType, isStatusSorted, appliedSearch, periodFilter, activeSettlement]);

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

    const bulkDeleteCounts = useMemo(() => {
        const strapiCounts = statsInfo?.statusCounts;
        if (strapiCounts && periodFilter === 'current' && !activeSettlement) {
            return { pending: strapiCounts.pending ?? 0, canceled: strapiCounts.canceled ?? 0 };
        }
        return {
            pending: orders.filter((o) => o.orderStatus === 'pending').length,
            canceled: orders.filter(isCanceledOrder).length,
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

    const COL_SPAN = 8; // تعداد ستون‌های جدول
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

            {/* ── نوار ابزار: پاکسازی گروهی و جستجو ─────────────────── */}
            <AdminToolbar>
                <div className={styles.filterTabs}>
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

                <div className={details.toolbarEnd}>
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
                        {appliedSearch || isStatusSorted
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
                        let ordConf = ORDER_STATUS_CONFIG[order.orderStatus?.trim()] || ORDER_STATUS_CONFIG[order.orderStatus] || ORDER_STATUS_CONFIG.pending;
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
                                            {order.trackingNumber && (
                                                <span className={styles.tracking_code}>
                                                    🚚 {order.trackingNumber}
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* مبلغ */}
                                    <td className={styles.table__amount}>
                                        {formatPrice(order.totalPrice)}
                                    </td>

                                    {/* تاریخ */}
                                    <td className={styles.table__date}>
                                        {formatDateShort(order.createdAt)}
                                    </td>

                                    {/* عملیات */}
                                    <td>
                                        <div className={styles.actions}>
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
                onSelectSettlement={(settlement) => setActiveSettlement(settlement)}
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
