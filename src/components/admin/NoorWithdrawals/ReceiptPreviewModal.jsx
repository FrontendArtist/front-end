'use client';

/**
 * @file ReceiptPreviewModal.jsx
 * @description نمایش تصویر فیش واریز یک خروج نور در پاپ‌آپ (به‌جای باز شدن در تب جدید).
 * تصویر از route سروری با نشست ادمین گرفته می‌شود؛ مرورگر توکن نمی‌فرستد.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Receipt } from 'lucide-react';
import { adminNoorWithdrawalReceiptUrl } from '@/lib/admin/adminByeMoneyClient';
import shell from '@/components/admin/Users/AdminNoorGiftModal/AdminNoorGiftModal.module.scss';
import styles from './NoorWithdrawals.module.scss';

/** @param {{ withdrawalId: string, onClose: () => void }} props */
export default function ReceiptPreviewModal({ withdrawalId, onClose }) {
    const [mounted, setMounted] = useState(false);
    const [state, setState] = useState('loading'); // loading | ready | failed

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    if (!mounted) return null;

    return createPortal(
        <div className={shell.backdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
            <div className={`${shell.modal} ${styles.receiptModal}`} role="dialog" aria-modal="true" aria-labelledby="nw-receipt-title">
                <div className={shell.header}>
                    <div className={shell.header__titleWrap}>
                        <div className={shell.header__icon}><Receipt size={20} /></div>
                        <h2 className={shell.header__title} id="nw-receipt-title">فیش واریز</h2>
                    </div>
                    <button type="button" className={shell.header__closeBtn} onClick={onClose} aria-label="بستن">
                        <X size={20} />
                    </button>
                </div>
                <div className={`${shell.body} ${styles.receiptBody}`}>
                    {state === 'loading' && <div className={styles.stateMessage}>در حال بارگذاری فیش...</div>}
                    {state === 'failed' && <div className={styles.fieldError} role="alert">بارگذاری تصویر فیش ناموفق بود.</div>}
                    {/* eslint-disable-next-line @next/next/no-img-element -- تصویر از route سروری احرازهویت‌شده می‌آید */}
                    <img
                        src={adminNoorWithdrawalReceiptUrl(withdrawalId)}
                        alt="فیش واریز"
                        className={styles.receiptImage}
                        hidden={state !== 'ready'}
                        onLoad={() => setState('ready')}
                        onError={() => setState('failed')}
                    />
                </div>
            </div>
        </div>,
        document.body,
    );
}
