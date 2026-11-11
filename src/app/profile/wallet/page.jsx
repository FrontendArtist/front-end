import WalletHistory from '@/components/profile/WalletHistory';

export const metadata = {
    title: 'کیف پول',
    description: 'موجودی و گردش کیف پول نور شما در طرح الهی',
    robots: { index: false, follow: false },
};

export default function WalletPage() {
    return <WalletHistory />;
}
