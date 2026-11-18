import PurchasesList from '@/components/profile/PurchasesList';

export const metadata = {
    title: 'دوره‌ها و محصولات',
    description: 'مشاهده دوره‌ها و محصولات خریداری شده',
    robots: { index: false, follow: false },
};

export default function PurchasesPage() {
    return <PurchasesList />;
}
