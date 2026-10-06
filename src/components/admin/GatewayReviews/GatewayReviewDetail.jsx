'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
    ArrowRight,
    RotateCw,
    ShieldAlert,
    FileText,
    History,
    AlertTriangle,
    CheckCircle2,
    Sliders,
    ChevronDown,
} from 'lucide-react';
import {
    fetchGatewayReview,
    resolveGatewayReview,
    reopenGatewayReview,
    formatGatewayReviewError,
    OUTCOME_CONFIG,
    REASON_CONFIG,
    TOPUP_STATUS_CONFIG,
    CASE_STATUS_CONFIG,
} from '@/lib/client/admin/gatewayReviewsClient';
import { validateGatewayReviewResolution } from '@/lib/gatewayReviewResolution';
import styles from './GatewayReviews.module.scss';

// تاریخ و زمان با فرمت شمسی استاندارد (منطقه زمانی تهران)
const dateTime = (value) => {
    if (!value) return '—';
    try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return '—';
        return new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Tehran',
        }).format(d).replace(',', ' -');
    } catch {
        return '—';
    }
};

// تاریخ روز بدون ساعت با تقویم شمسی (بدون جابجایی منطقه زمانی)
const reportDate = (value) => {
    if (!value) return '—';
    try {
        const str = String(value);
        const d = new Date(str.includes('T') ? str : `${str}T12:00:00Z`);
        if (isNaN(d.getTime())) return '—';
        return new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'Asia/Tehran',
        }).format(d);
    } catch {
        return '—';
    }
};

// تبدیل تاریخ به نوشتار کامل شمسی (مثلاً: ۱۵ مهر ۱۴۰۵)
const toShamsiLong = (value) => {
    if (!value) return '';
    try {
        const str = String(value);
        const d = new Date(str.includes('T') ? str : `${str}T12:00:00Z`);
        if (isNaN(d.getTime())) return '';
        return new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Asia/Tehran',
        }).format(d);
    } catch {
        return '';
    }
};

const rial = (value) =>
    value == null ? '—' : new Intl.NumberFormat('fa-IR').format(value) + ' ریال';

const eventLabels = {
    opened: 'ایجاد پرونده',
    bank_event: 'رویداد درگاه',
    manual_evidence: 'مدرک جدید کارمند',
    delivery_unknown: 'تحویل نامعلوم',
    delivery_failed: 'تحویل ناموفق',
    open_delivered: 'ثبت پرونده در سرویس مالی',
    event_conflict: 'تعارض مدرک',
    resolution_rejected: 'رد درخواست بستن',
    resolution_delivery_unknown: 'نتیجه بستن نامعلوم',
};

const stageLabels = {
    callback: 'بازگشت از درگاه',
    verify: 'بررسی بانک',
    reverse: 'برگشت بانک',
    reverse_intent: 'درخواست برگشت',
    manual: 'بررسی دستی',
};

function getAuditEventTitle(item) {
    if (item.eventType === 'resolved') {
        return OUTCOME_CONFIG[item.outcomeCode]?.label || 'تعیین تکلیف و مختومه شدن پرونده';
    }
    if (item.eventType === 'reopen' || item.eventType === 'reopened') {
        return 'بازگشایی پرونده جهت رسیدگی مجدد';
    }
    if (item.actorName || item.actorUserId) {
        return item.note ? 'ثبت مدرک تکمیلی توسط کارشناس' : 'بررسی و اقدام کارشناس';
    }
    if (item.note) {
        return 'ثبت مدرک و توضیحات جدید';
    }
    return 'همگام‌سازی مدارک و رویدادهای درگاه';
}

function Field({ label, hint, id, children }) {
    return (
        <div className={styles.resolutionSection__field}>
            <label className={styles.resolutionSection__label} htmlFor={id}>
                {label}
            </label>
            {hint && <span className={styles.resolutionSection__hint}>{hint}</span>}
            {children}
        </div>
    );
}

