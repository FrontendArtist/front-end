import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useCartStore } from '@/store/useCartStore';
import { isOrderPaid } from '@/lib/constants/orderConstants';
import { invalidateProfileCache } from '@/lib/client/profileClientApi';
import { useOrdersStore } from '@/store/useOrdersStore';

export default function useCompletedOrderCart(status, orderId) {
    const { data: session } = useSession();
    const userId = session?.user?.id;
    const hydratedUserId = useCartStore((state) => state.hydratedUserId);
    useEffect(() => {
        let active = true;
        if (status !== 'success' || !orderId || !userId || String(hydratedUserId) !== String(userId)) return;
        const key = `${userId}:${orderId}`;
        if (useCartStore.getState().processedOrders[key]) return;
        fetch(`/api/orders?documentId=${encodeURIComponent(orderId)}`, { cache: 'no-store' })
            .then(async (response) => {
                if (!response.ok) return;
                const order = (await response.json()).data?.[0];
                if (!active || !order || !isOrderPaid(order)) return;
                const attrs = order.attributes || order;
                useCartStore.getState().completeOrder(userId, orderId, attrs.items || []);
                invalidateProfileCache();
                useOrdersStore.getState().invalidateOrders();
            }).catch(() => {});
        return () => { active = false; };
    }, [status, orderId, userId, hydratedUserId]);
}
