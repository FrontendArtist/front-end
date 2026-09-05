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
import ReceiptModal from './ReceiptModal';
import StatusUpdateModal from './StatusUpdateModal';
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

// ── OrdersTable ──────────────────────────────────────────────────────────────

export default function OrdersTable({ initialOrders = [], initialMeta = null }) {
    // ── State ──────────────────────────────────────────────────────────────────
    const [orders, setOrders] = useState(initialOrders);
    const [receiptModalOrder, setReceiptModal] = useState(null);
    const [statusModalOrder, setStatusModal] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedId, setExpandedId] = useState(null); // شناسه ردیف باز

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

    // ── متد دریافت صفحات بعدی (Lazy Loading: ۲۰ تا ۲۰ تا) ────────────────────
    const loadMoreOrders = useCallback(async () => {
        if (isLoadingMore || !hasMore) return;

        setIsLoadingMore(true);
        setLoadError(null);

        try {
            const data = await fetchAdminOrders({ start: orders.length, limit: 20 });

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
    }, [hasMore, isLoadingMore, orders.length, totalOrders]);

    // ── اتصال به اسکرول با IntersectionObserver ──────────────────────────────
    useEffect(() => {
        if (!hasMore || isLoadingMore) return;

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
    }, [hasMore, isLoadingMore, loadMoreOrders]);

    // ── فیلتر جستجو ──────────────────────────────────────────────────────────
    const filteredOrders = useMemo(() => {
        if (!searchQuery.trim()) return orders;
        const q = searchQuery.toLowerCase();
        return orders.filter(
            (o) =>
                o.orderNumber?.toLowerCase().includes(q) ||
                o.fullName?.toLowerCase().includes(q) ||
                o.cardHolderName?.toLowerCase().includes(q) ||
                o.user?.username?.toLowerCase().includes(q) ||
                o.user?.phoneNumber?.includes(q)
        );
    }, [orders, searchQuery]);

    function handleOrderUpdate(orderId, changes) {
        setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, ...changes } : o))
        );
    }

    function toggleExpand(orderId) {
        setExpandedId((prev) => (prev === orderId ? null : orderId));
    }

    // ── رندر خالی ──────────────────────────────────────────────────────────────
    if (orders.length === 0) {
        return (
            <div className={styles.empty}>
                <span>📋</span>
                <p>هیچ سفارشی ثبت نشده است.</p>
            </div>
        );
    }

    const COL_SPAN = 8; // تعداد ستون‌های جدول
    const headers = [
        <div style={{ width: 16 }}></div>,
        'شناسه', 'کاربر', 'روش پرداخت', 'وضعیت سفارش', 'مبلغ (تومان)', 'تاریخ', 'عملیات'
    ];

    return (
        <AdminTableContainer>

            {/* ── نوار جستجو ──────────────────────────────────────────────── */}
            <AdminToolbar>
                <AdminSearch
                    placeholder="جستجو بر اساس شماره سفارش، کاربر یا موبایل..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className={styles.toolbar__count}>
                    {searchQuery.trim()
                        ? `${new Intl.NumberFormat('fa-IR').format(filteredOrders.length)} سفارش یافته‌شده`
                        : `نمایش ${new Intl.NumberFormat('fa-IR').format(orders.length)} از ${new Intl.NumberFormat('fa-IR').format(totalOrders)} سفارش`}
                </span>
            </AdminToolbar>

            {/* ── جدول ────────────────────────────────────────────────────── */}
            <AdminTable headers={headers}>

                        {filteredOrders.map((order) => {
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
                                                        🧾 رسید
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
                                                    ✏️ وضعیت
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
        </AdminTableContainer>
    );
}
