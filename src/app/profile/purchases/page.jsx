import PurchasesList from '@/components/profile/PurchasesList';

export const metadata = {
    title: 'خریدهای من',
    description: 'مشاهده دوره‌ها و محصولات خریداری شده',
    robots: { index: false, follow: false },
};

export default function PurchasesPage() {
    return <PurchasesList />;
}
