'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
    ArrowRight,
    RotateCw,
    ShieldAlert,
    FileText,
    History,
    AlertTriangle,
    CheckCircle2,
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

const dateTime = (value) =>
    value
        ? new Intl.DateTimeFormat('fa-IR', {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: 'Asia/Tehran',
          }).format(new Date(value))
        : '—';

const reportDate = (value) =>
    value
        ? new Intl.DateTimeFormat('fa-IR', {
              dateStyle: 'medium',
              timeZone: 'UTC',
          }).format(new Date(value))
        : '—';

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

function Field({ label, children }) {
    return (
        <label className={styles.resolutionSection__field}>
            <span className={styles.resolutionSection__label}>{label}</span>
            {children}
        </label>
    );
}

export default function GatewayReviewDetail({ initialCase, initialError }) {
    const [data, setData] = useState(initialCase);
    const [outcome, setOutcome] = useState('');
    const [checkedDate, setCheckedDate] = useState('');
    const [matched, setMatched] = useState('');
    const [depositRef, setDepositRef] = useState('');
    const [depositDate, setDepositDate] = useState('');
    const [depositAmount, setDepositAmount] = useState('');
    const [refundRef, setRefundRef] = useState('');
    const [note, setNote] = useState('');
    const [newEvidence, setNewEvidence] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(initialError || '');
    const [message, setMessage] = useState('');
    const operation = useRef(null);
    const reopening = useRef(null);
    const inFlight = useRef(false);
    const [uncertain, setUncertain] = useState(false);

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
            if (current?.status === 'resolved' || current?.revision !== data.revision) {
                operation.current = null;
                setUncertain(false);
            }
        });

    async function submit(event) {
        event.preventDefault();
        const pending = data.pendingOperation?.payload;
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
                    checkedReportDate: checkedDate,
                    matchingDepositFound: matched === '' ? null : matched === 'yes',
                    note: note.trim() || null,
                    depositReference: matched === 'yes' ? depositRef.trim() : null,
                    depositDate: matched === 'yes' ? depositDate : null,
                    depositAmountRial: matched === 'yes' ? Number(depositAmount) : null,
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
                    ? 'نتیجه بررسی ثبت و پرونده بسته شد.'
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
            setMessage('مدرک جدید ثبت شد و پرونده برای بررسی دوباره باز شد.');
        });
    }

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
            : isConfirmed;
    const latest = [...(data.audit || [])].reverse().find((x) => x.eventType === 'resolved');
    const details = [
        ['نام کاربر', data.userName || 'ثبت نشده'],
        ['تلفن', data.userPhone || 'ثبت نشده'],
        ['زمان درخواست، به وقت تهران', dateTime(data.requestedAtUtc)],
        ['مبلغ درخواست', rial(data.amountRial)],
        ['شماره درخواست درگاه (ResNum)', data.clientReferenceCode],
        ['شناسه شارژ (TopUp)', data.topUpRequestId],
        ['دلیل ایجاد پرونده', REASON_CONFIG[data.reasonCode]?.label || data.reasonCode],
        ['وضعیت شارژ', TOPUP_STATUS_CONFIG[data.topUpStatus]?.label || data.topUpStatus],
        ['وضعیت پرونده', CASE_STATUS_CONFIG[data.status]?.label || data.status],
        ['زمان ایجاد پرونده', dateTime(data.openedAtUtc)],
    ];
    const inputClass = styles.resolutionSection__input;

    return (
        <div className={styles.page} dir="rtl">
            <div className={styles.header}>
                <div>
                    <Link href="/admin/gateway-reviews" className={styles.backLink}>
                        <ArrowRight size={16} />
                        بازگشت به فهرست پرونده‌ها
                    </Link>
                    <h1 className={styles.header__title}>بررسی پرداخت {data.clientReferenceCode}</h1>
                </div>
                <div className={styles.header__actions}>
                    <button
                        className={`${styles.btn} ${styles['btn--secondary']}`}
                        disabled={busy}
                        onClick={() => refresh()}
                    >
                        <RotateCw size={15} style={{ animation: busy ? 'spin 0.8s linear infinite' : 'none' }} />
                        دریافت آخرین وضعیت
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

            <section className={styles.detailCard}>
                <h2>
                    <FileText size={20} style={{ color: 'var(--color-title-hover)' }} />
                    مشخصات درخواست
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

            {data.status === 'resolved' ? (
                <section className={styles.detailCard}>
                    <h2>نتیجه رسیدگی</h2>
                    <p style={{ fontWeight: 'bold', color: 'var(--color-success)' }}>
                        {OUTCOME_CONFIG[data.outcomeCode]?.label || data.outcomeCode}
                    </p>
                    <p>
                        بسته‌شده توسط {latest?.actorName || latest?.actorUserId || 'اطلاعات پرونده قدیمی موجود نیست'} —{' '}
                        {dateTime(data.resolvedAtUtc)}
                    </p>
                    {data.outcomeCode === 'NO_MATCHING_DEPOSIT' && (
                        <p style={{ color: 'var(--color-warning-amber)' }}>
                            رسیدگی بسته شده است؛ وضعیت پرداخت همچنان نامعلوم است (این نتیجه وضعیت مالی شارژ را تغییر نمی‌دهد).
                        </p>
                    )}
                    <form onSubmit={reopen} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <Field label="مدرک جدید برای بازگشایی">
                            <textarea
                                className={inputClass}
                                required
                                maxLength={2000}
                                value={newEvidence}
                                disabled={busy || Boolean(reopening.current)}
                                onChange={(e) => setNewEvidence(e.target.value)}
                                rows={3}
                            />
                        </Field>
                        <div>
                            <button className={`${styles.btn} ${styles['btn--primary']}`} disabled={busy} type="submit">
                                ثبت مدرک و بازگشایی
                            </button>
                        </div>
                    </form>
                </section>
            ) : data.syncPending ? (
                <div role="status" className={`${styles.alert} ${styles['alert--info']}`}>
                    مدرک جدید در حال همگام‌سازی است؛ پس از دریافت آخرین وضعیت می‌توانید رسیدگی کنید.
                </div>
            ) : (
                <section className={styles.resolutionSection}>
                    <h2>ثبت بررسی گزارش بانک</h2>
                    <p>گزارش بانک را با تاریخ درخواست و مبلغ ریالی تطبیق دهید. رسیدگی به پرونده‌های قدیمی به شکایت کاربر نیاز ندارد.</p>
                    {!data.canClosePaid && (
                        <p style={{ color: 'var(--color-warning-amber)' }}>
                            تطبیق تاریخ، مبلغ و شناسه واریز به‌تنهایی نور شارژ نمی‌کند. بستن با نتیجه «نور شارژ شده» به تأیید معتبر پرداخت در سرویس مالی نیاز دارد.
                        </p>
                    )}
                    {isConfirmed && <p>برای شارژ تأییدشده، ثبت بازپرداخت دستی یا «واریز پیدا نشد» مجاز نیست.</p>}
                    {data.manualRefundReference && (
                        <p>بازپرداخت دستی قبلاً ثبت شده است؛ ورود نتیجه بانکی تازه نیازمند رسیدگی مالی است.</p>
                    )}
                    {data.pendingOperation && (
                        <p role="status">
                            نتیجه یک درخواست بستن در حال پیگیری است.{' '}
                            {data.pendingOperation.canRetry
                                ? 'می‌توانید همان درخواست را دوباره ارسال کنید.'
                                : 'کارمند ثبت‌کننده باید همان درخواست را پیگیری کند.'}
                        </p>
                    )}
                    <form onSubmit={submit} className={styles.resolutionSection__form} noValidate>
                        <fieldset disabled={!editable} className={styles.reviewFields}>
                            <Field label="نتیجه رسیدگی">
                                <select
                                    className={inputClass}
                                    value={outcome}
                                    onChange={(e) => setOutcome(e.target.value)}
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

                            <Field label="تاریخ گزارش بررسی‌شده (میلادی)">
                                <input
                                    className={inputClass}
                                    type="date"
                                    value={checkedDate}
                                    onChange={(e) => setCheckedDate(e.target.value)}
                                />
                            </Field>

                            <Field label="واریز منطبق در گزارش پیدا شد؟">
                                <select
                                    className={inputClass}
                                    value={matched}
                                    onChange={(e) => setMatched(e.target.value)}
                                >
                                    <option value="">انتخاب کنید</option>
                                    <option value="yes">بله</option>
                                    <option value="no">خیر</option>
                                </select>
                            </Field>

                            {matched === 'yes' && (
                                <>
                                    <Field label="شناسه واریز درج‌شده در گزارش">
                                        <input
                                            className={inputClass}
                                            maxLength={100}
                                            value={depositRef}
                                            onChange={(e) => setDepositRef(e.target.value)}
                                        />
                                    </Field>
                                    <Field label="تاریخ واریز در گزارش (میلادی)">
                                        <input
                                            className={inputClass}
                                            type="date"
                                            value={depositDate}
                                            onChange={(e) => setDepositDate(e.target.value)}
                                        />
                                    </Field>
                                    <Field label="مبلغ واریز گزارش، به ریال">
                                        <input
                                            className={inputClass}
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={depositAmount}
                                            onChange={(e) => setDepositAmount(e.target.value)}
                                        />
                                    </Field>
                                </>
                            )}

                            {outcome === 'MANUAL_REFUND' && (
                                <Field label="مرجع بازپرداخت دستی">
                                    <input
                                        className={inputClass}
                                        maxLength={100}
                                        value={refundRef}
                                        onChange={(e) => setRefundRef(e.target.value)}
                                    />
                                </Field>
                            )}

                            <Field label="یادداشت بررسی">
                                <textarea
                                    className={inputClass}
                                    maxLength={2000}
                                    rows={3}
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                />
                            </Field>
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

            <section className={styles.detailCard}>
                <h2>
                    <History size={20} style={{ color: 'var(--color-title-hover)' }} />
                    سابقه رسیدگی
                </h2>
                {!(data.audit?.length) && <p>هنوز نتیجه رسیدگی ثبت نشده است.</p>}
                {[...(data.audit || [])].reverse().map((item) => (
                    <article className={styles.reviewAudit} key={item.eventId}>
                        <strong>
                            {item.eventType === 'resolved'
                                ? OUTCOME_CONFIG[item.outcomeCode]?.label || item.outcomeCode
                                : 'ثبت مدرک و شروع رسیدگی دوباره'}
                        </strong>
                        <p>
                            {dateTime(item.occurredAtUtc)} {item.actorName || item.actorUserId || ''}
                        </p>
                        {item.evidence && (
                            <>
                                <p>
                                    گزارش بررسی‌شده: {reportDate(item.evidence.checkedReportDate)}؛ واریز منطبق:{' '}
                                    {item.evidence.matchingDepositFound ? 'پیدا شد' : 'پیدا نشد'}
                                </p>
                                {item.evidence.matchingDepositFound && (
                                    <p>
                                        شناسه واریز: {item.evidence.depositReference}؛ تاریخ واریز:{' '}
                                        {reportDate(item.evidence.depositDate)}؛ مبلغ:{' '}
                                        {rial(item.evidence.depositAmountRial)}
                                    </p>
                                )}
                                {item.evidence.manualRefundReference && (
                                    <p>مرجع بازپرداخت دستی: {item.evidence.manualRefundReference}</p>
                                )}
                            </>
                        )}
                        {item.note && <p>{item.note}</p>}
                    </article>
                ))}
            </section>

            <section className={styles.detailCard}>
                <h2>
                    <ShieldAlert size={20} style={{ color: 'var(--color-title-hover)' }} />
                    رویدادهای پرداخت و مدارک
                </h2>
                {(data.history || []).map((item, index) => (
                    <article className={styles.reviewAudit} key={item.eventId || index}>
                        <strong>
                            {eventLabels[item.eventType] || 'رویداد رسیدگی'} — {stageLabels[item.evidenceStage] || ''}
                        </strong>
                        <p>زمان وقوع رویداد: {dateTime(item.details?.occurredAtUtc || item.occurredAtUtc)}</p>
                        {item.details?.occurredAtUtc &&
                            item.occurredAtUtc &&
                            item.details.occurredAtUtc !== item.occurredAtUtc && (
                                <p>زمان ثبت مدرک: {dateTime(item.occurredAtUtc)}</p>
                            )}
                        {item.details?.bankTransactionId && <p>RefNum: {item.details.bankTransactionId}</p>}
                        {item.details?.bankReferenceNumber && <p>RRN: {item.details.bankReferenceNumber}</p>}
                        {item.details?.bankResultCode != null && <p>کد نتیجه بانک: {item.details.bankResultCode}</p>}
                        {item.details?.callbackState && (
                            <p>
                                وضعیت بازگشت از درگاه: {item.details.callbackState} / {item.details.callbackStatus}
                            </p>
                        )}
                        {item.details?.verifySuccess != null && (
                            <p>نتیجه بررسی بانک: {item.details.verifySuccess ? 'موفق' : 'ناموفق'}</p>
                        )}
                        {item.details?.originalAmountRial != null && (
                            <p>
                                مبلغ اصلی: {rial(item.details.originalAmountRial)}؛ مبلغ مؤثر:{' '}
                                {rial(item.details.affectiveAmountRial)}
                            </p>
                        )}
                        {item.details?.note && <p>{item.details.note}</p>}
                        {item.details?.actorDocumentId && <p>شناسه ثبت‌کننده: {item.details.actorDocumentId}</p>}
                    </article>
                ))}
                {data.historyPagination && (
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
