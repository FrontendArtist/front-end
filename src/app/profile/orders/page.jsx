/**
 * src/app/profile/orders/page.jsx
 *
 * صفحه سرور برای مسیر /profile/orders
 * این کامپوننت سرور است و فقط OrdersList (کلاینت) را mount می‌کند.
 * داده‌ها درون OrdersList به‌صورت کلاینت از /api/orders فچ می‌شوند.
 */

import OrdersList from '@/components/profile/OrdersList';

export const metadata = {
    title: 'سفارش‌های من | پنل کاربری',
    description: 'مشاهده تاریخچه سفارشات و خریدهای شما در طرح الهی',
};

export default function OrdersPage() {
    return <OrdersList />;
}
