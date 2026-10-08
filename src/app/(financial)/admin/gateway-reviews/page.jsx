/**
 * @file src/app/admin/gateway-reviews/page.jsx
 * @description صفحه مدیریت و رسیدگی به پرداخت‌های سپ – Server Component
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getGatewayReviews } from '@/lib/admin/gatewayReviewsApi';
import GatewayReviewsList from '@/components/admin/GatewayReviews/GatewayReviewsList';

export const metadata = {
    title: 'رسیدگی به پرداخت‌های سپ | پنل ادمین',
    robots: { index: false, follow: false },
};

export default async function AdminGatewayReviewsPage() {
    const session = await getServerSession(authOptions);
    const jwt = session?.user?.jwt;

    let initialData = null;

    if (jwt) {
        try {
            const reviewsRes = await getGatewayReviews(jwt, { page: 1, pageSize: 25 });
            initialData = reviewsRes;
        } catch (e) {
            console.error('[AdminGatewayReviewsPage] Failed to fetch initial data:', e.message);
        }
    }

    return <GatewayReviewsList initialData={initialData} />;
}
