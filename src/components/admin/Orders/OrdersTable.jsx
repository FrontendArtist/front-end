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
import { ArrowUpDown, RotateCcw, Folder, CreditCard, CheckCircle2, ArrowLeft, Trash2, ChevronDown } from 'lucide-react';
import ReceiptModal from './ReceiptModal';
import StatusUpdateModal from './StatusUpdateModal';
import SettlementModal from './SettlementModal';
import SettlementArchiveModal from './SettlementArchiveModal';
import BulkDeleteModal from './BulkDeleteModal';
import styles from './OrdersTable.module.scss';
import AdminSearch from '../Shared/AdminSearch';
import { AdminTableContainer, AdminTable, AdminToolbar } from '../Shared/AdminTable';
import AdminBadge from '../Shared/AdminBadge';
import AdminButton from '../Shared/AdminButton';
import AdminLazyLoad from '../Shared/AdminLazyLoad';
import { fetchAdminOrders } from '@/lib/client/admin/ordersClient';

// ── ابزارهای نمایش ──────────────────────────────────────────────────────────

/** برچسب‌های فارسی وضعیت سفارش */
const ORDER_STATUS_CONFIG = {
    'pending': { label: 'در انتظار پرداخت', variant: 'warning' },
    'paid': { label: 'پرداخت شده', variant: 'success' },
    'shipped': { label: 'ارسال شده', variant: 'info' },
    'delivered': { label: 'تحویل شده', variant: 'success' },
    'canceled': { label: 'رد شده', variant: 'error' },
};

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

/**
 * OrderExpandedRow – ردیف کشویی با تمام جزئیات سفارش
 */
