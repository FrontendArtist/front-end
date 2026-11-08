'use client';

/**
 * @file NoorWithdrawalsList.jsx
 * @description فهرست خروج‌های نور با فیلتر وضعیت (پیش‌فرض در انتظار پرداخت) و اقدام‌های ادمین (I11-W).
 * فقط رکورد در انتظار پرداخت اقدام دارد و آن هم زیر مجوز Noor.Withdraw؛ رکورد پرداخت‌شده فقط فیش دارد
 * و رکورد برگشت‌خورده هیچ اقدامی ندارد.
 */

import { useCallback, useEffect, useState } from 'react';
import { Check, Undo2 } from 'lucide-react';
import Can from '@/components/admin/Permissions/Can';
import { ADMIN_PERMISSIONS } from '@/config/adminPermissions';
import { listAdminNoorWithdrawals } from '@/lib/admin/adminByeMoneyClient';
import { WITHDRAWAL_KINDS, WITHDRAWAL_STATUSES, formatDateTime, formatNumber } from '@/lib/admin/noorWithdrawal';
import { AdminToastViewport, useAdminToast } from '@/components/admin/Shared/AdminToast';
import AdminBadge from '@/components/admin/Shared/AdminBadge';
import AdminButton from '@/components/admin/Shared/AdminButton';
import { AdminTable, AdminTableContainer } from '@/components/admin/Shared/AdminTable';
import ReceiptPreviewModal from './ReceiptPreviewModal';
import WithdrawalActionModal from './WithdrawalActionModal';
import styles from './NoorWithdrawals.module.scss';

const STATUS_VARIANTS = { PendingPayment: 'warning', Paid: 'success', Reversed: 'error' };
const HEADERS = ['تاریخ', 'کاربر', 'نوع', 'نور', 'ریال', 'ذی‌نفع', 'توضیحات', 'وضعیت', 'اقدام'];

export default function NoorWithdrawalsList() {
    const [status, setStatus] = useState('PendingPayment');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [action, setAction] = useState(null); // { mode, withdrawal }
    const [receiptId, setReceiptId] = useState(null);
    const { toasts, toast, dismiss } = useAdminToast();

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        const res = await listAdminNoorWithdrawals({ status });
        if (res.success && Array.isArray(res.data)) {
            setItems(res.data);
        } else {
            setItems([]);
            setError(res.error || `دریافت فهرست ناموفق بود (کد خطا: ${res.status || 'نامشخص'}).`);
        }
        setLoading(false);
    }, [status]);

    useEffect(() => { load(); }, [load]);

    const handleDone = (message) => {
        setAction(null);
        toast(message, 'success');
        load();
    };

    return (
        <div className={styles.listWrap}>
            <div className={styles.toolbar}>
                <label htmlFor="nw-status-filter">وضعیت</label>
                <select
                    id="nw-status-filter"
                    className={styles.select}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                >
                    {Object.entries(WITHDRAWAL_STATUSES).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
                <span className={styles.hint}>ثبت خروج جدید از ردیف کاربر در صفحهٔ «کاربران» انجام می‌شود.</span>
            </div>

            {error && <div className={styles.errorBox} role="alert">{error}</div>}
            {loading && <div className={styles.stateMessage}>در حال بارگذاری...</div>}
            {!loading && !error && items.length === 0 && <div className={styles.stateMessage}>رکوردی یافت نشد.</div>}

            {items.length > 0 && (
                <AdminTableContainer>
                    <AdminTable headers={HEADERS}>
                        {items.map((w) => (
                            <tr key={w.id}>
                                <td className={styles.nowrap}>{formatDateTime(w.createdAtUtc)}</td>
                                <td>
                                    <div className={styles.beneficiary}>
                                        <span>{w.userName || '—'}</span>
                                        <bdi className={styles.ltr}>{w.userExternalId}</bdi>
                                    </div>
                                </td>
                                <td className={styles.nowrap}>{WITHDRAWAL_KINDS[w.kind] || w.kind}</td>
                                <td className={styles.amount}>{formatNumber(w.amountNoor)}</td>
                                <td className={styles.amount}>{formatNumber(w.amountRial)}</td>
                                <td>
                                    <div className={styles.beneficiary}>
                                        <span>{w.beneficiaryName}</span>
                                        {w.beneficiaryCardNumber && <bdi className={styles.ltr}>{w.beneficiaryCardNumber}</bdi>}
                                        {w.beneficiaryIban && <bdi className={styles.ltr}>{w.beneficiaryIban}</bdi>}
                                    </div>
                                </td>
                                <td>
                                    <div className={styles.description}>{w.description}</div>
                                    {w.status === 'Reversed' && w.reversalReason && (
                                        <div className={styles.hint}>علت: {w.reversalReason}</div>
                                    )}
                                </td>
                                <td>
                                    <AdminBadge
                                        text={WITHDRAWAL_STATUSES[w.status] || w.status}
                                        variant={STATUS_VARIANTS[w.status] || 'info'}
                                    />
                                </td>
                                <td>
                                    {w.status === 'PendingPayment' && (
                                        <Can permission={ADMIN_PERMISSIONS.NOOR_WITHDRAW}>
                                            <div className={styles.actionsRow}>
                                                <AdminButton
                                                    variant="approve"
                                                    className={styles.iconBtn}
                                                    title="پرداخت شد"
                                                    aria-label="پرداخت شد"
                                                    onClick={() => setAction({ mode: 'pay', withdrawal: w })}
                                                >
                                                    <Check size={16} aria-hidden="true" />
                                                </AdminButton>
                                                <AdminButton
                                                    variant="reject"
                                                    className={styles.iconBtn}
                                                    title="پرداخت نشد"
                                                    aria-label="پرداخت نشد"
                                                    onClick={() => setAction({ mode: 'reverse', withdrawal: w })}
                                                >
                                                    <Undo2 size={16} aria-hidden="true" />
                                                </AdminButton>
                                            </div>
                                        </Can>
                                    )}
                                    {w.status === 'Paid' && (
                                        <div className={styles.actions}>
                                            {w.paymentReference && <bdi className={styles.ltr}>{w.paymentReference}</bdi>}
                                            {w.hasReceipt && (
                                                <AdminButton variant="edit" onClick={() => setReceiptId(w.id)}>
                                                    مشاهدهٔ فیش
                                                </AdminButton>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </AdminTable>
                </AdminTableContainer>
            )}

            {action && (
                <WithdrawalActionModal
                    mode={action.mode}
                    withdrawal={action.withdrawal}
                    onClose={() => setAction(null)}
                    onDone={() => handleDone(action.mode === 'pay' ? 'پرداخت ثبت شد.' : 'خروج برگشت خورد و نور به کاربر برگشت.')}
                />
            )}
            {receiptId && <ReceiptPreviewModal withdrawalId={receiptId} onClose={() => setReceiptId(null)} />}
            <AdminToastViewport toasts={toasts} onDismiss={dismiss} />
        </div>
    );
}
