'use client';

/**
 * @file src/components/admin/GatewayReviews/GatewayReviewDetail.jsx
 * @description نمای جزئیات پرونده رسیدگی به پرداخت، تاریخچه شواهد و فرم ارسال نتیجه رسیدگی
 */

import React, { useState } from 'react';
import Link from 'next/link';
import {
    resolveGatewayReview,
    REASON_CONFIG,
    CASE_STATUS_CONFIG,
    TOPUP_STATUS_CONFIG,
    OUTCOME_CONFIG,
    EVIDENCE_STAGE_LABELS,
    formatGatewayReviewError,
} from '@/lib/client/admin/gatewayReviewsClient';
import styles from './GatewayReviews.module.scss';

function formatDate(isoString) {
    if (!isoString) return '—';
    try {
        const date = new Date(isoString);
        return new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }).format(date);
    } catch {
        return isoString;
    }
}

export default function GatewayReviewDetail({ initialCase }) {
    const [caseData, setCaseData] = useState(initialCase);
    const [outcomeCode, setOutcomeCode] = useState('');
    const [financialRef, setFinancialRef] = useState('');
    const [validationError, setValidationError] = useState(null);

    // وضعیت ارسال و نتیجه
    const [submitting, setSubmitting] = useState(false);
    const [serverError, setServerError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // مودال تأیید
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    if (!caseData) {
        return (
            <div className={styles.page}>
                <div className={`${styles.alert} ${styles['alert--error']}`}>
                    <span>⚠️</span>
                    <span>پرونده مورد نظر یافت نشد.</span>
                </div>
                <Link href="/admin/gateway-reviews" className={`${styles.btn} ${styles['btn--secondary']}`}>
                    ← بازگشت به فهرست پرونده‌ها
                </Link>
            </div>
        );
    }

    const isOpen = caseData.status === 'open';
    const reasonMeta = REASON_CONFIG[caseData.reasonCode] || { label: caseData.reasonCode, variant: 'default' };
    const statusMeta = CASE_STATUS_CONFIG[caseData.status] || { label: caseData.status, variant: 'default' };
    const topUpKey = caseData.topUpStatus === null ? 'null' : caseData.topUpStatus;
    const topUpMeta = TOPUP_STATUS_CONFIG[topUpKey] || { label: caseData.topUpStatus || 'نامعلوم', variant: 'default' };

    // باز کردن مودال تأیید با اعتبارسنجی اولیه
    const handleInitiateResolution = (e) => {
        e.preventDefault();
        setValidationError(null);
        setServerError(null);

        if (!isOpen) {
            setValidationError('این پرونده در وضعیت باز قرار ندارد و امکان رسیدگی مجدد ندارد.');
            return;
        }

        if (!outcomeCode) {
            setValidationError('لطفاً نتیجه رسیدگی را انتخاب کنید.');
            return;
        }

        if (outcomeCode === 'UNPAID_REJECTED') {
            if (financialRef && financialRef.trim() !== '') {
                setValidationError('برای رد شارژ پرداخت‌نشده، شناسه مرجع مالی باید خالی باشد.');
                return;
            }
        } else {
            if (!financialRef || !financialRef.trim()) {
                setValidationError('برای این نتیجه، وارد کردن شناسه مرجع مالی بانکی الزامی است.');
                return;
            }
        }

        setShowConfirmModal(true);
    };

    // ارسال نهایی بعد از تأیید کاربر
    const handleConfirmResolution = async () => {
        setShowConfirmModal(false);
        setSubmitting(true);
        setServerError(null);
        setSuccessMessage(null);

        try {
            const updatedCase = await resolveGatewayReview(caseData.clientReferenceCode, {
                outcomeCode,
                resolutionFinancialReferenceId: outcomeCode === 'UNPAID_REJECTED' ? null : financialRef.trim(),
            });

            // پاسخ موفق خود شیء پرونده است
            if (updatedCase) {
                setCaseData(updatedCase);
            }
            setSuccessMessage('نتیجه رسیدگی با موفقیت ثبت شد و وضعیت پرونده به‌روزرسانی گردید.');
        } catch (err) {
            const formatted = formatGatewayReviewError(err);
            setServerError(formatted);
            // توجه: پرونده را خودکار حل‌شده فرض نمی‌کنیم
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={styles.page}>
            {/* سرصفحه با دکمه بازگشت */}
            <div className={styles.header}>
                <div className={styles.header__titleArea}>
                    <Link
                        href="/admin/gateway-reviews"
                        className={`${styles.btn} ${styles['btn--secondary']}`}
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                    >
                        ← بازگشت به فهرست
                    </Link>
                    <h1 className={styles.header__title}>
                        رسیدگی به پرونده: {caseData.clientReferenceCode}
                    </h1>
                </div>
                <div className={styles.header__actions}>
                    <span className={`${styles.badge} ${styles[`badge--${statusMeta.variant}`]}`}>
                        {statusMeta.label}
                    </span>
                    <span className={`${styles.badge} ${styles[`badge--${reasonMeta.variant}`]}`}>
                        علت: {reasonMeta.label}
                    </span>
                </div>
            </div>

            {/* کارت مشخصات پرونده */}
            <div className={styles.detailCard}>
                <h2 className={styles.detailCard__title}>📌 مشخصات و وضعیت پرونده</h2>
                <div className={styles.detailCard__grid}>
                    <div className={styles.detailCard__item}>
                        <span className={styles.detailCard__label}>شماره ارجاع مشتری (ResNum)</span>
                        <span className={styles.codeCell}>{caseData.clientReferenceCode}</span>
                    </div>

                    <div className={styles.detailCard__item}>
                        <span className={styles.detailCard__label}>شناسه سیستمی پرونده (Case ID)</span>
                        <span className={styles.detailCard__value}>{caseData.caseId}</span>
                    </div>

                    <div className={styles.detailCard__item}>
                        <span className={styles.detailCard__label}>شناسه درخواست شارژ (TopUp Request ID)</span>
                        <span className={styles.detailCard__value}>{caseData.topUpRequestId || '—'}</span>
                    </div>

                    <div className={styles.detailCard__item}>
                        <span className={styles.detailCard__label}>وضعیت شارژ کاربر</span>
                        <span className={`${styles.badge} ${styles[`badge--${topUpMeta.variant}`]}`}>
                            {topUpMeta.label}
                        </span>
                    </div>

                    <div className={styles.detailCard__item}>
                        <span className={styles.detailCard__label}>زمان بازشدن پرونده</span>
                        <span className={styles.detailCard__value}>{formatDate(caseData.openedAtUtc)}</span>
                    </div>

                    <div className={styles.detailCard__item}>
                        <span className={styles.detailCard__label}>زمان رسیدگی / بسته شدن</span>
                        <span className={styles.detailCard__value}>
                            {caseData.resolvedAtUtc ? formatDate(caseData.resolvedAtUtc) : 'هنوز رسیدگی نشده'}
                        </span>
                    </div>

                    <div className={styles.detailCard__item}>
                        <span className={styles.detailCard__label}>نتیجه نهایی رسیدگی (Outcome)</span>
                        <span className={styles.detailCard__value}>
                            {caseData.outcomeCode ? (
                                <span className={`${styles.badge} ${styles[`badge--${OUTCOME_CONFIG[caseData.outcomeCode]?.variant || 'info'}`]}`}>
                                    {OUTCOME_CONFIG[caseData.outcomeCode]?.label || caseData.outcomeCode}
                                </span>
                            ) : (
                                '—'
                            )}
                        </span>
                    </div>

                    <div className={styles.detailCard__item}>
                        <span className={styles.detailCard__label}>شناسه مرجع مالی نهایی (RRN / Ref ID)</span>
                        <span className={styles.codeCell}>
                            {caseData.resolutionFinancialReferenceId || '—'}
                        </span>
                    </div>

                    <div className={styles.detailCard__item}>
                        <span className={styles.detailCard__label}>وضعیت تحویل اعلان به سیستم مالی</span>
                        <span className={styles.detailCard__value}>
                            {caseData.deliveryStatus ? (
                                <span
                                    className={`${styles.badge} ${
                                        caseData.deliveryStatus === 'delivered'
                                            ? styles['badge--success']
                                            : caseData.deliveryStatus === 'failed'
                                            ? styles['badge--error']
                                            : styles['badge--warning']
                                    }`}
                                >
                                    {caseData.deliveryStatus === 'delivered'
                                        ? 'تحویل داده شده'
                                        : caseData.deliveryStatus === 'failed'
                                        ? 'ناموفق'
                                        : caseData.deliveryStatus}
                                </span>
                            ) : (
                                '—'
                            )}
                        </span>
                    </div>

                    {caseData.deliveryError && (
                        <div className={styles.detailCard__item} style={{ gridColumn: '1 / -1' }}>
                            <span className={styles.detailCard__label} style={{ color: '#dc2626' }}>خطای تحویل</span>
                            <span className={styles.detailCard__value} style={{ color: '#dc2626' }}>
                                {caseData.deliveryError}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* بخش ارسال نتیجه رسیدگی (فقط برای پرونده باز) */}
            {isOpen ? (
                <div className={styles.resolutionSection}>
                    <div className={styles.resolutionSection__header}>
                        <h2 className={styles.resolutionSection__title}>⚖️ ثبت نتیجه رسیدگی به پرونده</h2>
                        <span className={`${styles.badge} ${styles['badge--warning']}`}>
                            پرونده باز است و نیاز به تعیین تکلیف دارد
                        </span>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: '#4b5563', margin: 0 }}>
                        پس از بررسی مدارک و پنل درگاه، یکی از نتایج زیر را انتخاب کنید. پس از ثبت قطعی، وضعیت برای سرویس مالی ارسال و پرونده بسته خواهد شد.
                    </p>

                    <form onSubmit={handleInitiateResolution} className={styles.resolutionSection__form}>
                        <div className={styles.resolutionSection__field}>
                            <label htmlFor="outcome-select" className={styles.resolutionSection__label}>
                                نتیجه رسیدگی:
                            </label>
                            <select
                                id="outcome-select"
                                value={outcomeCode}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setOutcomeCode(val);
                                    if (val === 'UNPAID_REJECTED') {
                                        setFinancialRef('');
                                    }
                                }}
                                className={styles.resolutionSection__select}
                                disabled={submitting}
                            >
                                <option value="">-- لطفاً نتیجه را مشخص کنید --</option>
                                <option value="PAID_AND_CONFIRMED">
                                    پرداخت موفق و تأیید شارژ (PAID_AND_CONFIRMED)
                                </option>
                                <option value="UNPAID_REJECTED">
                                    پرداخت‌نشده و رد شارژ (UNPAID_REJECTED)
                                </option>
                                <option value="REVERSED_REJECTED">
                                    برگشت‌خورده و رد شارژ (REVERSED_REJECTED)
                                </option>
                            </select>
                            {outcomeCode && (
                                <span className={styles.resolutionSection__hint}>
                                    💡 {OUTCOME_CONFIG[outcomeCode]?.description}
                                </span>
                            )}
                        </div>

                        <div className={styles.resolutionSection__field}>
                            <label htmlFor="financial-ref-input" className={styles.resolutionSection__label}>
                                شناسه مرجع مالی درگاه (RRN / RefNum / شناسه پیگیری برگشت):
                            </label>
                            <input
                                id="financial-ref-input"
                                type="text"
                                value={financialRef}
                                onChange={(e) => setFinancialRef(e.target.value)}
                                placeholder={
                                    outcomeCode === 'UNPAID_REJECTED'
                                        ? 'برای پرداخت‌نشده مرجع مالی ارسال نمی‌شود (خالی بماند)'
                                        : 'مثال: 123456789012'
                                }
                                disabled={submitting || outcomeCode === 'UNPAID_REJECTED'}
                                className={styles.resolutionSection__input}
                            />
                            <span className={styles.resolutionSection__hint}>
                                {outcomeCode === 'UNPAID_REJECTED'
                                    ? 'برای نتیجه "پرداخت‌نشده و رد شارژ"، مقدار مرجع به عنوان null فرستاده می‌شود.'
                                    : 'شناسه مرجع برای تایید واریز یا رهگیری برگشت بانکی ضروری است.'}
                            </span>
                        </div>

                        {validationError && (
                            <div className={`${styles.alert} ${styles['alert--warning']}`}>
                                <span>⚠️</span>
                                <span>{validationError}</span>
                            </div>
                        )}

                        {serverError && (
                            <div
                                className={`${styles.alert} ${
                                    serverError.isUnknownOutcome
                                        ? styles['alert--warning']
                                        : styles['alert--error']
                                }`}
                            >
                                <span>{serverError.isUnknownOutcome ? '❓' : '❌'}</span>
                                <div>
                                    <strong>{serverError.isUnknownOutcome ? 'نتیجه نامعلوم:' : 'خطا در ثبت نتیجه:'}</strong>{' '}
                                    {serverError.message}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '0.5rem' }}>
                            <button
                                type="submit"
                                disabled={submitting || !outcomeCode}
                                className={`${styles.btn} ${styles['btn--primary']}`}
                            >
                                {submitting ? 'در حال ثبت رسیدگی...' : 'ثبت نتیجه رسیدگی'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className={`${styles.alert} ${styles['alert--success']}`}>
                    <span>✅</span>
                    <div>
                        <strong>این پرونده قبلاً رسیدگی و بسته شده است.</strong>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>
                            نتیجه ثبت‌شده: {OUTCOME_CONFIG[caseData.outcomeCode]?.label || caseData.outcomeCode} |
                            مرجع مالی: {caseData.resolutionFinancialReferenceId || 'ندارد (رد پرداخت‌نشده)'}
                        </p>
                    </div>
                </div>
            )}

            {successMessage && (
                <div className={`${styles.alert} ${styles['alert--success']}`}>
                    <span>✅</span>
                    <span>{successMessage}</span>
                </div>
            )}

            {/* بخش تاریخچه شواهد و رویدادها */}
            <div className={styles.detailCard}>
                <h2 className={styles.detailCard__title}>📜 تاریخچه شواهد و وقایع ثبت‌شده (Evidence History)</h2>
                {caseData.history && caseData.history.length > 0 ? (
                    <div className={styles.historyTimeline}>
                        {caseData.history.map((h, idx) => (
                            <div key={h.eventId || `${h.eventType}-${idx}`} className={styles.historyTimeline__item}>
                                <div className={styles.historyTimeline__header}>
                                    <div className={styles.historyTimeline__title}>
                                        <span>🔹 {h.eventType}</span>
                                        {h.evidenceStage && (
                                            <span className={`${styles.badge} ${styles['badge--info']}`}>
                                                مرحله: {EVIDENCE_STAGE_LABELS[h.evidenceStage] || h.evidenceStage}
                                            </span>
                                        )}
                                        {h.evidenceKind && (
                                            <span className={`${styles.badge} ${styles['badge--default']}`}>
                                                نوع: {h.evidenceKind}
                                            </span>
                                        )}
                                    </div>
                                    <span className={styles.historyTimeline__time}>
                                        {formatDate(h.occurredAtUtc)}
                                    </span>
                                </div>

                                {h.eventId && (
                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                        شناسه رویداد: <span className={styles.codeCell}>{h.eventId}</span>
                                    </div>
                                )}

                                {h.details && Object.keys(h.details).length > 0 && (
                                    <div>
                                        <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.25rem' }}>
                                            جزئیات ثبت‌شده:
                                        </div>
                                        <pre className={styles.historyTimeline__details}>
                                            {JSON.stringify(h.details, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ color: '#6b7280', fontSize: '0.875rem', padding: '1rem 0' }}>
                        هیچ رویدادی در تاریخچه این پرونده ثبت نشده است.
                    </div>
                )}
            </div>

            {/* مودال تأیید ثبت رسیدگی */}
            {showConfirmModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <h3 className={styles.modal__title}>تأیید ثبت نتیجه رسیدگی</h3>
                        <div className={styles.modal__body}>
                            <p>آیا از ثبت این نتیجه برای پرونده ارجاع <strong>{caseData.clientReferenceCode}</strong> اطمینان دارید؟</p>
                            <ul>
                                <li>
                                    <strong>نتیجه:</strong> {OUTCOME_CONFIG[outcomeCode]?.label}
                                </li>
                                <li>
                                    <strong>مرجع مالی:</strong> {outcomeCode === 'UNPAID_REJECTED' ? 'بدون مرجع (null)' : financialRef}
                                </li>
                            </ul>
                            <p style={{ color: '#dc2626', fontSize: '0.82rem' }}>
                                ⚠️ پس از ثبت موفق، پرونده در وضعیت «رسیدگی‌شده» قرار خواهد گرفت و نتیجه به سیستم مالی گزارش می‌شود.
                            </p>
                        </div>
                        <div className={styles.modal__actions}>
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                className={`${styles.btn} ${styles['btn--secondary']}`}
                            >
                                انصراف
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmResolution}
                                className={`${styles.btn} ${styles['btn--primary']}`}
                            >
                                بله، ثبت قطعی شود
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

