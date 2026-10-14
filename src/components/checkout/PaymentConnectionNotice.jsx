'use client';

import { useEffect, useRef, useState } from 'react';
import {
    checkPaymentConnection, CONNECTION_RETRY_MS,
    CONNECTION_BLOCKED_MESSAGE, CONNECTION_ERROR_MESSAGE,
} from '@/lib/client/paymentConnection';
import styles from './PaymentConnectionNotice.module.scss';

export default function PaymentConnectionNotice() {
    const [status, setStatus] = useState('checking');
    const [retryWaiting, setRetryWaiting] = useState(false);
    const retryTimer = useRef(null);

    useEffect(() => {
        let active = true;
        const check = async (refresh = false) => {
            if (active) setStatus('checking');
            try {
                const result = await checkPaymentConnection({ refresh });
                if (active) setStatus(result.status);
            } catch {
                if (active) setStatus('unknown');
            }
        };
        check();
        return () => {
            active = false;
            clearTimeout(retryTimer.current);
        };
    }, []);

    const retry = async () => {
        if (retryWaiting || status === 'checking') return;
        setRetryWaiting(true);
        retryTimer.current = setTimeout(() => setRetryWaiting(false), CONNECTION_RETRY_MS);
        setStatus('checking');
        try {
            const result = await checkPaymentConnection({ refresh: true });
            setStatus(result.status);
        } catch { setStatus('unknown'); }
    };

    return (
        <div aria-live="polite" className={`${styles.notice} ${status === 'blocked' ? styles.blocked : ''}`}>
            <p>
                {status === 'checking' ? 'در حال بررسی اتصال برای پرداخت…' :
                    status === 'blocked' ? CONNECTION_BLOCKED_MESSAGE :
                    status === 'unknown' ? CONNECTION_ERROR_MESSAGE :
                    'اتصال بررسی شد؛ پیش از پرداخت فیلترشکن را روشن نکنید.'}
            </p>
            {(status === 'blocked' || status === 'unknown') && (
                <button type="button" onClick={retry} disabled={retryWaiting}>
                    {retryWaiting ? 'چند لحظه صبر کنید' : 'بررسی مجدد اتصال'}
                </button>
            )}
        </div>
    );
}