function OrderExpandedRow({ order, colSpan, onOpenReceipt }) {
    const buyerName = getBuyerDisplayName(order);

    return (
        <tr className={styles.expanded_row}>
            <td colSpan={colSpan} className={styles.expanded_cell}>
                <div className={styles.expanded_content}>

                    {/* ── ستون ۱: اطلاعات خریدار ──────────────────────────── */}
                    <div className={styles.expanded_section}>
                        <h4 className={styles.expanded_section__title}>👤 اطلاعات خریدار</h4>
                        <div className={styles.expanded_grid}>
                            <div className={styles.expanded_field}>
                                <span className={styles.expanded_field__label}>نام و نام‌خانوادگی</span>
                                <span className={styles.expanded_field__value}>{buyerName}</span>
                            </div>
                            {order.cardHolderName && order.cardHolderName !== buyerName && (
                                <div className={styles.expanded_field}>
                                    <span className={styles.expanded_field__label}>نام صاحب کارت</span>
                                    <span className={styles.expanded_field__value}>💳 {order.cardHolderName}</span>
                                </div>
                            )}
                            <div className={styles.expanded_field}>
                                <span className={styles.expanded_field__label}>موبایل خریدار</span>
                                <span className={styles.expanded_field__value} dir="ltr">{order.phone || order.user?.phoneNumber || '—'}</span>
                            </div>
                            <div className={styles.expanded_field}>
                                <span className={styles.expanded_field__label}>ایمیل</span>
                                <span className={styles.expanded_field__value}>{order.email || '—'}</span>
                            </div>
                            <div className={styles.expanded_field}>
                                <span className={styles.expanded_field__label}>تاریخ ثبت</span>
                                <span className={styles.expanded_field__value}>{formatDate(order.createdAt)}</span>
                            </div>
                            <div className={styles.expanded_field}>
                                <span className={styles.expanded_field__label}>روش پرداخت</span>
                                <span className={styles.expanded_field__value}>{PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod || '—'}</span>
                            </div>
                            {order.trackingNumber && (
                                <div className={styles.expanded_field}>
                                    <span className={styles.expanded_field__label}>کد رهگیری</span>
                                    <span className={styles.expanded_field__value} dir="ltr">🚚 {order.trackingNumber}</span>
                                </div>
                            )}
                            {order.receiptImageUrl && (
                                <div className={`${styles.expanded_field} ${styles['expanded_field--full']}`}>
                                    <span className={styles.expanded_field__label}>رسید پرداخت</span>
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
                                            🧾 مشاهده رسید
                                        </button>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── ستون ۲: آدرس ارسال ──────────────────────────────── */}
                    {(order.address || order.postalCode) && (
                        <div className={styles.expanded_section}>
                            <h4 className={styles.expanded_section__title}>📍 آدرس ارسال</h4>
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

                    {/* ── ستون ۳: اقلام سفارش ─────────────────────────────── */}
                    <div className={styles.expanded_section}>
                        <h4 className={styles.expanded_section__title}>🛒 اقلام سفارش</h4>
                        {order.items && order.items.length > 0 ? (
                            <div className={styles.items_list}>
                                {order.items.map((item, idx) => {
                                    const typeConfig = ITEM_TYPE_LABELS[item.__component] || { icon: '📌', label: 'قلم' };
                                    return (
                                        <div key={idx} className={styles.item_card}>
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
                                            <span className={styles.item_card__price}>{formatPrice(item.price)}</span>
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

                        {/* notes اگر وجود داشت */}
                        {order.notes && (
                            <div className={styles.expanded_notes}>
                                <span className={styles.expanded_field__label}>یادداشت:</span>
                                <pre className={styles.expanded_notes__text}>{order.notes}</pre>
                            </div>
                        )}
                    </div>

                </div>
            </td>
        </tr>
    );
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

// ── OrdersTable ──────────────────────────────────────────────────────────────

export default function OrdersTable({ initialOrders = [], initialMeta = null, initialStats = null, settlementStats = null }) {
    // ── State ──────────────────────────────────────────────────────────────────
    const [orders, setOrders] = useState(initialOrders);
    const [receiptModalOrder, setReceiptModal] = useState(null);
    const [statusModalOrder, setStatusModal] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterType, setFilterType] = useState('all'); // 'all' | 'pending' | 'paid' | 'canceled'
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
    const [isSettlementPanelOpen, setIsSettlementPanelOpen] = useState(true); // باز/بسته بودن پنل تسویه

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

    // ── Debounce Search Query ───────────────────────────────────────────────
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery.trim());
        }, 350);
        return () => clearTimeout(timer);
    }, [searchQuery]);

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
                    search: debouncedSearch,
                    period: activeSettlement ? undefined : periodFilter,
                    settlementId: activeSettlement ? (activeSettlement.id || activeSettlement.documentId) : undefined,
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
    }, [filterType, isStatusSorted, debouncedSearch, periodFilter, activeSettlement]);

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
                search: debouncedSearch,
                period: activeSettlement ? undefined : periodFilter,
                settlementId: activeSettlement ? (activeSettlement.id || activeSettlement.documentId) : undefined,
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
    }, [isLoadingMore, hasMore, isInitialLoading, orders.length, totalOrders, filterType, isStatusSorted, debouncedSearch, periodFilter, activeSettlement]);

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
            };
        }
        return {
            pending: orders.filter((o) => o.orderStatus === 'pending').length,
            paid: orders.filter(isPaidOrder).length,
            canceled: orders.filter(isCanceledOrder).length,
        };
    }, [initialStats, orders, periodFilter, activeSettlement]);

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
        'مبلغ (تومان)',
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
                                    <span className={styles.settlementStatItem__label}>مبلغ قابل تسویه:</span>
                                    <strong className={styles.settlementStatItem__valueSuccess}>
                                        {new Intl.NumberFormat('fa-IR').format(currentPeriodRevenue)} تومان
                                    </strong>
                                </div>
                                <div className={styles.settlementStatItem}>
                                    <span className={styles.settlementStatItem__label}>سفارش‌های آماده تسویه:</span>
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

            {/* ── نوار ابزار: تب‌های فیلتر وضعیت و جستجو ─────────────── */}
            <AdminToolbar>
                <div className={styles.filterTabs}>
                    <AdminButton
                        variant={filterType === 'all' ? 'edit' : 'default'}
                        onClick={() => setFilterType('all')}
                    >
                        همه ({new Intl.NumberFormat('fa-IR').format(filterType === 'all' ? totalOrders : (totalOrders || orders.length))})
                    </AdminButton>
                    <AdminButton
                        variant={filterType === 'pending' ? 'edit' : 'default'}
                        onClick={() => setFilterType('pending')}
                    >
                        در انتظار پرداخت ({new Intl.NumberFormat('fa-IR').format(counts.pending)})
                    </AdminButton>
                    <AdminButton
                        variant={filterType === 'paid' ? 'edit' : 'default'}
                        onClick={() => setFilterType('paid')}
                    >
                        پرداخت شده ({new Intl.NumberFormat('fa-IR').format(counts.paid)})
                    </AdminButton>
                    <AdminButton
                        variant={filterType === 'canceled' ? 'edit' : 'default'}
                        onClick={() => setFilterType('canceled')}
                    >
                        لغو شده ({new Intl.NumberFormat('fa-IR').format(counts.canceled)})
                    </AdminButton>

                    {/* دکمه‌های پاکسازی گروهی */}
                    {counts.canceled > 0 && (
                        <button
                            type="button"
                            className={styles.bulkDeleteBtn}
                            onClick={() => setBulkDeleteTarget('canceled')}
                            title="حذف دائمی تمام سفارش‌های رد شده"
                        >
                            <Trash2 size={13} />
                            <span>حذف ردشده‌ها ({new Intl.NumberFormat('fa-IR').format(counts.canceled)})</span>
                        </button>
                    )}

                    {counts.pending > 0 && (
                        <button
                            type="button"
                            className={styles.bulkDeletePendingBtn}
                            onClick={() => setBulkDeleteTarget('pending')}
                            title="حذف دائمی تمام سفارش‌های در انتظار پرداخت"
                        >
                            <Trash2 size={13} />
                            <span>حذف در انتظارها ({new Intl.NumberFormat('fa-IR').format(counts.pending)})</span>
                        </button>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <AdminSearch
                        placeholder="جستجو بر اساس شماره سفارش، کاربر یا موبایل..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <span className={styles.toolbar__count}>
                        {searchQuery.trim() || filterType !== 'all' || isStatusSorted
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
                            setFilterType('all');
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
                        const ordConf = ORDER_STATUS_CONFIG[order.orderStatus?.trim()] || ORDER_STATUS_CONFIG[order.orderStatus] || ORDER_STATUS_CONFIG.pending;
                        const isCardToCard = order.paymentMethod === 'card_to_card';
                        const needsReceiptApproval =
                            isCardToCard && order.paymentStatus === 'pending_verification';
                        const isExpanded = expandedId === order.id;

                        return (
                            <Fragment key={order.id}>
                                <tr
                                    className={`${styles.table__row} ${isExpanded ? styles['table__row--expanded'] : ''}`}
                                    onClick={() => toggleExpand(order.id)}
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
                                        {formatPriceRaw(order.totalPrice)}
                                    </td>

                                    {/* تاریخ */}
                                    <td className={styles.table__date}>
                                        {formatDateShort(order.createdAt)}
                                    </td>

                                    {/* عملیات */}
                                    <td>
                                        <div className={styles.actions}>
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

                                            <AdminButton
                                                variant="default"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setStatusModal(order);
                                                }}
                                                title="تغییر وضعیت سفارش"
                                            >
                                                وضعیت
                                            </AdminButton>
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
                count={bulkDeleteTarget === 'canceled' ? (counts.canceled || 0) : (counts.pending || 0)}
                onClose={() => setBulkDeleteTarget(null)}
                onSuccess={handleBulkDeleteSuccess}
            />
        </AdminTableContainer>
    );
}
