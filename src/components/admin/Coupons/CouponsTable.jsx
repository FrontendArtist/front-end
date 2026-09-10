'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Ticket,
    CheckCircle2,
    Clock,
    AlertCircle,
    Copy,
    Check,
    Edit,
    Trash2,
    Plus,
    Percent,
    Coins,
} from 'lucide-react';
import styles from './Coupons.module.scss';
import AdminSearch from '../Shared/AdminSearch';
import { AdminTableContainer, AdminTable, AdminToolbar } from '../Shared/AdminTable';
import AdminBadge from '../Shared/AdminBadge';
import AdminButton from '../Shared/AdminButton';
import AdminLazyLoad from '../Shared/AdminLazyLoad';
import { useAdminLazyLoad } from '../Shared/useAdminLazyLoad';
import { fetchAdminCoupons, toggleCouponStatus, deleteCoupon } from '@/lib/client/admin/couponsClient';

function useToast() {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'success') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3500);
    }, []);

    return { toasts, addToast };
}

const TABLE_HEADERS = [
    'کد تخفیف',
    'عنوان و توضیحات',
    'میزان تخفیف',
    'شمول تخفیف',
    'مصرف (دفعات)',
    'تاریخ انقضا',
    'وضعیت',
    'عملیات',
];

export default function CouponsTable({ initialCoupons = [], initialMeta = null }) {
    const router = useRouter();
    const { toasts, addToast } = useToast();

    const {
        items: coupons,
        setItems: setCoupons,
        total: totalCoupons,
        hasMore,
        isLoading: isLoadingMore,
        loadError,
        loadMore: loadMoreCoupons,
        sentinelRef,
    } = useAdminLazyLoad({
        initialItems: initialCoupons,
        initialMeta,
        fetchFn: fetchAdminCoupons,
        chunkSize: 20,
        idKey: 'documentId',
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // all | active | expired | limit_reached | percentage | fixed
    const [loadingToggle, setLoadingToggle] = useState({});
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [copiedCode, setCopiedCode] = useState(null);

    const formatPrice = (num) => new Intl.NumberFormat('fa-IR').format(num || 0);

    const formatDate = (isoString) => {
        if (!isoString) return 'بدون انقضا';
        try {
            const date = new Date(isoString);
            return new Intl.DateTimeFormat('fa-IR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }).format(date);
        } catch {
            return isoString;
        }
    };

    const isExpired = (expiresAt) => {
        if (!expiresAt) return false;
        return new Date(expiresAt) < new Date();
    };

    const isLimitReached = (coupon) => {
        if (!coupon.maxUsage || coupon.maxUsage <= 0) return false;
        return (coupon.usedCount || 0) >= coupon.maxUsage;
    };

    // ── Metrics Calculation ──────────────────────────────────────────────────
    const metrics = useMemo(() => {
        const total = coupons.length;
        const active = coupons.filter((c) => c.isActive && !isExpired(c.expiresAt) && !isLimitReached(c)).length;
        const expired = coupons.filter((c) => isExpired(c.expiresAt)).length;
        const totalUsed = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);
        return { total, active, expired, totalUsed };
    }, [coupons]);

    // ── Filtered Coupons ─────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        return coupons.filter((c) => {
            // Search Query filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchCode = c.code?.toLowerCase().includes(q);
                const matchTitle = c.title?.toLowerCase().includes(q);
                if (!matchCode && !matchTitle) return false;
            }

            // Tab filter
            if (activeTab === 'active') {
                return c.isActive && !isExpired(c.expiresAt) && !isLimitReached(c);
            }
            if (activeTab === 'expired') {
                return isExpired(c.expiresAt);
            }
            if (activeTab === 'limit_reached') {
                return isLimitReached(c);
            }
            if (activeTab === 'percentage') {
                return c.discountType === 'percentage';
            }
            if (activeTab === 'fixed') {
                return c.discountType === 'fixed';
            }

            return true;
        });
    }, [coupons, searchQuery, activeTab]);

    // ── Copy Code ────────────────────────────────────────────────────────────
    const handleCopy = (code) => {
        if (!code) return;
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        addToast(`کد "${code}" در کلیپ‌بورد کپی شد`, 'info');
        setTimeout(() => setCopiedCode(null), 2500);
    };

    // ── Toggle Status ────────────────────────────────────────────────────────
    async function handleToggle(coupon) {
        const docId = coupon.documentId;
        if (loadingToggle[docId]) return;

        const nextVal = !coupon.isActive;

        // Optimistic update
        setCoupons((prev) =>
            prev.map((c) => (c.documentId === docId ? { ...c, isActive: nextVal } : c))
        );
        setLoadingToggle((prev) => ({ ...prev, [docId]: true }));

        try {
            await toggleCouponStatus(docId, nextVal);
            addToast(`وضعیت کد "${coupon.code}" به ${nextVal ? 'فعال' : 'غیرفعال'} تغییر یافت.`);
        } catch (err) {
            // Revert
            setCoupons((prev) =>
                prev.map((c) => (c.documentId === docId ? { ...c, isActive: !nextVal } : c))
            );
            addToast(err.message || 'خطا در تغییر وضعیت کد تخفیف', 'error');
        } finally {
            setLoadingToggle((prev) => ({ ...prev, [docId]: false }));
        }
    }

    // ── Delete Coupon ────────────────────────────────────────────────────────
    async function handleDeleteConfirm() {
        if (!deleteTarget) return;
        setDeleteLoading(true);

        try {
            await deleteCoupon(deleteTarget.documentId);
            setCoupons((prev) => prev.filter((c) => c.documentId !== deleteTarget.documentId));
            addToast(`کد تخفیف "${deleteTarget.code}" با موفقیت حذف گردید.`);
            setDeleteTarget(null);
        } catch (err) {
            addToast(err.message || 'خطا در حذف کد تخفیف', 'error');
        } finally {
            setDeleteLoading(false);
        }
    }

    return (
        <div>
            {/* ── Toast Notifications ────────────────────────────────────────── */}
            <div style={{ position: 'fixed', bottom: '24px', left: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        style={{
                            padding: '12px 18px',
                            borderRadius: '8px',
                            background: t.type === 'error' ? '#ef4444' : t.type === 'info' ? '#3b82f6' : '#10b981',
                            color: '#fff',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                        }}
                    >
                        {t.message}
                    </div>
                ))}
            </div>

            {/* ── Metric Stats Cards ─────────────────────────────────────────── */}
            <div className={styles.statsRow}>
                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.primary}`}>
                        <Ticket />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statTitle}>کل کدهای تعریف شده</span>
                        <span className={styles.statValue}>{formatPrice(metrics.total)}</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.success}`}>
                        <CheckCircle2 />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statTitle}>کدهای فعال و معتبر</span>
                        <span className={styles.statValue}>{formatPrice(metrics.active)}</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.danger}`}>
                        <Clock />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statTitle}>کدهای منقضی شده</span>
                        <span className={styles.statValue}>{formatPrice(metrics.expired)}</span>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={`${styles.statIcon} ${styles.info}`}>
                        <Coins />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statTitle}>مجموع دفعات استفاده</span>
                        <span className={styles.statValue}>{formatPrice(metrics.totalUsed)} بار</span>
                    </div>
                </div>
            </div>

            {/* ── Toolbar & Quick Filters ────────────────────────────────────── */}
            <AdminToolbar>
                <div style={{ flex: 1, maxWidth: '400px' }}>
                    <AdminSearch
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="جستجو بر اساس کد تخفیف یا عنوان..."
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link
                        href="/admin/coupons/new"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '0.65rem 1.25rem',
                            background: 'linear-gradient(135deg, #ffd166, #f59e0b)',
                            color: '#0f172a',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
                        }}
                    >
                        <Plus size={16} />
                        کد تخفیف جدید
                    </Link>
                </div>
            </AdminToolbar>

            {/* ── Filter Tabs ────────────────────────────────────────────────── */}
            <div className={styles.filterTabs}>
                <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`${styles.filterTab} ${activeTab === 'all' ? styles.active : ''}`}
                >
                    همه ({formatPrice(coupons.length)})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('active')}
                    className={`${styles.filterTab} ${activeTab === 'active' ? styles.active : ''}`}
                >
                    فعال و معتبر ({formatPrice(metrics.active)})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('percentage')}
                    className={`${styles.filterTab} ${activeTab === 'percentage' ? styles.active : ''}`}
                >
                    درصدی (%)
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('fixed')}
                    className={`${styles.filterTab} ${activeTab === 'fixed' ? styles.active : ''}`}
                >
                    مبلغ ثابت (تومان)
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('expired')}
                    className={`${styles.filterTab} ${activeTab === 'expired' ? styles.active : ''}`}
                >
                    منقضی شده
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('limit_reached')}
                    className={`${styles.filterTab} ${activeTab === 'limit_reached' ? styles.active : ''}`}
                >
                    ظرفیت پر شده
                </button>
            </div>

            {/* ── Table Container ────────────────────────────────────────────── */}
            <AdminTableContainer>
                {filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                        {searchQuery ? 'هیچ کد تخفیفی با این عبارت یافت نشد.' : 'هنوز هیچ کد تخفیفی ثبت نشده است.'}
                    </div>
                ) : (
                    <AdminTable headers={TABLE_HEADERS}>
                        {filtered.map((coupon) => {
                            const expired = isExpired(coupon.expiresAt);
                            const limitReached = isLimitReached(coupon);
                            const usageRatio = coupon.maxUsage ? Math.min(100, Math.round(((coupon.usedCount || 0) / coupon.maxUsage) * 100)) : 0;

                            return (
                                    <tr key={coupon.documentId || coupon.id}>
                                        {/* کد تخفیف */}
                                        <td>
                                            <div className={styles.codeChip}>
                                                <span>{coupon.code}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(coupon.code)}
                                                    className={styles.copyBtn}
                                                    title="کپی کد"
                                                >
                                                    {copiedCode === coupon.code ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                                                </button>
                                            </div>
                                        </td>

                                        {/* عنوان */}
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>
                                                    {coupon.title || 'بدون عنوان'}
                                                </span>
                                                {coupon.minOrderAmount && (
                                                    <span style={{ fontSize: '0.725rem', color: 'rgba(255,255,255,0.5)' }}>
                                                        حداقل سفارش: {formatPrice(coupon.minOrderAmount)} تومان
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* میزان تخفیف */}
                                        <td>
                                            {coupon.discountType === 'percentage' ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <AdminBadge variant="warning">
                                                        {coupon.discountValue}٪ تخفیف
                                                    </AdminBadge>
                                                    {coupon.maxDiscountAmount && (
                                                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
                                                            سقف: {formatPrice(coupon.maxDiscountAmount)} تومان
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <AdminBadge variant="success">
                                                    {formatPrice(coupon.discountValue)} تومان
                                                </AdminBadge>
                                            )}
                                        </td>

                                        {/* شمول */}
                                        <td>
                                            <div className={styles.targetBadgeGroup}>
                                                {coupon.appliesToAllProducts && coupon.appliesToAllCourses ? (
                                                    <span className={`${styles.targetTag} ${styles.all}`}>همه محصولات و دوره‌ها</span>
                                                ) : (
                                                    <>
                                                        {coupon.appliesToAllProducts && (
                                                            <span className={`${styles.targetTag} ${styles.all}`}>همه محصولات</span>
                                                        )}
                                                        {coupon.appliesToAllCourses && (
                                                            <span className={`${styles.targetTag} ${styles.all}`}>همه دوره‌ها</span>
                                                        )}
                                                        {!coupon.appliesToAllProducts && coupon.products?.length > 0 && (
                                                            <span className={styles.targetTag}>
                                                                {coupon.products.length} محصول خاص
                                                            </span>
                                                        )}
                                                        {!coupon.appliesToAllCourses && coupon.courses?.length > 0 && (
                                                            <span className={styles.targetTag}>
                                                                {coupon.courses.length} دوره خاص
                                                            </span>
                                                        )}
                                                        {!coupon.appliesToAllProducts && !coupon.appliesToAllCourses && coupon.products?.length === 0 && coupon.courses?.length === 0 && (
                                                            <span className={styles.targetTag} style={{ color: '#f87171' }}>نامشخص</span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>

                                        {/* مصرف */}
                                        <td>
                                            <div className={styles.usageProgressWrapper}>
                                                <span className={styles.usageText}>
                                                    {formatPrice(coupon.usedCount || 0)} {coupon.maxUsage ? `از ${formatPrice(coupon.maxUsage)}` : 'بار (نامحدود)'}
                                                </span>
                                                {coupon.maxUsage ? (
                                                    <div className={styles.progressBarBg}>
                                                        <div
                                                            className={`${styles.progressBarFill} ${usageRatio >= 100 ? styles.full : usageRatio >= 80 ? styles.warning : styles.normal}`}
                                                            style={{ width: `${usageRatio}%` }}
                                                        />
                                                    </div>
                                                ) : null}
                                            </div>
                                        </td>

                                        {/* تاریخ انقضا */}
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '0.8rem', color: expired ? '#f87171' : 'rgba(255,255,255,0.8)' }}>
                                                    {formatDate(coupon.expiresAt)}
                                                </span>
                                                {expired && (
                                                    <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>
                                                        (منقضی شده)
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* وضعیت فعال */}
                                        <td>
                                            <label className={styles.toggleSwitch}>
                                                <input
                                                    type="checkbox"
                                                    checked={coupon.isActive}
                                                    onChange={() => handleToggle(coupon)}
                                                    disabled={loadingToggle[coupon.documentId]}
                                                />
                                                <span className={styles.slider}></span>
                                            </label>
                                        </td>

                                        {/* عملیات */}
                                        <td>
                                            <div className={styles.actionBtnGroup} style={{ justifyContent: 'center' }}>
                                                <Link
                                                    href={`/admin/coupons/${coupon.documentId || coupon.id}`}
                                                    className={`${styles.iconBtn} ${styles.edit}`}
                                                    title="ویرایش کد تخفیف"
                                                >
                                                    <Edit size={15} />
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteTarget(coupon)}
                                                    className={`${styles.iconBtn} ${styles.delete}`}
                                                    title="حذف کد تخفیف"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                    </AdminTable>
                )}

                {/* ── Lazy Loading Sentinel ───────────────────────────────────── */}
                <AdminLazyLoad
                    sentinelRef={sentinelRef}
                    hasMore={hasMore}
                    isLoading={isLoadingMore}
                    loadError={loadError}
                    onRetry={loadMoreCoupons}
                    currentCount={coupons.length}
                    totalCount={totalCoupons}
                />
            </AdminTableContainer>

            {/* ── Delete Confirmation Modal ──────────────────────────────────── */}
            {deleteTarget && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '1rem',
                    }}
                >
                    <div
                        style={{
                            background: '#1e293b',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            padding: '1.75rem',
                            maxWidth: '450px',
                            width: '100%',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', marginBottom: '1rem' }}>
                            <AlertCircle size={24} />
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>حذف کد تخفیف</h3>
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                            آیا از حذف کد تخفیف <strong>"{deleteTarget.code}"</strong> مطمئن هستید؟ این عملیات غیرقابل بازگشت است.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleteLoading}
                                style={{
                                    padding: '0.6rem 1rem',
                                    borderRadius: '6px',
                                    background: 'rgba(255,255,255,0.1)',
                                    color: '#fff',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                }}
                            >
                                انصراف
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                disabled={deleteLoading}
                                style={{
                                    padding: '0.6rem 1.25rem',
                                    borderRadius: '6px',
                                    background: '#ef4444',
                                    color: '#fff',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                }}
                            >
                                {deleteLoading ? 'در حال حذف...' : 'بله، حذف شود'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
