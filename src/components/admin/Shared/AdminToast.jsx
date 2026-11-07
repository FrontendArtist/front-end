'use client';

/**
 * @file src/components/admin/Shared/AdminToast.jsx
 * @description پیام‌های کوتاه موفقیت/خطا در گوشهٔ صفحه (جایگزین بنرهای موفقیت درون صفحه)
 *
 * useAdminToast() → { toasts, toast(message, tone), dismiss(id) } و <AdminToastViewport /> برای نمایش.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import styles from './AdminToast.module.scss';

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };
const DURATION = 3500;

export function useAdminToast() {
    const [toasts, setToasts] = useState([]);
    const timers = useRef(new Map());

    const dismiss = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        clearTimeout(timers.current.get(id));
        timers.current.delete(id);
    }, []);

    const toast = useCallback((message, tone = 'success') => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
        timers.current.set(id, setTimeout(() => dismiss(id), DURATION));
    }, [dismiss]);

    useEffect(() => {
        const map = timers.current;
        return () => map.forEach((t) => clearTimeout(t));
    }, []);

    return { toasts, toast, dismiss };
}

export function AdminToastViewport({ toasts, onDismiss }) {
    return (
        <div className={styles.viewport} aria-live="polite" aria-atomic="false">
            {toasts.map((t) => {
                const Icon = ICONS[t.tone] || ICONS.info;
                return (
                    <div key={t.id} className={`${styles.toast} ${styles[`toast--${t.tone}`] || ''}`} role="status">
                        <Icon size={18} aria-hidden="true" className={styles.toast__icon} />
                        <span className={styles.toast__text}>{t.message}</span>
                        <button type="button" className={styles.toast__close} onClick={() => onDismiss(t.id)} aria-label="بستن پیام">
                            <X size={14} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
