'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import { mergeRecoveredItems } from '@/lib/cartRecovery';
import styles from '@/components/cart/CartRecovery.module.scss';

export default function RecoverOrderCart({ orderId }) {
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [done, setDone] = useState(false);
    const recover = async () => {
        setBusy(true);
        setMessage('');
        try {
            const response = await fetch('/api/orders/recover', { method: 'POST',
                headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            if (result.items.length) {
                useCartStore.setState((state) => ({ items: mergeRecoveredItems(state.items, result.items), appliedCoupon: null }));
                setDone(true);
            }
            setMessage([result.items.length ? 'اقلام با قیمت و موجودی فعلی به سبد منتقل شدند. کد تخفیف را دوباره بررسی کنید.' : 'قلم قابل خریدی پیدا نشد.', ...result.warnings].join(' '));
        } catch (error) { setMessage(error.message || 'انتقال اقلام انجام نشد.'); }
        finally { setBusy(false); }
    };
    return <section className={styles.notice} aria-label="ادامه خرید سفارش">
        <p>می‌توانید اقلام این سفارش را با قیمت و موجودی روز به سبد خرید منتقل کنید.</p>
        <button type="button" onClick={recover} disabled={busy || done}>{busy ? 'در حال بررسی اقلام…' : 'انتقال اقلام به سبد خرید'}</button>
        <p role="status">{message}</p>
        {done && <Link href="/cart">مشاهده سبد خرید و ادامه خرید</Link>}
    </section>;
}
