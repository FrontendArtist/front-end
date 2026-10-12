import { itemKey } from '@/lib/cartRecovery';
import { useOrdersStore } from '@/store/useOrdersStore';

export async function cancelOrdersAfterRemoval(removed, remaining) {
    const response = await fetch('/api/orders/cancel-abandoned', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removedItemKey: itemKey(removed), remainingItemKeys: remaining.map(itemKey) }),
    });
    if (!response.ok) throw new Error('حذف قلم و لغو سفارش انجام نشد؛ دوباره تلاش کنید.');
    const result = await response.json();
    if (result.canceledOrderIds?.length) {
        useOrdersStore.getState().invalidateOrders();
        await useOrdersStore.getState().fetchOrders(true);
    }
}
