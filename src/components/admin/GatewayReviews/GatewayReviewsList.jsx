'use client';

/**
 * @file src/components/admin/GatewayReviews/GatewayReviewsList.jsx
 * @description فهرست پرونده‌های رسیدگی به پرداخت سپ همراه با فیلتر، صفحه‌بندی و تنظیم آستانه
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    fetchGatewayReviews,
    fetchGatewayReviewSettings,
    saveGatewayReviewSettings,
    REASON_CONFIG,
    CASE_STATUS_CONFIG,
    TOPUP_STATUS_CONFIG,
    formatGatewayReviewError,
} from '@/lib/client/admin/gatewayReviewsClient';
import styles from './GatewayReviews.module.scss';

function formatDate(isoString) {
    if (!isoString) return '—';
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
}

export default function GatewayReviewsList({ initialData = null, initialSettings = 30 }) {
    const [cases, setCases] = useState(initialData?.data || []);
    const [pagination, setPagination] = useState(
        initialData?.pagination || { page: 1, pageSize: 25, total: 0 }
    );
    const [page, setPage] = useState(initialData?.pagination?.page || 1);
    const [pageSize, setPageSize] = useState(initialData?.pagination?.pageSize || 25);
    const [statusFilter, setStatusFilter] = useState('all');
    const [reasonFilter, setReasonFilter] = useState('all');

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    // تنظیمات آستانه کال‌بک
    const [thresholdInput, setThresholdInput] = useState(String(initialSettings || 30));
    const [savingThreshold, setSavingThreshold] = useState(false);
    const [thresholdSuccessMsg, setThresholdSuccessMsg] = useState(null);
    const [thresholdErrorMsg, setThresholdErrorMsg] = useState(null);

    // بارگذاری داده‌های پرونده‌ها
    const loadCases = useCallback(async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const res = await fetchGatewayReviews({
                page,
                pageSize,
                status: statusFilter,
                reasonCode: reasonFilter,
            });
            setCases(res.data || []);
            if (res.pagination) {
                setPagination(res.pagination);
            }
        } catch (err) {
            const parsed = formatGatewayReviewError(err);
            setErrorMsg(parsed.message);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, statusFilter, reasonFilter]);

    useEffect(() => {
        // اگر اولین رندر است و initialData داریم و هنوز فیلتر تغییر نکرده، مجدد فچ نکنیم
        if (initialData && page === initialData.pagination?.page && pageSize === initialData.pagination?.pageSize && statusFilter === 'all' && reasonFilter === 'all') {
            return;
        }
        loadCases();
    }, [loadCases]);

    // ذخیره آستانه
    const handleSaveThreshold = async (e) => {
        e.preventDefault();
        setThresholdErrorMsg(null);
        setThresholdSuccessMsg(null);

        const val = Number(thresholdInput);
        if (!Number.isInteger(val) || val < 1 || val > 1440) {
            setThresholdErrorMsg('مقدار آستانه باید یک عدد صحیح بین ۱ تا ۱۴۴۰ دقیقه باشد.');
            return;
        }

        setSavingThreshold(true);
        try {
            const updated = await saveGatewayReviewSettings(val);
            setThresholdInput(String(updated));
            setThresholdSuccessMsg(`آستانه عدم دریافت کال‌بک با موفقیت روی ${updated} دقیقه تنظیم شد.`);
            setTimeout(() => setThresholdSuccessMsg(null), 4000);
        } catch (err) {
            const parsed = formatGatewayReviewError(err);
            setThresholdErrorMsg(parsed.message);
        } finally {
            setSavingThreshold(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / pageSize));

    return (
        <div className={styles.page}>
            {/* سرصفحه */}
            <div className={styles.header}>
                <div className={styles.header__titleArea}>
                    <h1 className={styles.header__title}>رسیدگی به پرداخت‌های سپ</h1>
                    <span className={styles.header__badge}>
                        {new Intl.NumberFormat('fa-IR').format(pagination.total || 0)} پرونده
                    </span>
                </div>
                <div className={styles.header__actions}>
                    <button
                        type="button"
                        onClick={loadCases}
                        disabled={loading}
                        className={`${styles.btn} ${styles['btn--secondary']}`}
                    >
                        {loading ? 'در حال بارگذاری...' : '🔄 به‌روزرسانی'}
                    </button>
                </div>
            </div>

            {/* بخش تنظیم آستانه کال‌بک */}
            <div className={styles.thresholdCard}>
                <div className={styles.thresholdCard__info}>
                    <span className={styles.thresholdCard__title}>تنظیم آستانه بازگشایی خودکار پرونده (عدم دریافت کال‌بک)</span>
                    <span className={styles.thresholdCard__desc}>
                        اگر پس از صدور توکن پرداخت سپ تا این مدت کال‌بکی دریافت نشود، پرونده با علت NO_CALLBACK باز می‌شود (پیش‌فرض: ۳۰ دقیقه).
                    </span>
                </div>
                <form onSubmit={handleSaveThreshold} className={styles.thresholdCard__form}>
                    <input
                        type="number"
                        min="1"
                        max="1440"
                        step="1"
                        value={thresholdInput}
                        onChange={(e) => setThresholdInput(e.target.value)}
                        className={styles.thresholdCard__input}
                        aria-label="آستانه زمانی کال‌بک به دقیقه"
                        disabled={savingThreshold}
                    />
                    <span className={styles.thresholdCard__unit}>دقیقه</span>
                    <button
                        type="submit"
                        disabled={savingThreshold}
                        className={`${styles.btn} ${styles['btn--primary']}`}
                    >
                        {savingThreshold ? 'در حال ذخیره...' : 'ذخیره آستانه'}
                    </button>
                </form>
            </div>

            {thresholdSuccessMsg && (
                <div className={`${styles.alert} ${styles['alert--success']}`}>
                    <span>✅</span>
                    <span>{thresholdSuccessMsg}</span>
                </div>
            )}

            {thresholdErrorMsg && (
                <div className={`${styles.alert} ${styles['alert--error']}`}>
                    <span>⚠️</span>
                    <span>{thresholdErrorMsg}</span>
                </div>
            )}

            {/* نوار فیلترها */}
            <div className={styles.filters}>
                <div className={styles.filters__group}>
                    <label htmlFor="status-filter" className={styles.filters__label}>
                        وضعیت پرونده:
                    </label>
                    <select
                        id="status-filter"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                        }}
                        className={styles.filters__select}
                    >
                        <option value="all">همه وضعیت‌ها</option>
                        <option value="open">باز (در انتظار رسیدگی)</option>
                        <option value="resolved">رسیدگی‌شده</option>
                    </select>
                </div>

                <div className={styles.filters__group}>
                    <label htmlFor="reason-filter" className={styles.filters__label}>
                        علت پرونده:
                    </label>
                    <select
                        id="reason-filter"
                        value={reasonFilter}
                        onChange={(e) => {
                            setReasonFilter(e.target.value);
                            setPage(1);
                        }}
                        className={styles.filters__select}
                    >
                        <option value="all">همه علت‌ها</option>
                        <option value="NO_CALLBACK">عدم دریافت کال‌بک (NO_CALLBACK)</option>
                        <option value="VERIFY_UNKNOWN">استعلام نامعلوم (VERIFY_UNKNOWN)</option>
                        <option value="REVERSE_UNKNOWN">برگشت نامعلوم (REVERSE_UNKNOWN)</option>
                        <option value="DELIVERY_UNKNOWN">تحویل نامعلوم (DELIVERY_UNKNOWN)</option>
                        <option value="BANK_CONFLICT">مغایرت بانکی (BANK_CONFLICT)</option>
                    </select>
                </div>

                <div className={styles.filters__group}>
                    <label htmlFor="pagesize-select" className={styles.filters__label}>
                        تعداد در صفحه:
                    </label>
                    <select
                        id="pagesize-select"
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setPage(1);
                        }}
                        className={styles.filters__select}
                    >
                        <option value={10}>۱۰</option>
                        <option value={25}>۲۵</option>
                        <option value={50}>۵۰</option>
                    </select>
                </div>
            </div>

            {errorMsg && (
                <div className={`${styles.alert} ${styles['alert--error']}`}>
                    <span>⚠️</span>
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* جدول پرونده‌ها */}
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>شماره ارجاع مشتری (ResNum)</th>
                            <th>شناسه پرونده</th>
                            <th>علت ارجاع</th>
                            <th>وضعیت پرونده</th>
                            <th>وضعیت شارژ</th>
                            <th>زمان بازشدن</th>
                            <th>وضعیت تحویل</th>
                            <th>عملیات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && cases.length === 0 ? (
                            <tr>
                                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                                    در حال دریافت پرونده‌ها...
                                </td>
                            </tr>
                        ) : cases.length === 0 ? (
                            <tr>
                                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                    هیچ پرونده‌ای با شرایط انتخابی یافت نشد.
                                </td>
                            </tr>
                        ) : (
                            cases.map((c) => {
                                const reasonMeta = REASON_CONFIG[c.reasonCode] || { label: c.reasonCode, variant: 'default' };
                                const statusMeta = CASE_STATUS_CONFIG[c.status] || { label: c.status, variant: 'default' };
                                const topUpKey = c.topUpStatus === null ? 'null' : c.topUpStatus;
                                const topUpMeta = TOPUP_STATUS_CONFIG[topUpKey] || { label: c.topUpStatus || 'نامعلوم', variant: 'default' };

                                return (
                                    <tr key={c.caseId || c.clientReferenceCode}>
                                        <td className={styles.codeCell}>{c.clientReferenceCode}</td>
                                        <td style={{ fontSize: '0.8rem', color: '#6b7280' }}>{c.caseId}</td>
                                        <td>
                                            <span className={`${styles.badge} ${styles[`badge--${reasonMeta.variant}`]}`}>
                                                {reasonMeta.label}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`${styles.badge} ${styles[`badge--${statusMeta.variant}`]}`}>
                                                {statusMeta.label}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`${styles.badge} ${styles[`badge--${topUpMeta.variant}`]}`}>
                                                {topUpMeta.label}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                            {formatDate(c.openedAtUtc)}
                                        </td>
                                        <td>
                                            {c.deliveryStatus ? (
                                                <span
                                                    className={`${styles.badge} ${
                                                        c.deliveryStatus === 'delivered'
                                                            ? styles['badge--success']
                                                            : c.deliveryStatus === 'failed'
                                                            ? styles['badge--error']
                                                            : styles['badge--warning']
                                                    }`}
                                                >
                                                    {c.deliveryStatus === 'delivered'
                                                        ? 'تحویل داده شده'
                                                        : c.deliveryStatus === 'failed'
                                                        ? 'ناموفق'
                                                        : c.deliveryStatus}
                                                </span>
                                            ) : (
                                                <span style={{ color: '#9ca3af' }}>—</span>
                                            )}
                                            {c.deliveryError && (
                                                <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '2px' }}>
                                                    {c.deliveryError}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <Link
                                                href={`/admin/gateway-reviews/${encodeURIComponent(c.clientReferenceCode)}`}
                                                className={`${styles.btn} ${styles['btn--secondary']}`}
                                                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                                            >
                                                {c.status === 'open' ? 'رسیدگی و جزئیات 🔍' : 'مشاهده جزئیات 📄'}
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* کنترل‌های صفحه‌بندی */}
            {totalPages > 1 && (
                <div className={styles.pagination}>
                    <div className={styles.pagination__info}>
                        صفحه {new Intl.NumberFormat('fa-IR').format(page)} از {new Intl.NumberFormat('fa-IR').format(totalPages)} (مجموع: {new Intl.NumberFormat('fa-IR').format(pagination.total || 0)} مورد)
                    </div>
                    <div className={styles.pagination__controls}>
                        <button
                            type="button"
                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            disabled={page <= 1 || loading}
                            className={styles.pagination__btn}
                        >
                            قبلی
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum = page;
                            if (totalPages <= 5) pageNum = i + 1;
                            else if (page <= 3) pageNum = i + 1;
                            else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                            else pageNum = page - 2 + i;

                            return (
                                <button
                                    key={pageNum}
                                    type="button"
                                    onClick={() => setPage(pageNum)}
                                    className={`${styles.pagination__btn} ${page === pageNum ? styles['pagination__btn--active'] : ''}`}
                                    disabled={loading}
                                >
                                    {new Intl.NumberFormat('fa-IR').format(pageNum)}
                                </button>
                            );
                        })}
                        <button
                            type="button"
                            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={page >= totalPages || loading}
                            className={styles.pagination__btn}
                        >
                            بعدی
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

