/**
 * @file src/app/admin/gateway-reviews/[clientReferenceCode]/page.jsx
 * @description صفحه جزئیات پرونده رسیدگی به پرداخت سپ – Server Component
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getGatewayReviewByReference } from '@/lib/admin/gatewayReviewsApi';
import GatewayReviewDetail from '@/components/admin/GatewayReviews/GatewayReviewDetail';

export const metadata = {
    title: 'جزئیات پرونده پرداخت | پنل ادمین',
    robots: { index: false, follow: false },
};

export default async function AdminGatewayReviewDetailPage({ params }) {
    const session = await getServerSession(authOptions);
    const jwt = session?.user?.jwt;
    const { clientReferenceCode } = await Promise.resolve(params);

    let caseData = null;

    if (jwt && clientReferenceCode) {
        try {
            const res = await getGatewayReviewByReference(jwt, clientReferenceCode);
            caseData = res?.data || null;
        } catch (e) {
            console.error('[AdminGatewayReviewDetailPage] Failed to fetch case:', e.message);
        }
    }

    return <GatewayReviewDetail initialCase={caseData} />;
}

