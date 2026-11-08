'use client';

/**
 * @file CreateNoorWithdrawalModal.jsx
 * @description فرم ثبت خروج نور برای یک کاربر (I11-W، D09).
 *
 * - فقط نور عادی قابل خروج است؛ نور هدیه هرگز خارج نمی‌شود.
 * - operationId با باز شدن فرم ساخته می‌شود، در تلاش مجدد همان محتوا ثابت می‌ماند و با تغییر محتوا یا موفقیت تازه می‌شود.
 * - استرداد پرداخت تکراری: ادمین شناسه تایپ نمی‌کند؛ از شارژهای تأییدشدهٔ همین کاربر انتخاب می‌کند.
 *   شارژ با استرداد فعال غیرقابل انتخاب است و سقف مبلغ، ریال همان شارژ است.
 * - فقط مبلغ واریز (ریال) ورودی است؛ معادل نور فقط‌خواندنی و تخمینی است (صلاحدید: نرخ فعلی، استرداد: نرخ همان شارژ)
 *   و نور واقعی را سرور حساب می‌کند و بعد از ثبت نشان داده می‌شود.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Banknote, X, AlertTriangle, ChevronDown, CheckCircle2 } from 'lucide-react';
import {
    createAdminNoorWithdrawal, getAdminBatchBalances, getAdminNoorWithdrawalRate, listAdminRefundableTopUps,
} from '@/lib/admin/adminByeMoneyClient';
import {
    WITHDRAWAL_KINDS, digitsOnly, estimateNoor, formatDateTime, formatNoor, formatNumber, normalizeIban, toLatinDigits,
    validateWithdrawalForm,
} from '@/lib/admin/noorWithdrawal';
import { numberToPersianWords } from '@/utils/numberToPersianWords';
import { AdminToastViewport, useAdminToast } from '@/components/admin/Shared/AdminToast';
import shell from '@/components/admin/Users/AdminNoorGiftModal/AdminNoorGiftModal.module.scss';
import styles from './NoorWithdrawals.module.scss';

const newOperationId = () =>
    typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `op-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export default function CreateNoorWithdrawalModal({ user, onClose, onSuccess }) {
    const [mounted, setMounted] = useState(false);
    const [kind, setKind] = useState('AdminDiscretionary');
    const [amountRial, setAmountRial] = useState('');
    const [beneficiaryName, setBeneficiaryName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [iban, setIban] = useState('');
    const [description, setDescription] = useState('');
    const [alreadyPaid, setAlreadyPaid] = useState(false);
    const [paymentReference, setPaymentReference] = useState('');
    const [receipt, setReceipt] = useState(null);

    const [rate, setRate] = useState(null);
    const [balance, setBalance] = useState(null);
    const [topUps, setTopUps] = useState(null);
    const [topUpsError, setTopUpsError] = useState(null);
    const [topUpQuery, setTopUpQuery] = useState('');
    const [selectedTopUpId, setSelectedTopUpId] = useState('');
    const [result, setResult] = useState(null);

    const [comboOpen, setComboOpen] = useState(false);
    const comboRef = useRef(null);
    const { toasts, toast, dismiss } = useAdminToast();
    const showError = (message) => toast(message, 'error');

    const [loading, setLoading] = useState(false);

    const operationIdRef = useRef(null);
    const lastSignatureRef = useRef(null);

    useEffect(() => {
        setMounted(true);
        operationIdRef.current = newOperationId();
    }, []);

    useEffect(() => {
        const original = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = original; };
    }, []);

    // نرخ فعلی و موجودی نور عادی؛ شکست هر کدام فقط همان نمایش را حذف می‌کند و ثبت نهایی با سرور است.
    useEffect(() => {
        let cancelled = false;
        getAdminNoorWithdrawalRate().then((res) => {
            if (!cancelled && res.success && Number(res.rialPerNoor) > 0) setRate(Number(res.rialPerNoor));
        });
        getAdminBatchBalances({ userIds: [user.documentId] }).then((res) => {
            const value = res.balances?.[user.documentId];
            if (!cancelled && res.success && value !== undefined) setBalance(Number(value));
        });
        return () => { cancelled = true; };
    }, [user.documentId]);

    const isRefund = kind === 'DuplicatePaymentRefund';

    useEffect(() => {
        if (!isRefund || topUps !== null) return undefined;
        let cancelled = false;
        listAdminRefundableTopUps({ userExternalId: user.documentId }).then((res) => {
            if (cancelled) return;
            if (res.success && Array.isArray(res.data)) setTopUps(res.data);
            else setTopUpsError(res.error || `خطا در دریافت شارژهای کاربر (کد خطا: ${res.status || 'نامشخص'}).`);
        });
        return () => { cancelled = true; };
    }, [isRefund, topUps, user.documentId]);

    const selectedTopUp = isRefund ? topUps?.find((t) => t.id === selectedTopUpId) : null;
    const relatedTopUpId = selectedTopUp?.id || '';
    const effectiveRate = isRefund ? selectedTopUp?.rialPerNoor : rate;
    const estimatedNoor = estimateNoor(amountRial, effectiveRate);
    const overBalance = estimatedNoor !== null && balance !== null && estimatedNoor > balance;

    const visibleTopUps = useMemo(() => {
        const q = toLatinDigits(topUpQuery).trim().toLowerCase();
        return (topUps || []).filter((t) => !q || String(t.clientReferenceCode ?? '').toLowerCase().includes(q));
    }, [topUps, topUpQuery]);

    // مبلغ همیشه از شارژ انتخاب‌شده می‌آید (ادمین می‌تواند کمتر کند)؛ لیست پس از انتخاب بسته می‌شود.
    const selectTopUp = (topUp) => {
        setSelectedTopUpId(topUp.id);
        setAmountRial(String(topUp.amountRial));
        setTopUpQuery('');
        setComboOpen(false);
    };

    useEffect(() => {
        if (!comboOpen) return undefined;
        const onDown = (e) => { if (!comboRef.current?.contains(e.target)) setComboOpen(false); };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [comboOpen]);

    // پس از ثبت، بستن (با هر راه) موفقیت را به والد اطلاع می‌دهد تا موجودی‌ها تازه شود.
    const close = () => (result ? onSuccess?.(result) : onClose?.());

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape' && !loading) close(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });
    const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || user?.documentId;

    const values = useMemo(() => ({
        kind, relatedTopUpId, maxRial: selectedTopUp?.amountRial, amountRial, beneficiaryName: beneficiaryName.trim(), cardNumber, iban,
        description: description.trim(), alreadyPaid, paymentReference: alreadyPaid ? paymentReference.trim() : '',
        receipt: alreadyPaid ? receipt : null,
    }), [kind, relatedTopUpId, selectedTopUp, amountRial, beneficiaryName, cardNumber, iban, description, alreadyPaid,
        paymentReference, receipt]);

    const handleSubmit = async (e) => {
        e?.preventDefault?.();

        const invalid = validateWithdrawalForm(values);
        if (invalid) {
            showError(invalid);
            return;
        }

        // محتوای فرم (شامل مشخصات فیش) اثر انگشت درخواست است؛ تغییر آن operationId تازه می‌خواهد.
        const signature = JSON.stringify({
            ...values,
            receipt: values.receipt ? [values.receipt.name, values.receipt.size, values.receipt.lastModified] : null,
        });
        if (!operationIdRef.current || (lastSignatureRef.current && lastSignatureRef.current !== signature)) {
            operationIdRef.current = newOperationId();
        }
        lastSignatureRef.current = signature;

        setLoading(true);
        try {
            const res = await createAdminNoorWithdrawal({
                fields: {
                    operationId: operationIdRef.current,
                    userExternalId: user.documentId,
                    kind,
                    relatedTopUpId: relatedTopUpId || undefined,
                    amountRial,
                    beneficiaryName: values.beneficiaryName,
                    beneficiaryCardNumber: cardNumber || undefined,
                    beneficiaryIban: iban || undefined,
                    description: values.description,
                    paymentReference: values.paymentReference || undefined,
                },
                receipt: values.receipt,
            });
            if (!res.success) {
                showError(res.error || `ثبت خروج نور ناموفق بود (کد خطا: ${res.status || 'نامشخص'}).`);
                return;
            }
            operationIdRef.current = newOperationId();
            lastSignatureRef.current = null;
            setResult(res.data || {});
        } catch {
            showError('خطای غیرمنتظره در برقراری ارتباط با سرور.');
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    return createPortal(
        <>
        <div
            className={shell.backdrop}
            onClick={(e) => { if (e.target === e.currentTarget && !loading) close(); }}
        >
            <div className={`${shell.modal} ${styles.modalWide}`} role="dialog" aria-modal="true" aria-labelledby="noor-withdrawal-title">
                <div className={shell.header}>
                    <div className={shell.header__titleWrap}>
                        <div className={shell.header__icon}><Banknote size={20} /></div>
                        <h2 className={shell.header__title} id="noor-withdrawal-title">خروج نور — {userName}</h2>
                    </div>
                    <button type="button" className={shell.header__closeBtn} onClick={close} disabled={loading} aria-label="بستن">
                        <X size={20} />
                    </button>
                </div>

                {result ? (
                    <div className={`${shell.body} ${styles.formGrid}`}>
                        <div className={`${shell.alertBox} ${styles.span2}`} role="status">
                            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                            <div>خروج نور ثبت شد.</div>
                        </div>
                        <div className={`${styles.summaryBox} ${styles.span2}`}>
                            <span>نور کسرشده از کیف پول</span>
                            <strong data-testid="deducted-noor">{formatNoor(result.amountNoor)} نور</strong>
                        </div>
                        <div className={`${styles.summaryBox} ${styles.span2}`}>
                            <span>مبلغ واریز</span>
                            <strong>{formatNumber(result.amountRial)} ریال</strong>
                        </div>
                        <div className={`${shell.footer} ${styles.span2}`}>
                            <button type="button" className={shell.btnPrimary} onClick={close}>بستن</button>
                        </div>
                    </div>
                ) : (
                <form className={`${shell.body} ${styles.formGrid}`} onSubmit={handleSubmit} noValidate>
                    <div className={`${shell.alertBox} ${shell['alertBox--warning']} ${styles.span2} ${styles.notice}`}>
                        <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                        <div><strong>فقط «نور عادی» قابل خروج است.</strong> نور هدیه خارج نمی‌شود و در موجودی قابل خروج حساب نمی‌شود.</div>
                    </div>

                    {balance !== null && (
                        <div className={`${styles.summaryBox} ${styles.span2}`}>
                            <span>موجودی نور عادی قابل خروج</span>
                            <strong>{formatNoor(balance)} نور</strong>
                        </div>
                    )}

                    <div className={`${shell.field} ${styles.span2}`}>
                        <label className={shell.field__label} htmlFor="nw-kind">نوع خروج</label>
                        <select
                            id="nw-kind"
                            className={`${shell.field__input} ${styles.selectInput}`}
                            value={kind}
                            onChange={(e) => setKind(e.target.value)}
                            disabled={loading}
                        >
                            {Object.entries(WITHDRAWAL_KINDS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>

                    {isRefund && (
                        <fieldset className={`${styles.topUpBox} ${styles.span2}`}>
                            <legend>شارژ تأییدشدهٔ مرتبط <span className={styles.required}>*</span></legend>
                            {topUpsError && <div className={styles.fieldError} role="alert">{topUpsError}</div>}
                            {!topUpsError && topUps === null && <div className={styles.hint}>در حال دریافت شارژهای کاربر...</div>}
                            {topUps && topUps.length === 0 && (
                                <div className={styles.hint}>این کاربر شارژ تأییدشده‌ای برای استرداد ندارد.</div>
                            )}
                            {topUps && topUps.length > 0 && (
                                <div
                                    ref={comboRef}
                                    className={styles.combo}
                                    onKeyDown={(e) => { if (e.key === 'Escape' && comboOpen) { e.stopPropagation(); setComboOpen(false); } }}
                                >
                                    <button
                                        type="button"
                                        role="combobox"
                                        aria-haspopup="listbox"
                                        aria-expanded={comboOpen}
                                        aria-label="شارژ تأییدشده"
                                        className={styles.comboBox}
                                        onClick={() => setComboOpen((open) => !open)}
                                        disabled={loading}
                                    >
                                        {selectedTopUp ? (
                                            <span className={styles.comboValue}>
                                                <span>
                                                    <bdi dir="ltr">{selectedTopUp.clientReferenceCode}</bdi>
                                                    {' · '}{formatNoor(selectedTopUp.amountNoor)} نور · {formatNumber(selectedTopUp.amountRial)} ریال
                                                </span>
                                                <small>
                                                    سقف مبلغ استرداد: {formatNumber(selectedTopUp.amountRial)} ریال؛ نرخ ثبت‌شدهٔ شارژ: ۱ نور = {formatNumber(selectedTopUp.rialPerNoor)} ریال
                                                </small>
                                            </span>
                                        ) : (
                                            <span className={styles.comboPlaceholder}>انتخاب شارژ تأییدشده...</span>
                                        )}
                                        <ChevronDown size={16} aria-hidden="true" className={comboOpen ? styles.comboChevronOpen : styles.comboChevron} />
                                    </button>
                                    {comboOpen && (
                                        <div className={styles.comboPanel}>
                                            <input
                                                aria-label="جست‌وجو در شارژها با کد پیگیری"
                                                className={shell.field__input}
                                                dir="ltr"
                                                placeholder="جست‌وجو با کد پیگیری"
                                                value={topUpQuery}
                                                onChange={(e) => setTopUpQuery(e.target.value)}
                                                autoFocus
                                            />
                                            <div className={styles.topUpList} role="listbox" aria-label="شارژهای تأییدشده">
                                                {visibleTopUps.length === 0 && <div className={styles.hint}>شارژی با این کد پیگیری پیدا نشد.</div>}
                                                {visibleTopUps.map((t) => (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        role="option"
                                                        aria-selected={t.id === selectedTopUpId}
                                                        disabled={t.hasActiveRefund}
                                                        className={t.id === selectedTopUpId ? styles.topUpOptionActive : styles.topUpOption}
                                                        onClick={() => selectTopUp(t)}
                                                    >
                                                        <bdi dir="ltr">{t.clientReferenceCode}</bdi>
                                                        <span>{formatNoor(t.amountNoor)} نور · {formatNumber(t.amountRial)} ریال</span>
                                                        <span>{formatDateTime(t.confirmedAtUtc)}</span>
                                                        {t.hasActiveRefund && <em>استرداد فعال دارد</em>}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </fieldset>
                    )}

                    <div className={shell.field}>
                        <label className={shell.field__label} htmlFor="nw-rial">مبلغ واریز (ریال) <span className={styles.required}>*</span></label>
                        <input
                            id="nw-rial"
                            className={shell.field__input}
                            inputMode="numeric"
                            value={amountRial ? formatNumber(amountRial) : ''}
                            onChange={(e) => setAmountRial(digitsOnly(e.target.value))}
                            disabled={loading}
                        />
                        {amountRial && <div className={styles.hint}>{numberToPersianWords(amountRial)} ریال</div>}
                    </div>

                    <div className={shell.field}>
                        <label className={shell.field__label} htmlFor="nw-noor">معادل نور (تخمینی)</label>
                        <input
                            id="nw-noor"
                            className={shell.field__input}
                            readOnly
                            tabIndex={-1}
                            value={estimatedNoor !== null ? formatNoor(estimatedNoor) : ''}
                            placeholder="—"
                        />
                        <div className={styles.hint}>
                            {effectiveRate
                                ? `نرخ ${isRefund ? 'ثبت‌شدهٔ شارژ' : 'فعلی'}: ۱ نور = ${formatNumber(effectiveRate)} ریال؛ مقدار نهایی را سرور حساب می‌کند.`
                                : (isRefund ? 'ابتدا شارژ را انتخاب کنید.' : 'نرخ فعلی در دسترس نیست؛ نور را سرور حساب می‌کند.')}
                        </div>
                    </div>

                    {overBalance && (
                        <div className={`${shell.alertBox} ${shell['alertBox--warning']} ${styles.span2} ${styles.notice}`} role="status">
                            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                            <div>
                                معادل نور ({formatNoor(estimatedNoor)}) از موجودی نور عادی کاربر ({formatNoor(balance)}) بیشتر است؛
                                ثبت نهایی را سرور تصمیم می‌گیرد.
                            </div>
                        </div>
                    )}

                    <div className={`${shell.field} ${styles.span2}`}>
                        <label className={shell.field__label} htmlFor="nw-name">نام صاحب حساب <span className={styles.required}>*</span></label>
                        <input
                            id="nw-name"
                            className={shell.field__input}
                            maxLength={200}
                            value={beneficiaryName}
                            onChange={(e) => setBeneficiaryName(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div className={shell.field}>
                        <label className={shell.field__label} htmlFor="nw-card">شمارهٔ کارت (۱۶ رقم)</label>
                        <input
                            id="nw-card"
                            className={shell.field__input}
                            dir="ltr"
                            inputMode="numeric"
                            maxLength={16}
                            value={cardNumber}
                            onChange={(e) => setCardNumber(digitsOnly(e.target.value).slice(0, 16))}
                            disabled={loading}
                        />
                    </div>

                    <div className={shell.field}>
                        <label className={shell.field__label} htmlFor="nw-iban">شبا (IR + ۲۴ رقم)</label>
                        <input
                            id="nw-iban"
                            className={shell.field__input}
                            dir="ltr"
                            maxLength={26}
                            value={iban}
                            onChange={(e) => setIban(normalizeIban(e.target.value).slice(0, 26))}
                            disabled={loading}
                        />
                        <div className={styles.hint}>دست‌کم یکی از شمارهٔ کارت یا شبا الزامی است.</div>
                    </div>

                    <div className={`${shell.field} ${styles.span2}`}>
                        <label className={shell.field__label} htmlFor="nw-desc">توضیحات <span className={styles.required}>*</span></label>
                        <textarea
                            id="nw-desc"
                            className={shell.field__textarea}
                            maxLength={1000}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <label className={`${styles.checkRow} ${styles.span2}`}>
                        <input
                            type="checkbox"
                            checked={alreadyPaid}
                            onChange={(e) => setAlreadyPaid(e.target.checked)}
                            disabled={loading}
                        />
                        واریز قبلاً انجام شده
                    </label>

                    {alreadyPaid && (
                        <>
                            <div className={`${shell.alertBox} ${shell['alertBox--warning']} ${styles.span2} ${styles.notice}`}>
                                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                                <div>
                                    <strong>بهتر است اول خروج ثبت و بعد واریز شود.</strong> اگر کاربر در این فاصله نورش را خرج کند،
                                    ثبت رد می‌شود و پول واریزشده برنمی‌گردد.
                                </div>
                            </div>
                            <div className={shell.field}>
                                <label className={shell.field__label} htmlFor="nw-ref">شناسهٔ پرداخت <span className={styles.required}>*</span></label>
                                <input
                                    id="nw-ref"
                                    className={shell.field__input}
                                    dir="ltr"
                                    maxLength={100}
                                    value={paymentReference}
                                    onChange={(e) => setPaymentReference(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                            <div className={shell.field}>
                                <label className={shell.field__label} htmlFor="nw-receipt">فیش واریز (png، jpg، webp؛ تا ۱۰ مگابایت) <span className={styles.required}>*</span></label>
                                <input
                                    id="nw-receipt"
                                    className={styles.fileInput}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                                    disabled={loading}
                                />
                            </div>
                        </>
                    )}

                    <div className={`${shell.footer} ${styles.span2}`}>
                        <button type="button" className={shell.btnSecondary} onClick={close} disabled={loading}>انصراف</button>
                        <button type="submit" className={shell.btnPrimary} disabled={loading}>
                            {loading ? 'در حال ثبت...' : 'ثبت خروج نور'}
                        </button>
                    </div>
                </form>
                )}
            </div>
        </div>
        <AdminToastViewport toasts={toasts} onDismiss={dismiss} />
        </>,
        document.body,
    );
}
