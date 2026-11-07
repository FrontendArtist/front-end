'use client';

/**
 * @file src/components/admin/Orders/PendingRestockNotice.jsx
 * @description اعلان «موجودی برنگشته» داخل جزئیات همان سفارش لغوشده (BND-05)
 *
 * وقتی برگشت موجودی یک لغو به سقف تلاش رسیده، همین‌جا با نام کالا و علت به زبان ساده توضیح داده می‌شود
 * و ادمین می‌تواند دوباره تلاش کند یا پس از اصلاح دستی موجودی، مورد را ببندد.
 * کد خطا و تعداد تلاش فقط در بخش جمع‌شدهٔ «جزئیات فنی» می‌ماند.
 */

import { useEffect, useState } from 'react';
import { PackageX } from 'lucide-react';
import AdminButton from '../Shared/AdminButton';
import styles from './PendingRestockNotice.module.scss';

const PENDING_URL = '/api/admin/physical-purchases/pending-restocks';
const actionUrl = (operationId, action) =>
    `/api/admin/physical-purchases/restocks/${encodeURIComponent(operationId)}/${action}`;

const fa = (n) => Number(n).toLocaleString('fa-IR');

/** علت را از کد ساختاریافتهٔ بای‌مانی به جملهٔ قابل‌فهم برای ادمین برمی‌گرداند. */
export function describeRestockCause(code) {
    if (code === 'CART_CONFLICT') {
        return 'سایت کالا را پیدا نکرد؛ احتمالاً کالا حذف یا عوض شده است.';
    }
    if (code === 'CART_UNAVAILABLE') {
        return 'سایت در زمان تلاش‌ها در دسترس نبود.';
    }
    return 'سایت درخواست برگشت موجودی را نپذیرفت.';
}

function describeItems(restock, items) {
    return (restock.items || []).map((line) => {
        const found = (items || []).find((i) => i.purchaseId === line.purchaseId);
        return { key: line.purchaseId, title: found?.title || 'کالا', quantity: fa(line.quantity) };
    });
}

export default function PendingRestockNotice({ cartId, items, onCleared }) {
    const [restocks, setRestocks] = useState([]);
    const [busyId, setBusyId] = useState(null);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        const controller = new AbortController();
        fetch(PENDING_URL, { signal: controller.signal })
            .then((res) => (res.ok ? res.json() : null))
            .then((json) => {
                const mine = (json?.data || []).filter(
                    (r) => r.abandoned && String(r.cartId).toLowerCase() === String(cartId).toLowerCase(),
                );
                setRestocks(mine);
            })
            .catch(() => {});
        return () => controller.abort();
    }, [cartId]);

    const removeRestock = (operationId) => {
        const remaining = restocks.filter((r) => r.operationId !== operationId);
        setRestocks(remaining);
        if (remaining.length === 0 && typeof onCleared === 'function') {
            onCleared();
        }
    };

    const run = async (restock, action) => {
        if (busyId) return;
        setBusyId(restock.operationId);
        setMessage(null);
        try {
            const res = await fetch(actionUrl(restock.operationId, action), { method: 'POST' });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                setMessage(json?.error || 'انجام عملیات ناموفق بود.');
            } else if (action === 'retry' && json?.data?.pending) {
                const code = json.data.lastErrorCode ?? restock.lastErrorCode;
                setRestocks((prev) => prev.map((r) => (
                    r.operationId === restock.operationId ? { ...r, lastErrorCode: code } : r
                )));
                setMessage(`تلاش دوباره هم ناموفق بود: ${describeRestockCause(code)} موجودی را دستی اصلاح کنید.`);
            } else {
                removeRestock(restock.operationId);
            }
        } catch {
            setMessage('خطا در ارتباط با سرور.');
        } finally {
            setBusyId(null);
        }
    };

    const resolve = (restock) => {
        const confirmed = window.confirm('آیا موجودی این کالا را در سایت دستی اصلاح کرده‌اید؟ با تأیید، این هشدار بسته می‌شود.');
        if (confirmed) run(restock, 'resolve');
    };

    if (restocks.length === 0) return null;

    return (
        <div className={styles.notice} role="alert" data-testid="pending-restock-notice">
            {restocks.map((restock) => (
                <section key={restock.operationId} className={styles.notice__item}>
                    <header className={styles.notice__head}>
                        <span className={styles.notice__icon} aria-hidden="true"><PackageX size={18} /></span>
                        <div>
                            <strong className={styles.notice__title}>موجودی برنگشته</strong>
                            <p className={styles.notice__cause}>{describeRestockCause(restock.lastErrorCode)}</p>
                        </div>
                    </header>

                    <ul className={styles.notice__items} aria-label="کالاهای لغوشده">
                        {describeItems(restock, items).map((line) => (
                            <li key={line.key}>
                                <span className={styles.notice__itemTitle}>{line.title}</span>
                                <span className={styles.notice__qty}>{line.quantity} عدد</span>
                            </li>
                        ))}
                    </ul>

                    <ol className={styles.notice__steps}>
                        <li>موجودی این کالا را در بخش محصولات دستی اصلاح کنید.</li>
                        <li>دکمهٔ «موجودی را دستی اصلاح کردم» را بزنید.</li>
                    </ol>

                    <div className={styles.notice__actions}>
                        <AdminButton variant="approve" disabled={Boolean(busyId)} onClick={() => resolve(restock)}>
                            موجودی را دستی اصلاح کردم
                        </AdminButton>
                        <AdminButton variant="default" disabled={Boolean(busyId)} onClick={() => run(restock, 'retry')}
                            title="اگر مشکل سایت رفع شده، برگشت خودکار دوباره امتحان می‌شود">
                            تلاش دوباره
                        </AdminButton>
                        <details className={styles.notice__tech}>
                            <summary>جزئیات فنی</summary>
                            <span dir="ltr">{restock.lastErrorCode || '—'} · {fa(restock.attempts)} / {fa(restock.maxAttempts)}</span>
                        </details>
                    </div>
                </section>
            ))}
            {message && <p className={styles.notice__message} role="status">{message}</p>}
        </div>
    );
}
