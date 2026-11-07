/**
 * @file src/app/admin/orders/page.jsx
 * @description صفحهٔ «سفارش‌ها»: فقط سفارش‌های بای‌مانی (ADMIN-ORDERS-REDESIGN) – Server Component
 *
 * دادهٔ اولیه برای همان فیلترهای آدرس (?tab&q&view) خوانده می‌شود تا رفرش و لینک اشتراکی همان نما را
 * نشان دهند؛ تغییرهای بعدی را کامپوننت کلاینت از /api/admin/course-orders می‌گیرد.
 * سفارش‌های قدیمی استرپی در /admin/orders/legacy هستند. Authorization در layout والد است.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getByeMoneyAdminOrders, getByeMoneyOrderCounts, readOrderFilters } from '@/lib/admin/byeMoneyAdminOrders';
import ByeMoneyOrders from '@/components/admin/Orders/ByeMoney/ByeMoneyOrders';

export const metadata = {
    title: 'سفارش‌ها',
    robots: { index: false, follow: false },
};

export default async function AdminOrdersPage({ searchParams }) {
    const session = await getServerSession(authOptions);
    const jwt = session?.user?.jwt;
    const filters = readOrderFilters(await searchParams);

    const list = await getByeMoneyAdminOrders(jwt, filters);
    const counts = await getByeMoneyOrderCounts(jwt, {
        q: filters.q,
        actionCount: filters.tab === 'action' && !filters.view ? list.total : undefined,
    });

    return (
        <ByeMoneyOrders
            initialData={{ ...list, counts }}
            initialKey={`${filters.tab}|${filters.q}|${filters.view || ''}`}
        />
    );
}
