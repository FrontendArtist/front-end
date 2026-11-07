'use client';

/**
 * @file src/components/admin/Orders/Settlements/CourseOrderSettlements.jsx
 * @description تسویهٔ سفارش‌های بای‌مانی (I11-S): دورهٔ جاری، بستن دوره با تأیید، آرشیو و سفارش‌های هر دوره.
 *
 * تسویه فقط برچسب گزارشی است و هیچ نوری جابه‌جا نمی‌کند. همهٔ فراخوانی‌ها از route سروری Next است (BND-07).
 * previewToken همان مقدار آخرین پیش‌نمایشی است که ادمین دیده و عیناً فرستاده می‌شود.
 * پس از هر 409 پیام فارسی بای‌مانی نمایش داده و پیش‌نمایش دوباره گرفته می‌شود.
 * نام خریدار و ادمین را route سروری از استرپی اضافه می‌کند؛ جزئیات زندهٔ سفارش با کلیک روی ردیف باز می‌شود.
 */

import { Fragment, useCallback, useEffect, useState } from 'react';
import { Bookmark, ChevronDown, Gift, Lock, PackageCheck, X } from 'lucide-react';
import { usePermissions } from '@/context/PermissionsContext';
import { ADMIN_PERMISSIONS } from '@/config/adminPermissions';
import AdminButton from '../../Shared/AdminButton';
import ByeMoneyOrderPanel from '../ByeMoneyOrderPanel';
import shared from '../../Shared/AdminShared.module.scss';
import modal from '../OrdersTable.module.scss';
import styles from './CourseOrderSettlements.module.scss';

const BASE = '/api/admin/course-order-settlements';
const PAGE_SIZE = 20;
const TITLE_MAX = 200;
const NOTE_MAX = 1000;
const TZ = 'Asia/Tehran';

const fa = (n) => Number(n ?? 0).toLocaleString('fa-IR', { maximumFractionDigits: 2 });

/** همان شمارهٔ کوتاهی که صفحهٔ سفارش‌ها نشان می‌دهد (۸ نویسهٔ اول شناسه). */
export const shortOrderNumber = (orderId) => String(orderId || '').split(':').pop().slice(0, 8).toUpperCase();