export default function GatewayReviewDetail({ initialCase, initialError }) {
    const [data, setData] = useState(initialCase);
    const [outcome, setOutcome] = useState('');
    
    // تاریخ پیش‌فرض امروز به فرمت میلادی برای سازگاری با API
    const todayIso = () => new Date().toISOString().slice(0, 10);
    const [checkedDate, setCheckedDate] = useState(() => todayIso());
    const [matched, setMatched] = useState('');
    const [depositRef, setDepositRef] = useState('');
    const [depositDate, setDepositDate] = useState('');
    const [depositAmount, setDepositAmount] = useState('');
    const [refundRef, setRefundRef] = useState('');
    const [note, setNote] = useState('');
    const [newEvidence, setNewEvidence] = useState('');
    const [showAdvancedFields, setShowAdvancedFields] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(initialError || '');
    const [message, setMessage] = useState('');
    const operation = useRef(null);
    const reopening = useRef(null);
    const inFlight = useRef(false);
    const [uncertain, setUncertain] = useState(false);

    // به‌روزرسانی هوشمند فیلدها هنگام انتخاب نتیجه رسیدگی
    const handleOutcomeChange = (newOutcome) => {
        setOutcome(newOutcome);
        setError('');

        if (!checkedDate) {
            setCheckedDate(todayIso());
        }

        if (newOutcome === 'PAID_AND_CONFIRMED') {
            setMatched('yes');
            if (!depositRef && data) {
                setDepositRef(data.refNum || data.clientReferenceCode || '');
            }
            if (!depositAmount && data?.amountRial) {
                setDepositAmount(String(data.amountRial));
            }
            if (!depositDate) {
                setDepositDate(data?.requestedAtUtc ? data.requestedAtUtc.slice(0, 10) : todayIso());
            }
        } else if (newOutcome === 'NO_MATCHING_DEPOSIT' || newOutcome === 'REVERSED_REJECTED' || newOutcome === 'MANUAL_REFUND') {
            setMatched('no');
        }
    };

    async function run(action) {
        if (inFlight.current) return;
        inFlight.current = true;
        setBusy(true);
        setError('');
        setMessage('');
        try {
            await action();
        } catch (err) {
            const parsed = formatGatewayReviewError(err);
            setError(parsed.message);
            setUncertain(parsed.isUnknownOutcome);
            if (!parsed.isUnknownOutcome) operation.current = null;
        } finally {
            inFlight.current = false;
            setBusy(false);
        }
    }

    const refresh = (page = 1) =>
        run(async () => {
            const current = await fetchGatewayReview(data.clientReferenceCode, page);
            setData(current);
            if (current?.status === 'resolved' || current?.revision !== data?.revision) {
                operation.current = null;
                setUncertain(false);
            }
        });

    async function submit(event) {
        event.preventDefault();
        const pending = data.pendingOperation?.payload;
        const effectiveCheckedDate = checkedDate || todayIso();
        const effectiveMatched = matched !== '' ? matched : (outcome === 'PAID_AND_CONFIRMED' ? 'yes' : 'no');

        const payload =
            pending ||
            operation.current || {
                outcomeCode: outcome,
                resolutionFinancialReferenceId: ['PAID_AND_CONFIRMED', 'REVERSED_REJECTED'].includes(outcome)
                    ? data.refNum
                    : null,
                evidence: {
                    operationId: crypto.randomUUID(),
                    expectedRevision: data.revision,
                    checkedReportDate: effectiveCheckedDate,
                    matchingDepositFound: effectiveMatched === '' ? null : effectiveMatched === 'yes',
                    note: note.trim() || null,
                    depositReference: effectiveMatched === 'yes' ? depositRef.trim() : null,
                    depositDate: effectiveMatched === 'yes' ? depositDate : null,
                    depositAmountRial: effectiveMatched === 'yes' ? Number(depositAmount) : null,
                    manualRefundReference: outcome === 'MANUAL_REFUND' ? refundRef.trim() : null,
                },
            };
        const validation = validateGatewayReviewResolution(payload);
        if (validation) {
            setError(validation);
            return;
        }
        operation.current = payload;
        await run(async () => {
            const current = await resolveGatewayReview(data.clientReferenceCode, payload);
            setData(current);
            operation.current = null;
            setUncertain(false);
            setMessage(
                current.status === 'resolved'
                    ? 'نتیجه بررسی با موفقیت ثبت و پرونده مختومه شد.'
                    : 'نتیجه ثبت شد؛ مدرک تازه رسیده و پرونده برای بررسی دوباره باز است.'
            );
        });
    }

    async function reopen(event) {
        event.preventDefault();
        if (!newEvidence.trim() && !reopening.current) return;
        reopening.current ||= { evidenceId: crypto.randomUUID(), note: newEvidence.trim() };
        await run(async () => {
            setData(await reopenGatewayReview(data.clientReferenceCode, reopening.current));
            reopening.current = null;
            operation.current = null;
            setNewEvidence('');
            setUncertain(false);
            setMessage('مدرک جدید ثبت شد و پرونده برای رسیدگی دوباره بازگشایی شد.');
        });
    }

    // پالایش و حذف موارد تکراری از سابقه رسیدگی
    const deduplicatedAudit = useMemo(() => {
        if (!data?.audit || !Array.isArray(data.audit)) return [];
        const seen = new Set();
        const result = [];
        const reversed = [...data.audit].reverse();
        for (const item of reversed) {
            // رکوردهای همگام‌سازی خودکار درگاه بدون یادداشت و بدون کاربر را در یک دسته ادغام می‌کنیم
            const isSystemSync = !item.actorName && !item.actorUserId && !item.note && !item.evidence && item.eventType === 'evidence';
            let key;
            if (isSystemSync) {
                const timeMinute = item.occurredAtUtc ? item.occurredAtUtc.slice(0, 16) : 'sync';
                key = `system_sync_${timeMinute}`;
            } else {
                key = item.eventId || `${item.occurredAtUtc}_${item.eventType}_${item.outcomeCode || ''}_${item.note || ''}`;
            }

            if (!seen.has(key)) {
                seen.add(key);
                result.push(item);
            }
        }
        return result;
    }, [data?.audit]);

    // پالایش و حذف موارد تکراری از رویدادها
    const deduplicatedHistory = useMemo(() => {
        if (!data?.history || !Array.isArray(data.history)) return [];
        const seen = new Set();
        const result = [];
        for (const item of data.history) {
            const key = item.eventId || `${item.occurredAtUtc}_${item.eventType}_${item.details?.bankTransactionId || ''}`;
            if (!seen.has(key)) {
                seen.add(key);
                result.push(item);
            }
        }
        return result;
    }, [data?.history]);

    if (!data) {
        return (
            <div className={styles.page} dir="rtl">
                <Link href="/admin/gateway-reviews" className={styles.backLink}>
                    <ArrowRight size={16} />
                    بازگشت به فهرست پرونده‌ها
                </Link>
                <div role="alert" className={`${styles.alert} ${styles['alert--error']}`}>
                    <AlertTriangle size={18} />
                    <span>{error || 'پرونده در دسترس نیست.'}</span>
                </div>
            </div>
        );
    }

    const isConfirmed = data.topUpStatus === 'Confirmed';
    const editable = !busy && !uncertain && !data.pendingOperation;
    const outcomeDisabled = (value) =>
        value === 'PAID_AND_CONFIRMED'
            ? !data.canClosePaid
            : value === 'REVERSED_REJECTED'
            ? !data.canCloseReversed
            : isConfirmed || (value === 'NO_MATCHING_DEPOSIT' && Boolean(data.manualRefundReference));
    const latest = [...(data.audit || [])].reverse().find((x) => x.eventType === 'resolved');

    const details = [
        ['نام کاربر', data.userName || 'ثبت نشده'],
        ['تلفن', data.userPhone || 'ثبت نشده'],
        ['زمان درخواست (شمسی)', dateTime(data.requestedAtUtc)],
        ['مبلغ درخواست', rial(data.amountRial)],
        ['شماره درخواست درگاه (ResNum)', data.clientReferenceCode],
        ['شناسه شارژ (TopUp)', data.topUpRequestId],
        ['دلیل ایجاد پرونده', REASON_CONFIG[data.reasonCode]?.label || data.reasonCode],
        ['وضعیت شارژ', TOPUP_STATUS_CONFIG[data.topUpStatus]?.label || data.topUpStatus],
        ['وضعیت پرونده', CASE_STATUS_CONFIG[data.status]?.label || data.status],
        ['زمان ایجاد پرونده (شمسی)', dateTime(data.openedAtUtc)],
    ];
    const inputClass = styles.resolutionSection__input;

    return (
        <div className={styles.page} dir="rtl">
            {/* سرصفحه */}
            <div className={styles.header}>
                <div>
                    <Link href="/admin/gateway-reviews" className={styles.backLink}>
                        <ArrowRight size={16} />
                        بازگشت به فهرست پرونده‌ها
                    </Link>
                    <h1 className={styles.header__title}>
                        بررسی پرونده پرداخت <span className={styles.codeCell}>{data.clientReferenceCode}</span>
                    </h1>
                </div>
                <div className={styles.header__actions}>
                    <button
                        className={`${styles.btn} ${styles['btn--secondary']}`}
                        disabled={busy}
                        onClick={() => refresh()}
                    >
                        <RotateCw size={15} style={{ animation: busy ? 'spin 0.8s linear infinite' : 'none' }} />
                        به‌روزرسانی وضعیت
                    </button>
                </div>
            </div>

            {error && (
                <div role="alert" className={`${styles.alert} ${styles['alert--error']}`}>
                    <AlertTriangle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {message && (
                <div role="status" className={`${styles.alert} ${styles['alert--success']}`}>
                    <CheckCircle2 size={18} />
                    <span>{message}</span>
                </div>
            )}

            {/* کارت مشخصات اصلی درخواست */}
            <section className={styles.detailCard}>
                <h2>
                    <FileText size={20} style={{ color: 'var(--color-title-hover)' }} />
                    مشخصات پرونده و تراکنش
                </h2>
                <dl className={styles.detailCard__grid}>
                    {details.map(([label, value]) => (
                        <div key={label} className={styles.detailCard__item}>
                            <dt className={styles.detailCard__label}>{label}</dt>
                            <dd className={styles.detailCard__value}>{value}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            {/* بخش رسیدگی یا نمایش وضعیت نهایی */}
            {data.status === 'resolved' ? (
                <section className={styles.detailCard}>
                    <h2>
                        <CheckCircle2 size={20} style={{ color: 'var(--color-success)' }} />
                        نتیجه نهایی رسیدگی
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span className={`${styles.badge} ${styles['badge--success']}`} style={{ fontSize: '0.95rem', padding: '0.45rem 1rem' }}>
                            {OUTCOME_CONFIG[data.outcomeCode]?.label || data.outcomeCode}
                        </span>
                        <span className={styles.subText}>
                            مختومه شده توسط {latest?.actorName || latest?.actorUserId || 'سیستم'} — {dateTime(data.resolvedAtUtc)}
                        </span>
                    </div>

                    {data.outcomeCode === 'NO_MATCHING_DEPOSIT' && (
                        <p style={{ color: 'var(--color-warning-amber)' }}>
                            رسیدگی بسته شده است؛ درخواست از انتظار خارج شده و وضعیت پرداخت نامشخص است. مدرک تازه نیازمند بازگشایی پرونده است.
                        </p>
                    )}

                    {/* فرم ثبت مدرک و بازگشایی پرونده مختومه‌شده */}
                    <div className={styles.reopenBox}>
                        <h3 style={{ fontSize: 'var(--font-md)', color: 'var(--color-title-hover)', margin: '0 0 0.5rem' }}>
                            بازگشایی پرونده با ارائه مدرک جدید
                        </h3>
                        <form onSubmit={reopen} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            <Field label="مدرک جدید برای بازگشایی" id="review-reopen-evidence">
                                <textarea
                                    id="review-reopen-evidence"
                                    className={inputClass}
                                    required
                                    maxLength={2000}
                                    value={newEvidence}
                                    disabled={busy || Boolean(reopening.current)}
                                    onChange={(e) => setNewEvidence(e.target.value)}
                                    placeholder="شرح مدرک جدید بانکی، شماره ارجاع یا علت بازگشایی پرونده..."
                                    rows={3}
                                />
                            </Field>
                            <div>
                                <button className={`${styles.btn} ${styles['btn--primary']}`} disabled={busy} type="submit">
                                    ثبت مدرک و بازگشایی
                                </button>
                            </div>
                        </form>
                    </div>
                </section>
            ) : data.syncPending ? (
                <div role="status" className={`${styles.alert} ${styles['alert--info']}`}>
                    مدارک جدید در حال همگام‌سازی است؛ پس از دریافت آخرین وضعیت می‌توانید رسیدگی فرمایید.
                </div>
            ) : (
                /* فرم تعیین تکلیف و رسیدگی پرونده */
                <section className={styles.resolutionSection}>
                    <h2>تعیین تکلیف پرونده پرداخت</h2>
                    <p>نتیجه بررسی گزارش درگاه بانکی را انتخاب و پرونده را مختومه کنید.</p>

                    {!data.canClosePaid && (
                        <p style={{ color: 'var(--color-warning-amber)' }}>
                            نکته: بستن با نتیجه «شارژ موفق» نیازمند تأیید معتبر پرداخت در سرویس مالی است.
                        </p>
                    )}
                    {isConfirmed && (
                        <p style={{ color: 'var(--color-warning-amber)' }}>
                            برای شارژهای تأییدشده، بازپرداخت دستی یا نتیجه «عدم واریز» مجاز نیست.
                        </p>
                    )}
                    {data.pendingOperation && (
                        <p role="status">
                            یک درخواست بستن در حال پردازش است.{' '}
                            {data.pendingOperation.canRetry
                                ? 'می‌توانید همان درخواست را دوباره ارسال کنید.'
                                : 'کارمند ثبت‌کننده می‌تواند همان درخواست را پیگیری کند.'}
                        </p>
                    )}

                    <form onSubmit={submit} className={styles.resolutionSection__form} noValidate>
                        <fieldset disabled={!editable} className={styles.reviewFields}>
                            {/* فیلد اصلی: نتیجه رسیدگی */}
                            <Field label="نتیجه رسیدگی" id="review-outcome">
                                <select
                                    id="review-outcome"
                                    className={inputClass}
                                    value={outcome}
                                    onChange={(e) => handleOutcomeChange(e.target.value)}
                                >
                                    <option value="">انتخاب کنید</option>
                                    {['PAID_AND_CONFIRMED', 'NO_MATCHING_DEPOSIT', 'REVERSED_REJECTED', 'MANUAL_REFUND'].map(
                                        (value) => (
                                            <option key={value} value={value} disabled={outcomeDisabled(value)}>
                                                {OUTCOME_CONFIG[value].label}
                                            </option>
                                        )
                                    )}
                                </select>
                            </Field>

                            {/* فیلدهای اختصاصی هنگام وجود واریز منطبق */}
                            {matched === 'yes' && (
                                <div className={styles.subFormGroup}>
                                    <h3 className={styles.subFormGroup__title}>مشخصات واریز منطبق (تکمیل خودکار)</h3>
                                    <div className={styles.subFormGroup__grid}>
                                        <Field label="شناسه واریز درج‌شده در گزارش" id="review-deposit-ref">
                                            <input
                                                id="review-deposit-ref"
                                                className={inputClass}
                                                maxLength={100}
                                                value={depositRef}
                                                onChange={(e) => setDepositRef(e.target.value)}
                                            />
                                        </Field>
                                        <Field label="تاریخ واریز در گزارش" id="review-deposit-date">
                                            <input
                                                id="review-deposit-date"
                                                aria-label="تاریخ واریز در گزارش (میلادی)"
                                                className={inputClass}
                                                type="date"
                                                value={depositDate}
                                                onChange={(e) => setDepositDate(e.target.value)}
                                            />
                                            {depositDate && (
                                                <span className={styles.shamsiDatePreview}>
                                                    📅 معادل شمسی: {toShamsiLong(depositDate)}
                                                </span>
                                            )}
                                        </Field>
                                        <Field label="مبلغ واریز گزارش، به ریال" id="review-deposit-amount">
                                            <input
                                                id="review-deposit-amount"
                                                className={inputClass}
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={depositAmount}
                                                onChange={(e) => setDepositAmount(e.target.value)}
                                            />
                                        </Field>
                                    </div>
                                </div>
                            )}

                            {/* فیلد مرجع در صورت بازپرداخت دستی */}
                            {outcome === 'MANUAL_REFUND' && (
                                <Field label="مرجع بازپرداخت دستی" id="review-refund-ref">
                                    <input
                                        id="review-refund-ref"
                                        className={inputClass}
                                        maxLength={100}
                                        value={refundRef}
                                        onChange={(e) => setRefundRef(e.target.value)}
                                        placeholder="شماره پیگیری واریز پایا، کارت‌به‌کارت و..."
                                    />
                                </Field>
                            )}

                            {/* یادداشت اختیاری */}
                            <Field label="یادداشت بررسی" id="review-note">
                                <textarea
                                    id="review-note"
                                    className={inputClass}
                                    maxLength={2000}
                                    rows={2}
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="توضیحات تکمیلی یا علت تصمیم‌گیری (اختیاری)..."
                                />
                            </Field>

                            {/* بخش تنظیمات فنی گزارش (تکمیل خودکار و قابل باز شدن در صورت نیاز) */}
                            <div className={styles.advancedFieldsContainer}>
                                <button
                                    type="button"
                                    onClick={() => setShowAdvancedFields((prev) => !prev)}
                                    className={styles.advancedFieldsToggle}
                                >
                                    <Sliders size={14} />
                                    <span>تنظیمات فنی گزارش بانک (تکمیل خودکار)</span>
                                    <ChevronDown
                                        size={14}
                                        style={{
                                            transform: showAdvancedFields ? 'rotate(180deg)' : 'none',
                                            transition: 'transform 0.2s ease',
                                        }}
                                    />
                                </button>

                                <div
                                    className={styles.advancedFieldsContent}
                                    style={{ display: showAdvancedFields ? 'grid' : 'none' }}
                                >
                                    <Field label="تاریخ گزارش بررسی‌شده" id="review-checked-date">
                                        <input
                                            id="review-checked-date"
                                            aria-label="تاریخ گزارش بررسی‌شده (میلادی)"
                                            className={inputClass}
                                            type="date"
                                            value={checkedDate}
                                            onChange={(e) => setCheckedDate(e.target.value)}
                                        />
                                        {checkedDate && (
                                            <span className={styles.shamsiDatePreview}>
                                                📅 معادل شمسی: {toShamsiLong(checkedDate)}
                                            </span>
                                        )}
                                    </Field>

                                    <Field label="واریز منطبق در گزارش پیدا شد؟" id="review-matched">
                                        <select
                                            id="review-matched"
                                            className={inputClass}
                                            value={matched}
                                            onChange={(e) => setMatched(e.target.value)}
                                        >
                                            <option value="">انتخاب کنید</option>
                                            <option value="yes">بله</option>
                                            <option value="no">خیر</option>
                                        </select>
                                    </Field>
                                </div>
                            </div>
                        </fieldset>

                        <div>
                            <button
                                className={`${styles.btn} ${styles['btn--primary']}`}
                                type="submit"
                                disabled={busy || (data.pendingOperation && !data.pendingOperation.canRetry)}
                            >
                                {busy
                                    ? 'در حال پیگیری…'
                                    : uncertain || data.pendingOperation
                                    ? 'ارسال مجدد همان درخواست'
                                    : 'ثبت بررسی و بستن پرونده'}
                            </button>
                        </div>
                    </form>
                </section>
            )}

            {/* سابقه رسیدگی و وقایع پرونده بدون تکرار */}
            <section className={styles.detailCard}>
                <h2>
                    <History size={20} style={{ color: 'var(--color-title-hover)' }} />
                    سابقه رسیدگی به پرونده
                </h2>
                {deduplicatedAudit.length === 0 ? (
                    <p className={styles.emptyNote}>هنوز نتیجه رسیدگی ثبت نشده است.</p>
                ) : (
                    deduplicatedAudit.map((item) => (
                        <article className={styles.reviewAudit} key={item.eventId || `${item.occurredAtUtc}_${item.eventType}`}>
                            <div className={styles.reviewAudit__header}>
                                <strong className={styles.reviewAudit__title}>
                                    {getAuditEventTitle(item)}
                                </strong>
                                <span className={styles.reviewAudit__date}>
                                    {dateTime(item.occurredAtUtc)}
                                    {item.actorName || item.actorUserId ? ` (${item.actorName || item.actorUserId})` : ''}
                                </span>
                            </div>

                            {item.evidence && (
                                <div className={styles.reviewAudit__evidence}>
                                    <p>
                                        تاریخ بررسی: <strong>{reportDate(item.evidence.checkedReportDate)}</strong> | نتیجه واریز:{' '}
                                        <span className={item.evidence.matchingDepositFound ? styles['text--success'] : styles['text--muted']}>
                                            {item.evidence.matchingDepositFound ? 'منطبق ✓' : 'نامنطبق ✗'}
                                        </span>
                                    </p>
                                    {item.evidence.matchingDepositFound && (
                                        <p>
                                            شناسه واریز: <code>{item.evidence.depositReference}</code> | تاریخ واریز:{' '}
                                            <strong>{reportDate(item.evidence.depositDate)}</strong> | مبلغ:{' '}
                                            <strong>{rial(item.evidence.depositAmountRial)}</strong>
                                        </p>
                                    )}
                                    {item.evidence.manualRefundReference && (
                                        <p>مرجع بازپرداخت دستی: <code>{item.evidence.manualRefundReference}</code></p>
                                    )}
                                </div>
                            )}

                            {item.note && <p className={styles.reviewAudit__note}>{item.note}</p>}
                        </article>
                    ))
                )}
            </section>

            {/* رویدادهای پرداخت و مدارک درگاه */}
            <section className={styles.detailCard}>
                <h2>
                    <ShieldAlert size={20} style={{ color: 'var(--color-title-hover)' }} />
                    رویدادهای پرداخت و مدارک درگاه
                </h2>
                {deduplicatedHistory.length === 0 ? (
                    <p className={styles.emptyNote}>رویدادی ثبت نشده است.</p>
                ) : (
                    deduplicatedHistory.map((item, index) => (
                        <article className={styles.reviewAudit} key={item.eventId || index}>
                            <div className={styles.reviewAudit__header}>
                                <strong className={styles.reviewAudit__title}>
                                    {eventLabels[item.eventType] || 'رویداد رسیدگی'} — {stageLabels[item.evidenceStage] || ''}
                                </strong>
                                <span className={styles.reviewAudit__date}>
                                    {dateTime(item.details?.occurredAtUtc || item.occurredAtUtc)}
                                </span>
                            </div>

                            {item.details?.bankTransactionId && <p>شماره تراکنش بانک (RefNum): <code>{item.details.bankTransactionId}</code></p>}
                            {item.details?.bankReferenceNumber && <p>شماره ارجاع بانک (RRN): <code>{item.details.bankReferenceNumber}</code></p>}
                            {item.details?.bankResultCode != null && <p>کد نتیجه بانک: {item.details.bankResultCode}</p>}
                            {item.details?.callbackState && (
                                <p>
                                    وضعیت بازگشت از درگاه: {item.details.callbackState} / {item.details.callbackStatus}
                                </p>
                            )}
                            {item.details?.verifySuccess != null && (
                                <p>نتیجه بررسی بانک: {item.details.verifySuccess ? 'موفق ✓' : 'ناموفق ✗'}</p>
                            )}
                            {item.details?.originalAmountRial != null && (
                                <p>
                                    مبلغ اصلی: {rial(item.details.originalAmountRial)} | مبلغ مؤثر:{' '}
                                    {rial(item.details.affectiveAmountRial)}
                                </p>
                            )}
                            {item.details?.note && <p className={styles.reviewAudit__note}>{item.details.note}</p>}
                            {item.details?.actorDocumentId && <p className={styles.subText}>شناسه ثبت‌کننده: {item.details.actorDocumentId}</p>}
                        </article>
                    ))
                )}

                {data.historyPagination && data.historyPagination.total > data.historyPagination.pageSize && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
                        <button
                            className={`${styles.btn} ${styles['btn--secondary']}`}
                            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                            disabled={busy || data.historyPagination.page <= 1}
                            onClick={() => refresh(data.historyPagination.page - 1)}
                        >
                            رویدادهای جدیدتر
                        </button>
                        <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-card-text)' }}>
                            صفحه {data.historyPagination.page}
                        </span>
                        <button
                            className={`${styles.btn} ${styles['btn--secondary']}`}
                            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                            disabled={
                                busy ||
                                data.historyPagination.page * data.historyPagination.pageSize >=
                                    data.historyPagination.total
                            }
                            onClick={() => refresh(data.historyPagination.page + 1)}
                        >
                            رویدادهای قدیمی‌تر
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
}
