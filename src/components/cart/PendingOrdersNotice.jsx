'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { fetchClientOrders } from '@/lib/client/ordersClientApi';
import { isOrderPaid } from '@/lib/constants/orderConstants';
import styles from './CartRecovery.module.scss';

export default function PendingOrdersNotice() {
    const { status } = useSession();
    const [orders, setOrders] = useState([]);
    useEffect(() => {
        let active = true;
        setOrders([]);
        if (status === 'authenticated') fetchClientOrders().then((result) => {
            if (active) setOrders((result.data || []).filter((order) => {
                const attrs = order.attributes || order;
                return attrs.paymentMethod === 'online' && attrs.orderStatus === 'pending' && !isOrderPaid(order);
            }));
        }).catch(() => {});
        return () => { active = false; };
    }, [status]);
    if (!orders.length) return null;
    return <aside className={styles.notice} aria-label="سفارش‌های در انتظار پرداخت">
        <p>سبد شما خالی است، اما سفارش در انتظار پرداخت دارید. برای انتقال اقلام و ادامهٔ خرید، سفارش را باز کنید.</p>
        <ul>{orders.map((order) => <li key={order.documentId || order.id}>
            <Link href={`/profile/orders/${order.documentId || order.id}`}>مشاهده سفارش #{order.id}</Link>
        </li>)}</ul>
    </aside>;
}