/** تاریخ و سپس ساعت، در دو بخش جدا تا جهت‌نمایی متن ترتیبشان را به‌هم نزند. */
export function DateTime({ utc }) {
    if (!utc) return <span>—</span>;
    const d = new Date(utc);
    const date = d.toLocaleDateString('fa-IR', { timeZone: TZ, year: 'numeric', month: 'long', day: 'numeric' });
    const time = d.toLocaleTimeString('fa-IR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
    return (
        <span className={styles.dateTime}>
            <span>{date}</span>
            <span className={styles.dateTime__time}>ساعت {time}</span>
        </span>
    );
}

async function getJson(url, init) {
    try {
        const res = await fetch(url, init);
        const json = await res.json().catch(() => ({}));
        if (res.ok && json?.success) return { ok: true, data: json.data };
        return { ok: false, status: res.status, code: json?.code, error: json?.error || 'دریافت اطلاعات ناموفق بود.' };
    } catch {
        return { ok: false, status: 0, error: 'خطا در ارتباط با سرور.' };
    }
}

export function NoorTotals({ regular, gift, total, compact = false }) {
    const cls = `${styles.totals} ${compact ? styles['totals--compact'] : ''}`;
    return (
        <dl className={cls}>
            <div className={styles['totals--regular']}><dt>نور عادی</dt><dd>{fa(regular)} <small>نور</small></dd></div>
            <div className={styles['totals--gift']}><dt>نور هدیه</dt><dd>{fa(gift)} <small>نور</small></dd></div>
            <div className={styles['totals--total']}><dt>جمع کل</dt><dd>{fa(total)} <small>نور</small></dd></div>
        </dl>
    );
}

const NOTES = [
    { icon: PackageCheck, text: 'فقط سفارش‌های پرداخت‌شده‌ای که همهٔ کالاهایشان ارسال شده' },
    { icon: Bookmark, text: 'بستن دوره فقط ثبت گزارش است؛ نوری جابه‌جا نمی‌شود' },
    { icon: Gift, text: 'نور هدیه پشتوانهٔ ریالی ندارد؛ مبنای انتقال دستی را خودتان انتخاب کنید' },
];

function SettlementNotes() {
    return (
        <ul className={styles.notes} aria-label="نکته‌های تسویه">
            {NOTES.map(({ icon: Icon, text }) => (
                <li key={text}>
                    <span className={styles.notes__icon}><Icon size={14} aria-hidden="true" /></span>
                    <span>{text}</span>
                </li>
            ))}
        </ul>
    );
}

function Pager({ page, pageSize, totalCount, onPage }) {
    const pages = Math.max(1, Math.ceil((totalCount || 0) / pageSize));
    if (pages <= 1) return null;
    return (
        <div className={shared.pagination}>
            <button type="button" className={shared.pagination__btn} disabled={page <= 1} onClick={() => onPage(page - 1)}>قبلی</button>
            <span className={shared.pagination__info}>صفحهٔ {fa(page)} از {fa(pages)}</span>
            <button type="button" className={shared.pagination__btn} disabled={page >= pages} onClick={() => onPage(page + 1)}>بعدی</button>
        </div>
    );
}

function Buyer({ order }) {
    return (
        <div className={styles.buyer}>
            <span className={styles.buyer__name}>{order.buyerName || 'نام ثبت نشده'}</span>
            {order.buyerPhone && <span className={styles.buyer__phone}>{order.buyerPhone}</span>}
        </div>
    );
}

function OrdersTable({ items }) {
    const [openId, setOpenId] = useState(null);
    if (!items?.length) return <p className={styles.empty}>سفارشی وجود ندارد.</p>;
    return (
        <div className={styles.tableWrap}>
            <table className={`${shared.table} ${styles.table}`}>
                <thead>
                    <tr>
                        <th>سفارش</th><th>خریدار</th><th>تاریخ سفارش</th>
                        <th>نور عادی</th><th>نور هدیه</th><th>جمع کل</th><th aria-label="جزئیات" />
                    </tr>
                </thead>
                <tbody>
                    {items.map((o) => {
                        const open = openId === o.orderId;
                        return (
                            <Fragment key={o.orderId}>
                                <tr className={styles.row} onClick={() => setOpenId(open ? null : o.orderId)} aria-expanded={open}
                                    title="نمایش جزئیات سفارش">
                                    <td className={styles.orderNo}>#{shortOrderNumber(o.orderId)}</td>
                                    <td><Buyer order={o} /></td>
                                    <td><DateTime utc={o.orderCreatedAtUtc} /></td>
                                    <td className={styles['amount--regular']}>{fa(o.regularNetAmountInNoor)}</td>
                                    <td className={styles['amount--gift']}>{fa(o.giftNetAmountInNoor)}</td>
                                    <td className={styles['amount--total']}>{fa(o.netAmountInNoor)}</td>
                                    <td><ChevronDown size={16} className={`${styles.chevron} ${open ? styles['chevron--open'] : ''}`} /></td>
                                </tr>
                                {open && (
                                    <tr className={styles.detailRow}>
                                        <td colSpan={7}><ByeMoneyOrderPanel order={{ orderId: o.orderId }} /></td>
                                    </tr>
                                )}
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function PeriodOrders({ periodId }) {
    const [state, setState] = useState({});
    const load = useCallback(async (page) => {
        const r = await getJson(`${BASE}/${encodeURIComponent(periodId)}/orders?page=${page}&pageSize=${PAGE_SIZE}`);
        setState(r.ok ? { data: r.data } : { error: r.error });
    }, [periodId]);
    useEffect(() => { load(1); }, [load]);

    if (state.error) return <p className={styles.error} role="alert">{state.error}</p>;
    if (!state.data) return <p className={styles.empty}>در حال بارگذاری…</p>;
    return (
        <>
            <OrdersTable items={state.data.items} />
            <Pager page={state.data.page} pageSize={state.data.pageSize || PAGE_SIZE} totalCount={state.data.totalCount} onPage={load} />
        </>
    );
}

function CloseDialog({ preview, onCancel, onConfirm, busy, error }) {
    const [title, setTitle] = useState('');
    const [note, setNote] = useState('');
    return (
        <div className={modal.modal_backdrop} style={{ zIndex: 99999 }} role="dialog" aria-modal="true" aria-labelledby="settle-close-title">
            <div className={modal.modal}>
                <div className={modal.modal__header}>
                    <h3 className={modal.modal__title} id="settle-close-title">بستن دورهٔ تسویه</h3>
                    <button type="button" className={modal.modal__close} onClick={onCancel} disabled={busy} aria-label="بستن پنجره">
                        <X size={18} />
                    </button>
                </div>
                <p className={styles.dialogText}>
                    <strong>{fa(preview.orderCount)} سفارش</strong> در این دوره ثبت می‌شود. پس از بستن، دوره ویرایش یا حذف
                    نمی‌شود و هیچ نوری جابه‌جا نمی‌شود.
                </p>
                <NoorTotals
                    compact
                    regular={preview.totalRegularNetAmountInNoor}
                    gift={preview.totalGiftNetAmountInNoor}
                    total={preview.totalNetAmountInNoor}
                />
                <div className={modal.modal__field}>
                    <label className={modal.modal__label} htmlFor="settle-title">عنوان (اختیاری)</label>
                    <input id="settle-title" className={modal.modal__input} value={title} maxLength={TITLE_MAX}
                        placeholder="مثلاً تسویهٔ آبان" onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className={modal.modal__field}>
                    <label className={modal.modal__label} htmlFor="settle-note">یادداشت (اختیاری)</label>
                    <textarea id="settle-note" className={modal.modal__input} value={note} maxLength={NOTE_MAX} rows={3}
                        placeholder="مثلاً مبنای انتقال نور هدیه" onChange={(e) => setNote(e.target.value)} />
                </div>
                {error && <p className={styles.error} role="alert">{error}</p>}
                <div className={modal.modal__actions}>
                    <button type="button" className={modal.modal__btn_cancel} onClick={onCancel} disabled={busy}>انصراف</button>
                    <button type="button" className={modal.modal__btn_save} onClick={() => onConfirm({ title, note })} disabled={busy}>
                        {busy ? 'در حال بستن…' : 'تأیید و بستن دوره'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function PeriodCard({ period, open, onToggle }) {
    return (
        <article className={`${styles.period} ${open ? styles['period--open'] : ''}`}>
            <button type="button" className={styles.period__head} aria-expanded={open} onClick={onToggle}>
                <span className={styles.period__title}>
                    <Lock size={14} aria-hidden="true" />
                    {period.title || 'دورهٔ بدون عنوان'}
                </span>
                <span className={styles.period__badge}>{fa(period.orderCount)} سفارش</span>
                <ChevronDown size={18} className={`${styles.chevron} ${open ? styles['chevron--open'] : ''}`} />
            </button>
            <p className={styles.meta}>
                بسته‌شده در <DateTime utc={period.closedAtUtc} /> توسط <strong>{period.closedByName || 'ادمین نامشخص'}</strong>
            </p>
            <NoorTotals compact regular={period.totalRegularNetAmountInNoor} gift={period.totalGiftNetAmountInNoor} total={period.totalNetAmountInNoor} />
            {period.note && <p className={styles.note}>{period.note}</p>}
            {open && <PeriodOrders periodId={period.periodId} />}
        </article>
    );
}

export default function CourseOrderSettlements() {
    const { hasPermission } = usePermissions();
    const canSettle = hasPermission(ADMIN_PERMISSIONS.PURCHASES_SETTLE);

    const [preview, setPreview] = useState(null);
    const [previewError, setPreviewError] = useState(null);
    const [periods, setPeriods] = useState(null);
    const [periodsError, setPeriodsError] = useState(null);
    const [openPeriodId, setOpenPeriodId] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [closing, setClosing] = useState(false);
    const [closeError, setCloseError] = useState(null);
    const [notice, setNotice] = useState(null);

    const loadPreview = useCallback(async (page = 1) => {
        const r = await getJson(`${BASE}/preview?page=${page}&pageSize=${PAGE_SIZE}`);
        if (r.ok) { setPreview(r.data); setPreviewError(null); } else { setPreviewError(r.error); }
    }, []);

    const loadPeriods = useCallback(async (page = 1) => {
        const r = await getJson(`${BASE}?page=${page}&pageSize=${PAGE_SIZE}`);
        if (r.ok) { setPeriods(r.data); setPeriodsError(null); } else { setPeriodsError(r.error); }
    }, []);

    useEffect(() => { loadPreview(1); loadPeriods(1); }, [loadPreview, loadPeriods]);

    const closePeriod = async ({ title, note }) => {
        if (closing || !preview) return;
        setClosing(true);
        setCloseError(null);
        const r = await getJson(BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, note, previewToken: preview.previewToken }),
        });
        setClosing(false);
        if (r.ok) {
            setDialogOpen(false);
            setNotice({ type: 'success', text: `دورهٔ تسویه با ${fa(r.data?.orderCount)} سفارش بسته شد.` });
            await Promise.all([loadPreview(1), loadPeriods(1)]);
            return;
        }
        if (r.status === 409) {
            // فهرست تغییر کرده یا ادمین دیگری بسته؛ پیش‌نمایش تازه را باید دوباره تأیید کند.
            setDialogOpen(false);
            setNotice({ type: 'error', text: r.error });
            await Promise.all([loadPreview(1), loadPeriods(1)]);
            return;
        }
        setCloseError(r.error);
    };

    const orderCount = preview?.orderCount ?? 0;

    return (
        <div className={styles.root}>
            {notice && (
                <div className={notice.type === 'success' ? styles.success : styles.error} role="status">
                    <span>{notice.text}</span>
                    <button type="button" className={styles.dismiss} onClick={() => setNotice(null)} aria-label="بستن پیام">
                        <X size={16} />
                    </button>
                </div>
            )}

            <section className={styles.card} aria-labelledby="settle-current">
                <div className={styles.card__header}>
                    <div>
                        <h2 id="settle-current" className={styles.card__title}>دورهٔ جاری</h2>
                        <p className={styles.card__subtitle}>
                            {preview ? `${fa(orderCount)} سفارش تسویه‌نشده` : 'در حال بارگذاری…'}
                        </p>
                    </div>
                    {canSettle && preview && (
                        <AdminButton variant="approve" disabled={orderCount === 0}
                            title={orderCount === 0 ? 'سفارش تسویه‌نشده‌ای نیست' : undefined}
                            onClick={() => { setCloseError(null); setNotice(null); setDialogOpen(true); }}>
                            بستن دوره
                        </AdminButton>
                    )}
                </div>


                {previewError && <p className={styles.error} role="alert">{previewError}</p>}
                {preview && (
                    <>
                        <NoorTotals
                            regular={preview.totalRegularNetAmountInNoor}
                            gift={preview.totalGiftNetAmountInNoor}
                            total={preview.totalNetAmountInNoor}
                        />
                        <SettlementNotes />
                        <OrdersTable items={preview.orders?.items} />
                        <Pager page={preview.orders?.page || 1} pageSize={preview.orders?.pageSize || PAGE_SIZE}
                            totalCount={preview.orders?.totalCount} onPage={loadPreview} />
                    </>
                )}
            </section>

            <section className={styles.card} aria-labelledby="settle-archive">
                <div className={styles.card__header}>
                    <div>
                        <h2 id="settle-archive" className={styles.card__title}>آرشیو دوره‌ها</h2>
                        <p className={styles.card__subtitle}>دوره‌های بسته‌شده قابل ویرایش یا حذف نیستند.</p>
                    </div>
                </div>
                {periodsError && <p className={styles.error} role="alert">{periodsError}</p>}
                {periods && !periods.items?.length && <p className={styles.empty}>هنوز دوره‌ای بسته نشده است.</p>}
                <div className={styles.periods}>
                    {periods?.items?.map((p) => (
                        <PeriodCard key={p.periodId} period={p} open={openPeriodId === p.periodId}
                            onToggle={() => setOpenPeriodId(openPeriodId === p.periodId ? null : p.periodId)} />
                    ))}
                </div>
                {periods && (
                    <Pager page={periods.page || 1} pageSize={periods.pageSize || PAGE_SIZE} totalCount={periods.totalCount} onPage={loadPeriods} />
                )}
            </section>

            {dialogOpen && preview && (
                <CloseDialog preview={preview} busy={closing} error={closeError}
                    onCancel={() => setDialogOpen(false)} onConfirm={closePeriod} />
            )}
        </div>
    );
}
