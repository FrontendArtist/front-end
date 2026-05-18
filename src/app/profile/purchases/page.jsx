import PurchasesList from '@/components/profile/PurchasesList';

export const metadata = {
    title: 'سفارش های من | پنل کاربری',
    description: 'مشاهده دوره‌ها و محصولات خریداری شده',
};

export default function PurchasesPage() {
    return <PurchasesList />;
}
